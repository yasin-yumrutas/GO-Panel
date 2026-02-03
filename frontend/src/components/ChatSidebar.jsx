
import { useState, useEffect, useRef } from 'react'
import { Send, X, MessageSquare, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { getToken } from '../api/tasks'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9092/api'
const WS_URL = API_URL.replace('http', 'ws')

export default function ChatSidebar({ boardId, boardTitle, isOpen, onClose }) {
    const { user } = useAuth()
    const { addNotification, clearBoardNotifications } = useNotifications()
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState('')
    const [socket, setSocket] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const messagesEndRef = useRef(null)

    // Use refs to avoid recreating WebSocket on every render
    const boardTitleRef = useRef(boardTitle)
    const addNotificationRef = useRef(addNotification)

    // Update refs when props change
    useEffect(() => {
        boardTitleRef.current = boardTitle
        addNotificationRef.current = addNotification
    }, [boardTitle, addNotification])

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isOpen])

    useEffect(() => {
        if (!isOpen || !boardId || !user) return

        let ws = null

        const connect = async () => {
            try {
                const token = await getToken() // Though we pass params, token for future
                // Passing params directly for MVP
                const wsUrl = `${WS_URL}/chat?board_id=${boardId}&user_id=${user.id}&email=${user.email}&token=${token}`

                ws = new WebSocket(wsUrl)

                ws.onopen = () => {
                    console.log('Chat Connected')
                    setIsConnected(true)
                }

                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data)
                        if (msg.type === 'history') {
                            setMessages(prev => {
                                // Avoid duplicates if reconnecting
                                if (prev.some(m => m.timestamp === msg.timestamp && m.content === msg.content)) return prev
                                return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp)
                            })
                        } else {
                            setMessages(prev => [...prev, msg])

                            // Trigger notification if message is from someone else and chat is closed
                            if (msg.sender_email !== user?.email && !isOpen) {
                                addNotificationRef.current({
                                    boardId,
                                    boardTitle: boardTitleRef.current || 'Pano',
                                    message: msg.content,
                                    sender: msg.sender_email.split('@')[0],
                                    timestamp: msg.timestamp
                                })
                            }
                        }
                    } catch (e) {
                        console.error("Parse error", e)
                    }
                }

                ws.onclose = () => {
                    console.log('Chat Disconnected')
                    setIsConnected(false)
                }

                setSocket(ws)
            } catch (err) {
                console.error("WS Connect Error", err)
            }
        }

        connect()

        return () => {
            if (ws) ws.close()
        }
    }, [isOpen, boardId, user]) // Removed boardTitle and addNotification to prevent reconnection loop

    // Clear notifications when opening chat for this board
    useEffect(() => {
        if (isOpen && boardId) {
            clearBoardNotifications(boardId)
        }
        // clearBoardNotifications is now memoized with useCallback, safe to omit from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, boardId])

    const sendMessage = (e) => {
        e.preventDefault()
        if (!inputText.trim() || !socket || !isConnected) return

        const msgPayload = {
            type: "text",
            content: inputText,
            // Sender info is handled by server via connection context
        }

        socket.send(JSON.stringify(msgPayload))
        setInputText('')
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-background border-l border-border shadow-2xl transform transition-transform duration-300 z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Pano Sohbeti</h3>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm mt-10">
                        Henüz mesaj yok. Sohbeti başlat! 👋
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isMe = msg.sender_email === user?.email
                    return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                {!isMe && (
                                    <div className="h-4 w-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[8px] font-bold text-white">
                                        {msg.sender_email?.[0].toUpperCase()}
                                    </div>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                    {isMe ? 'Ben' : msg.sender_email.split('@')[0]}
                                </span>
                            </div>
                            <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] break-words shadow-sm ${isMe
                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                : 'bg-card border border-border rounded-tl-none'
                                }`}>
                                {msg.content}
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-0.5 opacity-60">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-border bg-background">
                <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                        className="flex-1 bg-muted/50 border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Bir mesaj yaz..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={!isConnected}
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || !isConnected}
                        className="bg-primary text-primary-foreground p-2 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
                {!isConnected && (
                    <div className="text-[10px] text-destructive text-center mt-1">
                        Bağlantı kesildi. Yeniden bağlanılıyor...
                    </div>
                )}
            </div>
        </div>
    )
}
