import axios from 'axios'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9092/api'

export const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
        throw new Error("No active session")
    }
    return session.access_token
}

// Global Axios Interceptor for 401s
axios.interceptors.response.use(
    response => response,
    async error => {
        if (error.response && error.response.status === 401) {
            console.error("Session expired or invalid, signing out...")
            await supabase.auth.signOut()
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)



// Boards
export const getBoards = async () => {
    const token = await getToken()
    const response = await axios.get(`${API_URL}/boards`, { headers: { Authorization: `Bearer ${token}` } })
    return response.data
}

export const createBoard = async (board) => {
    const token = await getToken()
    const response = await axios.post(`${API_URL}/boards`, board, { headers: { Authorization: `Bearer ${token}` } })
    return response.data
}

export const deleteBoard = async (id) => {
    const token = await getToken()
    const response = await axios.delete(`${API_URL}/boards?id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
    return response.data
}

export const joinBoard = async (inviteCode) => {
    const token = await getToken()
    const response = await axios.post(`${API_URL}/boards/join`, { invite_code: inviteCode }, { headers: { Authorization: `Bearer ${token}` } })
    return response.data
}

export const getBoardMembers = async (boardId) => {
    const token = await getToken()
    const response = await axios.get(`${API_URL}/boards/members?board_id=${boardId}`, { headers: { Authorization: `Bearer ${token}` } })
    return response.data
}

// Tasks
export const getTasks = async (boardId) => {
    const token = await getToken()
    const url = boardId ? `${API_URL}/tasks?board_id=${boardId}` : `${API_URL}/tasks`
    const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
}

export const createTask = async (task) => {
    const token = await getToken()
    const response = await axios.post(`${API_URL}/tasks`, task, {
        headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
}

export const updateTask = async (task) => {
    const token = await getToken()
    const response = await axios.put(`${API_URL}/tasks`, task, {
        headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
}

export const deleteTask = async (id) => {
    const token = await getToken()
    await axios.delete(`${API_URL}/tasks?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
}

export const deleteTasksByStatus = async (status) => {
    const token = await getToken()
    await axios.delete(`${API_URL}/tasks/bulk?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
}

// Subtasks
export const createSubtask = async (subtask) => {
    const token = await getToken()
    const response = await axios.post(`${API_URL}/subtasks`, subtask, {
        headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
}

export const updateSubtask = async (subtask) => {
    const token = await getToken()
    const response = await axios.put(`${API_URL}/subtasks`, subtask, {
        headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
}

export const deleteSubtask = async (id) => {
    const token = await getToken()
    await axios.delete(`${API_URL}/subtasks?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
}
