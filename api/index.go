package handler

import (
	"go-panel/backend/db"
	"go-panel/backend/router"
	"net/http"
	"sync"
)

var once sync.Once

// Handler Vercel'in çağırdığı fonksiyondur.
// "func Handler(w http.ResponseWriter, r *http.Request)" imzasına sahip olmalıdır.
func Handler(w http.ResponseWriter, r *http.Request) {
	// Soğuk başlatma (Cold Start) durumunda DB bağlantısını sadece bir kez yap
	once.Do(func() {
		if err := db.InitSupabase(); err != nil {
			panic(err)
		}
	})

	// Router'ı al
	mux := router.Setup()

	// İsteği Router'a yönlendir
	mux.ServeHTTP(w, r)
}
