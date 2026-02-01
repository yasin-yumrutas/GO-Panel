import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

export default function InstallPWA() {
    const [supportsPWA, setSupportsPWA] = useState(false)
    const [promptInstall, setPromptInstall] = useState(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault()
            setSupportsPWA(true)
            setPromptInstall(e)
            // Show popup automatically on load if installable
            setIsVisible(true)
        }

        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const onClick = async () => {
        if (!promptInstall) return
        promptInstall.prompt()
        const { outcome } = await promptInstall.userChoice
        if (outcome === 'accepted') {
            setSupportsPWA(false)
        }
    }

    if (!supportsPWA || !isVisible) {
        return null
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom duration-500">
            <div className="bg-card text-card-foreground border rounded-lg shadow-xl p-4 flex flex-col gap-3 w-72">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-semibold text-sm">Uygulamayı Yükle</h3>
                        <p className="text-xs text-muted-foreground mt-1">Daha iyi bir deneyim için paneli cihazına indir.</p>
                    </div>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={onClick}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 transition-colors w-full"
                    >
                        <Download className="h-4 w-4" />
                        Uygulamayı Yükle
                    </button>
                    {/* Fallback for actual APK if promoted manually */}
                    <a
                        href="/app-release.apk"
                        download
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-xs font-medium py-2 px-4 flex items-center justify-center gap-2 transition-colors w-full"
                        onClick={(e) => {
                            // If file doesn't exist, just alert (for demo)
                            // In real deploy, user uploads app-release.apk to public/ or dist/
                            if (!confirm("Eğer 'app-release.apk' dosyası sunucuda yüklüyse indirme başlayacak. Devam edilsin mi?")) {
                                e.preventDefault()
                            }
                        }}
                    >
                        <span>📂 Alternatif: APK İndir</span>
                    </a>
                </div>
            </div>
        </div>
    )
}
