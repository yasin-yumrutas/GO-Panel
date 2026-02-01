import axios from 'axios'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9092/api'

// Helper to get current session token
const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
}

export const getTasks = async () => {
    const token = await getToken()
    const response = await axios.get(`${API_URL}/tasks`, {
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
