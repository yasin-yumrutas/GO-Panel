package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Board struct {
	ID         string `json:"id,omitempty"`
	Title      string `json:"title"`
	Type       string `json:"type"` // standard, professional, smart, minimal
	UserID     string `json:"user_id,omitempty"`
	InviteCode string `json:"invite_code,omitempty"`
	CreatedAt  string `json:"created_at,omitempty"`
}

// JoinBoardRequest panoya katılma isteği
type JoinBoardRequest struct {
	InviteCode string `json:"invite_code"`
}

// GetBoards kullanıcının panolarını getirir.
func GetBoards(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	// RLS sayesinde hem sahip olduğu hem üye olduğu panolar gelir
	resp, err := performSupabaseRequest("GET", "boards?select=*&order=created_at.desc", token, nil)
	if err != nil {
		fmt.Println("GetBoards Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

// JoinBoard davet kodu ile panoya kullanıcı ekler
func JoinBoard(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]
	// User ID'yi context'ten veya token'dan almamız lazım ama Supabase insert sırasında auth.uid()'yi kullanır (RLS varsa).
	// Fakat board_members tablosuna insert yaparken user_id'yi manuel vermemiz gerekiyorsa token'dan parse etmeliyiz.
	// Neyse ki db.Client.Auth.User ile middleware'de aldık.
	userID := r.Context().Value("userID")
	if userID == nil {
		// Middleware yoksa veya hata varsa
		http.Error(w, "Kullanıcı Oturumu Bulunamadı", http.StatusUnauthorized)
		return
	}

	var req JoinBoardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Geçersiz İstek", http.StatusBadRequest)
		return
	}

	// 1. Koda sahip panoyu bul
	// GET boards?invite_code=eq.CODE&select=id
	query := fmt.Sprintf("boards?invite_code=eq.%s&select=id", req.InviteCode)
	resp, err := performSupabaseRequest("GET", query, token, nil)
	if err != nil {
		http.Error(w, "Pano arama hatası", http.StatusInternalServerError)
		return
	}

	var foundBoards []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(resp, &foundBoards); err != nil || len(foundBoards) == 0 {
		http.Error(w, "Geçersiz Davet Kodu", http.StatusNotFound)
		return
	}
	boardID := foundBoards[0].ID

	// 2. board_members tablosuna ekle
	member := map[string]string{
		"board_id": boardID,
		"user_id":  userID.(string),
	}

	// Aynı kullanıcı tekrar eklenmesin diye ignoreDuplicates denenebilir ama
	// Supabase REST'te Conflict ayarı header ile yapılır: Prefer: resolution=ignore-duplicates
	// Biz şimdilik düz POST atalım, hata verirse "Zaten üyesiniz" deriz.
	insertResp, err := performSupabaseRequest("POST", "board_members", token, member)
	if err != nil {
		// Basit hata kontrolü
		http.Error(w, "Panoya katılınamadı (Belki zaten üyesiniz?)", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(insertResp)
}

// CreateBoard yeni bir pano oluşturur.
func CreateBoard(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var board Board
	if err := json.NewDecoder(r.Body).Decode(&board); err != nil {
		http.Error(w, "Geçersiz İstek Gövdesi", http.StatusBadRequest)
		return
	}

	resp, err := performSupabaseRequest("POST", "boards", token, board)
	if err != nil {
		fmt.Println("CreateBoard Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

// DeleteBoard panoyu (ve cascade ile görevlerini) siler.
func DeleteBoard(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	boardID := r.URL.Query().Get("id")
	if boardID == "" {
		http.Error(w, "ID parametresi gerekli", http.StatusBadRequest)
		return
	}

	endpoint := fmt.Sprintf("boards?id=eq.%s", boardID)
	resp, err := performSupabaseRequest("DELETE", endpoint, token, nil)
	if err != nil {
		fmt.Println("DeleteBoard Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Pano silindi", "details": string(resp)})
}

// GetBoardMembers bir panonun üyelerini getirir.
func GetBoardMembers(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 {
		http.Error(w, "Geçersiz Token formatı", http.StatusUnauthorized)
		return
	}
	token := authHeader[7:]

	boardID := r.URL.Query().Get("board_id")
	if boardID == "" {
		http.Error(w, "Board ID gerekli", http.StatusBadRequest)
		return
	}

	// board_members tablosundan user_id'leri ve profiles tablosundan detayları çekiyoruz
	// JOIN: board_members -> profiles
	endpoint := fmt.Sprintf("board_members?select=user_id,profiles(email)&board_id=eq.%s", boardID)
	resp, err := performSupabaseRequest("GET", endpoint, token, nil)
	if err != nil {
		fmt.Println("GetBoardMembers Hatası:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}
