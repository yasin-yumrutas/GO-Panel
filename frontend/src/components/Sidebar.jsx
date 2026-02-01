import { LayoutDashboard, Settings, User, LogOut, Moon, Sun, CheckSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'

export default function Sidebar() {
    const { signOut, user } = useAuth()
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        if (document.documentElement.classList.contains('dark')) {
            setIsDark(true)
        }
    }, [])

    const toggleTheme = () => {
        const html = document.documentElement
        if (isDark) {
            html.classList.remove('dark')
            setIsDark(false)
        } else {
            html.classList.add('dark')
            setIsDark(true)
        }
    }

    return (
        <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
            <div className="p-6 flex items-center gap-3">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                    <CheckSquare className="h-5 w-5" />
                </div>
                <span className="font-bold text-xl tracking-tight">GO-Panel</span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                <a href="/" className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl font-medium transition-all hover:bg-primary/20">
                    <LayoutDashboard className="h-5 w-5" />
                    Pano
                </a>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted/50 rounded-xl font-medium transition-all">
                    <User className="h-5 w-5" />
                    Profil
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted/50 rounded-xl font-medium transition-all">
                    <Settings className="h-5 w-5" />
                    Ayarlar
                </button>
            </nav>

            <div className="p-4 border-t border-border space-y-2">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted/50 rounded-xl font-medium transition-all"
                >
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    {isDark ? 'Aydınlık Mod' : 'Karanlık Mod'}
                </button>

                <div className="pt-2">
                    <div className="bg-muted/30 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex flex-col overflow-hidden mr-2">
                            <span className="text-sm font-semibold truncate text-foreground">{user?.email?.split('@')[0]}</span>
                            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                        </div>
                        <button
                            onClick={signOut}
                            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    )
}
