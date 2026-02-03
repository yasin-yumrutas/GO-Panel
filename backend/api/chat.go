package api

import (
	"log"
	"net/http"
	"sync"
	"time"

	"go-panel/backend/db"

	"github.com/gorilla/websocket"
)

// Message defines the structure of a chat message
type Message struct {
	Type        string `json:"type"` // "text", "join", "leave", "history"
	Content     string `json:"content"`
	SenderID    string `json:"sender_id"`
	SenderEmail string `json:"sender_email"`
	BoardID     string `json:"board_id"`
	Timestamp   int64  `json:"timestamp"`
}

// Client represents a connected user
type Client struct {
	Hub    *Hub
	Room   *Room
	Conn   *websocket.Conn
	Send   chan *Message
	UserID string
	Email  string
}

// Room represents a board's chat room
type Room struct {
	BoardID    string
	Clients    map[*Client]bool
	Broadcast  chan *Message
	Register   chan *Client
	Unregister chan *Client
}

// Hub manages all active rooms
type Hub struct {
	Rooms map[string]*Room
	mu    sync.Mutex
}

var GlobalHub = &Hub{
	Rooms: make(map[string]*Room),
}

func (h *Hub) GetRoom(boardID string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, ok := h.Rooms[boardID]; ok {
		return room
	}

	room := &Room{
		BoardID:    boardID,
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan *Message),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
	h.Rooms[boardID] = room
	go room.Run()
	return room
}

func (r *Room) Run() {
	for {
		select {
		case client := <-r.Register:
			r.Clients[client] = true

		case client := <-r.Unregister:
			if _, ok := r.Clients[client]; ok {
				delete(r.Clients, client)
				close(client.Send)
			}

		case message := <-r.Broadcast:
			for client := range r.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(r.Clients, client)
				}
			}
		}
	}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// WritePump pumps messages from the hub to the websocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.WriteJSON(message)

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ReadPump pumps messages from the websocket connection to the hub.
func (c *Client) ReadPump() {
	defer func() {
		c.Room.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(2048) // Increased limit
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var msg Message
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Enforce server-side data
		msg.SenderID = c.UserID
		msg.SenderEmail = c.Email
		msg.BoardID = c.Room.BoardID
		msg.Timestamp = time.Now().UnixMilli()

		// Persist to DB (Fire and Forget)
		go func(m Message) {
			row := map[string]interface{}{
				"board_id":     m.BoardID,
				"user_id":      m.SenderID,
				"sender_email": m.SenderEmail,
				"content":      m.Content,
			}
			var result interface{}
			err := db.Client.DB.From("messages").Insert(row).Execute(&result)
			if err != nil {
				log.Printf("Failed to persist message: %v", err)
			}
		}(msg)

		c.Room.Broadcast <- &msg
	}
}

// HandleWebSocket handles WS requests
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	boardID := r.URL.Query().Get("board_id")
	userID := r.URL.Query().Get("user_id")
	email := r.URL.Query().Get("email")

	if boardID == "" || userID == "" {
		http.Error(w, "Missing params", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	room := GlobalHub.GetRoom(boardID)
	client := &Client{
		Hub:    GlobalHub,
		Room:   room,
		Conn:   conn,
		Send:   make(chan *Message, 256),
		UserID: userID,
		Email:  email,
	}

	client.Room.Register <- client

	// Start Pumps
	go client.WritePump()
	go client.ReadPump()

	// Fetch & Send History (Async)
	go func() {
		type DBMessage struct {
			ID          string `json:"id"`
			Content     string `json:"content"`
			CreatedAt   string `json:"created_at"`
			UserID      string `json:"user_id"`
			SenderEmail string `json:"sender_email"`
		}

		var history []DBMessage
		// Query: board messages (simplified, we'll get email separately if needed)
		err := db.Client.DB.From("messages").
			Select("*").
			Eq("board_id", boardID).
			Execute(&history)

		if err != nil {
			log.Printf("Error fetching history: %v", err)
			// Continue anyway - no history is not a fatal error
			return
		}

		log.Printf("Loaded %d messages from history for board %s", len(history), boardID)

		for _, h := range history {
			ts, _ := time.Parse(time.RFC3339, h.CreatedAt)

			// Use sender_email from DB, fallback to user_id if not set
			displayEmail := h.SenderEmail
			if displayEmail == "" {
				displayEmail = h.UserID
			}

			msg := &Message{
				Type:        "text", // Treat history as normal text messages
				Content:     h.Content,
				SenderID:    h.UserID,
				SenderEmail: displayEmail,
				BoardID:     boardID,
				Timestamp:   ts.UnixMilli(),
			}
			client.Send <- msg
		}
	}()
}
