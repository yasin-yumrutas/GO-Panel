package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go-panel/backend/db"
	"io"
	"net/http"
	"os"
	"sort"
)

type Subtask struct {
	ID          string `json:"id,omitempty"`
	TaskID      string `json:"task_id"`
	Title       string `json:"title"`
	IsCompleted bool   `json:"is_completed"`
	Position    int    `json:"position"`
}

type Task struct {
	ID          string    `json:"id,omitempty"`
	Title       string    `json:"title,omitempty"`
	Description *string   `json:"description,omitempty"`
	Status      string    `json:"status,omitempty"`   // Todo, Doing, Done
	Priority    string    `json:"priority,omitempty"` // Low, Medium, High
	DueDate     *string   `json:"due_date,omitempty"`
	Position    int       `json:"position,omitempty"`
	UserID      string    `json:"user_id,omitempty"`
	Subtasks    []Subtask `json:"subtasks,omitempty"`
}

// performSupabaseRequest, Supabase REST API'sine istek atmak için yardımcı fonksiyon
func performSupabaseRequest(method, endpoint, token string, body interface{}) ([]byte, error) {
	supabaseUrl := db.GetSupabaseUrl()
	supabaseKey := os.Getenv("SUPABASE_KEY")

	// URL: https://xyz.supabase.co/rest/v1/tasks...
	url := fmt.Sprintf("%s/rest/v1/%s", supabaseUrl, endpoint)

	var reqBody io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonBytes)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}

	// Kritik Headerlar
	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	// Döndürülen veriyi alabilmek için gerekli
	req.Header.Set("Prefer", "return=representation")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("Supabase Hatası (%d): %s", resp.StatusCode, string(respBytes))
	}

	return respBytes, nil
}

