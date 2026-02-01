package db

import (
	"fmt"
	"os"

	"github.com/nedpals/supabase-go"
)

var Client *supabase.Client

// InitSupabase Supabase istemcisini başlatır.
func InitSupabase() error {
	supabaseUrl := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	if supabaseUrl == "" || supabaseKey == "" {
		return fmt.Errorf("SUPABASE_URL veya SUPABASE_KEY ayarlanmamış")
	}

	Client = supabase.CreateClient(supabaseUrl, supabaseKey)
	return nil
}

// GetSupabaseUrl Supabase URL'sini döndürür (User-scoped istemciler için gerekli).
func GetSupabaseUrl() string {
	return os.Getenv("SUPABASE_URL")
}
