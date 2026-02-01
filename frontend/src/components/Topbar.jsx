import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogOut, Settings, User, Bell, ChevronDown, Sun, Moon } from 'lucide-react'

export default function Topbar() {
    const { user, signOut } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <header className="h-16 border-b border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-4">
                {/* Mobile menu trigger could go here */}
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 hidden md:block">
                    GO-Panel
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 relative text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/20">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-background"></span>
                </button>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-white/20 transition-all border border-transparent hover:border-white/20"
                    >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]">
                            <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                                {/* Avatar Image or Initial */}
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
