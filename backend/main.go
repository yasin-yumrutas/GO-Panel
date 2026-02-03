package main

import (
	"fmt"
	"go-panel/backend/api"
	"go-panel/backend/db"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

func main() {
	// .env dosyasını yükle
	if err := godotenv.Load(); err != nil {
		log.Println(".env dosyası bulunamadı, sistem değişkenleri kullanılıyor")
	}

	// Supabase başlat
	if err := db.InitSupabase(); err != nil {
		log.Fatalf("Supabase başlatılamadı: %v", err)
	}

	// Router (Yönlendirici)
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS Middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	})

	// Rotalar
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	r.Route("/api", func(r chi.Router) {
		// WebSocket Route (Auth handled via Query Param)
		r.Get("/chat", api.HandleWebSocket)

		// Protected Routes Group
		r.Group(func(r chi.Router) {
			r.Use(api.AuthMiddleware)

			r.Get("/tasks", api.GetTasks)
			r.Post("/tasks", api.CreateTask)
			r.Put("/tasks", api.UpdateTask)
			r.Delete("/tasks", api.DeleteTask)
			r.Delete("/tasks/bulk", api.DeleteTasksByStatus)

			// Panolar (Boards)
			r.Get("/boards", api.GetBoards)
			r.Post("/boards", api.CreateBoard)
			r.Post("/boards/join", api.JoinBoard)
			r.Delete("/boards", api.DeleteBoard)
			r.Get("/boards/members", api.GetBoardMembers)

			// Alt Görevler (Subtasks)
			r.Post("/subtasks", api.CreateSubtask)
			r.Put("/subtasks", api.UpdateSubtask)
			r.Delete("/subtasks", api.DeleteSubtask)
		})
	})

	// Statik Dosyalar (Frontend Deployment)
	// Eğer "../frontend/dist" klasörü varsa oradan sunar.
	workDir, _ := os.Getwd()
	filesDir := http.Dir(workDir + "/../frontend/dist")

	// SPA Handler: Dosya yoksa index.html döndür
	FileServer(r, "/", filesDir)

	port := os.Getenv("PORT")
	if port == "" {
		port = "9092"
	}

	fmt.Printf("Sunucu %s portunda başlatılıyor\n", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Sunucu hatası: %v", err)
	}
}

// FileServer SPA uyumlu statik dosya sunucusu
func FileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit any URL parameters.")
	}

	fs := http.StripPrefix(path, http.FileServer(root))

	r.Get(path+"*", func(w http.ResponseWriter, r *http.Request) {
		// Dosyanın var olup olmadığına bak
		f, err := root.Open(strings.TrimPrefix(r.URL.Path, path))
		if err != nil && os.IsNotExist(err) {
			// Dosya yoksa index.html sun (SPA Routing)
			http.ServeFile(w, r, "../frontend/dist/index.html")
			return
		}
		if err == nil {
			defer f.Close()
		}
		// Dosya varsa normal sun
		fs.ServeHTTP(w, r)
	})
}
