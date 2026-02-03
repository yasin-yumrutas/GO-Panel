import { createContext, useContext, useState, useCallback } from 'react'

const NotificationContext = createContext()

// Simple notification store (could use localStorage for persistence)
export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)

    // Use useCallback to memoize functions and prevent recreating on every render
    const addNotification = useCallback((notification) => {
        setNotifications(prev => [...prev, { ...notification, id: Date.now(), read: false }])
        setUnreadCount(prev => prev + 1)
    }, [])

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
    }, [])

    const clearBoardNotifications = useCallback((boardId) => {
        setNotifications(prev => {
            const filtered = prev.filter(n => n.boardId !== boardId)
            const removed = prev.filter(n => n.boardId === boardId && !n.read).length
            setUnreadCount(current => Math.max(0, current - removed))
            return filtered
        })
    }, [])

    const clearAll = useCallback(() => {
        setNotifications([])
        setUnreadCount(0)
    }, [])

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAllAsRead,
            clearBoardNotifications,
            clearAll
        }}>
            {children}
        </NotificationContext.Provider>
    )
}

export const useNotifications = () => useContext(NotificationContext)
