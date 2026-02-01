package api

import (
	"context"
	"fmt"
	"go-panel/backend/db"
	"net/http"
	"strings"
)

// AuthMiddleware Supabase JWT token'ını doğrular.
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization Başlığı Eksik", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Token'ı Supabase Auth ile doğrula
		// Kullanıcı detaylarını almak için Supabase Auth istemcisini kullanıyoruz.
		ctx := context.Background()
		user, err := db.Client.Auth.User(ctx, tokenString)
		if err != nil {
			fmt.Println("Yetkilendirme Hatası:", err)
			http.Error(w, "Geçersiz Token", http.StatusUnauthorized)
			return
		}

		// Kullanıcı ID'sini request context'e ekle
		ctx = context.WithValue(r.Context(), "userID", user.ID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
