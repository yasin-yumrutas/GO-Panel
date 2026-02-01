package router

import (
	"go-panel/backend/api"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func Setup() *chi.Mux {
	// Router (Yönlendirici)
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS Middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Prod: Vercel frontend domainini buraya eklemek gerekebilir
			// Dev: localhost
			w.Header().Set("Access-Control-Allow-Origin", "*") // Vercel için * daha güvenli olabilir (public api ise) veya origin check
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, prefer")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	})

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	r.Route("/api", func(r chi.Router) {
		r.Use(api.AuthMiddleware)
		r.Get("/tasks", api.GetTasks)
		r.Post("/tasks", api.CreateTask)
		r.Patch("/tasks", api.UpdateTask) // PATCH destekle
		r.Put("/tasks", api.UpdateTask)
		r.Delete("/tasks", api.DeleteTask)

		// Alt Görevler (Subtasks)
		r.Post("/subtasks", api.CreateSubtask)
		r.Patch("/subtasks", api.UpdateSubtask)
		r.Put("/subtasks", api.UpdateSubtask)
		r.Delete("/subtasks", api.DeleteSubtask)
	})

	return r
}
