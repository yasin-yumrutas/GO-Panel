import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { LogOut, Settings, User, Bell, ChevronDown, Sun, Moon, X } from 'lucide-react'

export default function Topbar() {
    const { user, signOut } = useAuth()
    const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications()
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    const [isNotifOpen, setIsNotifOpen] = useState(false)
    const dropdownRef = useRef(null)
    const notifRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleNotificationClick = (boardId) => {
        navigate(`/board/${boardId}`)
        setIsNotifOpen(false)
    }

    return (
        <header className="h-16 border-b border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 hidden md:block">
                    GO-Panel
                </h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className="p-2 relative text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/20"
                    >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 rounded-full border-2 border-background text-[10px] font-bold text-white flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {isNotifOpen && (
                        <div className="absolute right-0 top-full mt-2 w-screen sm:w-80 max-w-md max-h-[70vh] overflow-y-auto rounded-xl border border-white/20 bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 border-b border-border/50 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-sm">
                                <h3 className="font-semibold text-sm">Bildirimler</h3>
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="text-xs text-destructive hover:underline"
                                    >
                                        Tümünü Temizle
                                    </button>
                                )}
                            </div>

                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    Henüz bildirim yok 🔔
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {notifications.slice().reverse().map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif.boardId)}
                                            className="p-3 hover:bg-primary/5 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {notif.sender[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-foreground">
                                                        <span className="text-primary">{notif.sender}</span>
                                                        {' • '}
                                                        <span className="text-muted-foreground">{notif.boardTitle}</span>
                                                    </p>
                                                    <p className="text-sm text-foreground mt-0.5 line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                        {new Date(notif.timestamp).toLocaleString('tr-TR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            day: 'numeric',
                                                            month: 'short'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-white/20 transition-all border border-transparent hover:border-white/20"
                    >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]">
                            <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                                <span className="font-bold text-xs">{user?.email?.[0].toUpperCase()}</span>
                            </div>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/20 bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-2xl p-1 animate-in fade-in slide-in-from-top-2">
                            <div className="px-3 py-2 border-b border-border/50 mb-1">
                                <p className="text-sm font-medium">{user?.email}</p>
                                <p className="text-xs text-muted-foreground">Pro Üye</p>
                            </div>
                            <div className="space-y-1">
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/10 hover:text-primary transition-colors">
                                    <User className="h-4 w-4" />
                                    Profil
                                </button>
                                <button
                                    onClick={() => alert("Ayarlar sayfası yakında eklenecek!")}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                >
                                    <Settings className="h-4 w-4" />
                                    Ayarlar
                                </button>
                                <button
                                    onClick={() => {
                                        document.documentElement.classList.toggle('dark')
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                >
                                    {document.documentElement.classList.contains('dark') ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                    Tema Değiştir
                                </button>
                                <div className="h-px bg-border/50 my-1" />
                                <button
                                    onClick={signOut}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-red-500"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Çıkış Yap
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