// GetTasks giriş yapmış kullanıcıya ait görevleri getirir.
func GetTasks(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	// SELECT *, subtasks(*) FROM tasks
	// Not: Sıralamayı Go tarafında yapacağız çünkü Priority string (High/Medium/Low)
	// Supabase'den raw veri çekiyoruz.
	resp, err := performSupabaseRequest("GET", "tasks?select=*,subtasks(*)", token, nil)
	if err != nil {
		fmt.Println("GetTasks Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var tasks []Task
	if err := json.Unmarshal(resp, &tasks); err != nil {
		fmt.Println("GetTasks Unmarshal Hatası:", err)
		http.Error(w, "Veri işleme hatası", http.StatusInternalServerError)
		return
	}

	// Helper function for priority weight
	getPriorityWeight := func(p string) int {
		// Basit case-insensitive kontrol
		// strings paketi import edilmeli ama burada hardcode da yapabiliriz veya strings import edebiliriz.
		// Performance açısından switch ile lowercase yapmadan kontrol edelim veya strings.ToLower kullanalım.
		// Import listesine "strings" eklemediysek, manuel check yapalim.

		// Eğer strings importlu değilse:
		/*
			p = strings.ToLower(p)
		*/
		// Manuel lowercase conversion veya çoklu check:
		switch p {
		case "High", "high", "HIGH", "Yüksek", "yüksek":
			return 3
		case "Medium", "medium", "MEDIUM", "Orta", "orta":
			return 2
		case "Low", "low", "LOW", "Düşük", "düşük":
			return 1
		default:
			return 0
		}
	}

	// Sorting Logic
	sort.SliceStable(tasks, func(i, j int) bool {
		p1 := getPriorityWeight(tasks[i].Priority)
		p2 := getPriorityWeight(tasks[j].Priority)

		if p1 != p2 {
			return p1 > p2 // Higher priority first
		}

		// If priorities are equal, sort by DueDate (Ascending)
		// Empty/Nil dates should be last (or handle as desired)
		d1 := tasks[i].DueDate
		d2 := tasks[j].DueDate

		if d1 == nil && d2 == nil {
			return tasks[i].Position < tasks[j].Position // Fallback to user defined position
		}
		if d1 == nil {
			return false // d1 is "infinity", so d1 > d2 (d2 comes first)
		}
		if d2 == nil {
			return true // d2 is "infinity", so d1 < d2 (d1 comes first)
		}

		// String comparison for ISO8601 dates works for ordering
		return *d1 < *d2
	})

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(tasks); err != nil {
		http.Error(w, "Veri yazma hatası", http.StatusInternalServerError)
	}
}

// CreateTask yeni bir görev ekler.
func CreateTask(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	// Debug: İlk önce body'i okuyup yazdıralım
	bodyBytes, _ := io.ReadAll(r.Body)
	// Body'i tekrar yerine koyalım ki decoder okuyabilsin
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	fmt.Printf("CreateTask Raw JSON: %s\n", string(bodyBytes))

	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		fmt.Println("CreateTask Decode Hatası:", err)
		http.Error(w, "Geçersiz İstek Gövdesi", http.StatusBadRequest)
		return
	}
	fmt.Printf("CreateTask Parsed Struct: %+v\n", task)

	// INSERT INTO tasks ...
	resp, err := performSupabaseRequest("POST", "tasks", token, task)
	if err != nil {
		fmt.Println("CreateTask Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Supabase return=representation ile array döner
	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

// UpdateTask görevi günceller (durum, başlık, vb.).
func UpdateTask(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, "Geçersiz İstek Gövdesi", http.StatusBadRequest)
		return
	}

	if task.ID == "" {
		http.Error(w, "Görev ID gerekli", http.StatusBadRequest)
		return
	}

	// UPDATE tasks SET ... WHERE id = ...
	endpoint := fmt.Sprintf("tasks?id=eq.%s", task.ID)
	resp, err := performSupabaseRequest("PATCH", endpoint, token, task)
	if err != nil {
		fmt.Println("UpdateTask Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

// DeleteTask görevi siler.
func DeleteTask(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	taskID := r.URL.Query().Get("id")
	if taskID == "" {
		http.Error(w, "ID parametresi gerekli", http.StatusBadRequest)
		return
	}

	// DELETE FROM tasks WHERE id = ...
	endpoint := fmt.Sprintf("tasks?id=eq.%s", taskID)
	resp, err := performSupabaseRequest("DELETE", endpoint, token, nil)
	if err != nil {
		fmt.Println("DeleteTask Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Standart Go-Panel yanıtına uymak için
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Görev silindi", "details": string(resp)})
}

// DeleteTasksByStatus verilen durumdaki tüm görevleri siler.
func DeleteTasksByStatus(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	status := r.URL.Query().Get("status")
	if status == "" {
		http.Error(w, "Status parametresi gerekli", http.StatusBadRequest)
		return
	}

	// DELETE FROM tasks WHERE status = ...
	endpoint := fmt.Sprintf("tasks?status=eq.%s", status)
	resp, err := performSupabaseRequest("DELETE", endpoint, token, nil)
	if err != nil {
		fmt.Println("DeleteTasksByStatus Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Görevler silindi", "details": string(resp)})
}

// CreateSubtask yeni bir alt görev ekler.
func CreateSubtask(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	// Debug: Body'i oku
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	fmt.Printf("CreateSubtask Raw JSON: %s\n", string(bodyBytes))

	var subtask Subtask
	if err := json.NewDecoder(r.Body).Decode(&subtask); err != nil {
		fmt.Println("CreateSubtask Decode Hatası:", err)
		http.Error(w, "Geçersiz İstek Gövdesi", http.StatusBadRequest)
		return
	}
	fmt.Printf("CreateSubtask Parsed Struct: %+v\n", subtask)

	resp, err := performSupabaseRequest("POST", "subtasks", token, subtask)
	if err != nil {
		fmt.Println("CreateSubtask Supabase Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Printf("CreateSubtask Supabase Response: %s\n", string(resp))

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

// UpdateSubtask alt görevi günceller (tamamlandı/tamamlanmadı).
func UpdateSubtask(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	var subtask Subtask
	if err := json.NewDecoder(r.Body).Decode(&subtask); err != nil {
		http.Error(w, "Geçersiz İstek Gövdesi", http.StatusBadRequest)
		return
	}

	if subtask.ID == "" {
		http.Error(w, "Subtask ID gerekli", http.StatusBadRequest)
		return
	}

	endpoint := fmt.Sprintf("subtasks?id=eq.%s", subtask.ID)
	resp, err := performSupabaseRequest("PATCH", endpoint, token, subtask)
	if err != nil {
		fmt.Println("UpdateSubtask Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

// DeleteSubtask alt görevi siler.
func DeleteSubtask(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	subtaskID := r.URL.Query().Get("id")
	if subtaskID == "" {
		http.Error(w, "ID parametresi gerekli", http.StatusBadRequest)
		return
	}

	endpoint := fmt.Sprintf("subtasks?id=eq.%s", subtaskID)
	resp, err := performSupabaseRequest("DELETE", endpoint, token, nil)
	if err != nil {
		fmt.Println("DeleteSubtask Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Alt görev silindi", "details": string(resp)})
}
