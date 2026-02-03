import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Layout, Grid, List, Monitor, Smartphone, Folder, Trash2, Users } from 'lucide-react'
import { getBoards, createBoard, deleteBoard, joinBoard } from '../api/tasks'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const TEMPLATES = [
    {
        id: 'standard',
        title: 'Standart',
        desc: 'Yapılacak, Yapılıyor, Tamamlandı',
        icon: <Layout className="h-6 w-6" />,
        color: 'bg-blue-500'
    },
    {
        id: 'professional',
        title: 'Profesyonel',
        desc: 'Backlog, Planlanan, Yapılıyor, Tamamlandı',
        icon: <Monitor className="h-6 w-6" />,
        color: 'bg-purple-500'
    },
    {
        id: 'smart',
        title: 'Akıllı Set',
        desc: 'Fikir, Yapılacak, Kontrol, Beklemede, Tamamlandı',
        icon: <Grid className="h-6 w-6" />,
        color: 'bg-indigo-500'
    },
    {
        id: 'minimal',
        title: 'Minimal',
        desc: 'Aktif, Bitti',
        icon: <Smartphone className="h-6 w-6" />,
        color: 'bg-gray-500'
    }
]

export default function Dashboard() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [boards, setBoards] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    // Create Modal logic
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState('standard')

    // Join Modal State
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
    const [inviteCode, setInviteCode] = useState('')

    useEffect(() => {
        if (!user) return
        fetchBoards()
    }, [user])

    const fetchBoards = async () => {
        try {
            const data = await getBoards()
            setBoards(data || [])
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!title.trim()) return

        try {
            await createBoard({
                title,
                type: selectedTemplate
            })
            setIsModalOpen(false)
            setTitle('')
            fetchBoards()
        } catch (error) {
            console.error(error)
            alert("Pano oluşturulamadı.")
        }
    }

    const handleJoin = async (e) => {
        e.preventDefault()
        if (!inviteCode.trim()) return

        try {
            await joinBoard(inviteCode)
            setIsJoinModalOpen(false)
            setInviteCode('')
            alert("Panoya başarıyla katıldınız!")
            fetchBoards()
        } catch (error) {
            console.error(error)
            alert("Panoya katılınamadı: " + (error.response?.status === 404 ? "Kod geçersiz" : error.message))
        }
    }

    const handleDeleteBoard = async (e, id) => {
        e.preventDefault() // Prevent navigation
        if (!confirm("Bu panoyu ve içindeki tüm görevleri silmek istediğinize emin misiniz?")) return

        try {
            await deleteBoard(id)
            setBoards(prev => prev.filter(b => b.id !== id))
        } catch (error) {
            console.error(error)
            alert("Pano silinemedi")
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Panolarım</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsJoinModalOpen(true)}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                    >
                        <Users className="h-5 w-5" />
                        Panoya Katıl
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                    >
                        <Plus className="h-5 w-5" />
                        Yeni Pano
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-20 text-muted-foreground">Yükleniyor...</div>
            ) : boards.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                    <h2 className="text-xl font-semibold mb-2">Henüz hiç panonuz yok</h2>
                    <p className="text-muted-foreground mb-4">İlk panonuzu oluşturarak düzenli çalışmaya başlayın.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-primary font-medium hover:underline"
                    >
                        Şimdi Oluştur
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {boards.map(board => (
                        <Link
                            key={board.id}
                            to={`/board/${board.id}`}
                            className="group relative bg-card border hover:border-primary/50 transition-all duration-300 p-6 rounded-xl hover:shadow-lg hover:-translate-y-1 block"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-lg ${TEMPLATES.find(t => t.id === board.type)?.color || 'bg-gray-500'} bg-opacity-10 text-primary`}>
                                    {TEMPLATES.find(t => t.id === board.type)?.icon || <Folder />}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {new Date(board.created_at).toLocaleDateString()}
                                    </span>
                                    <button
                                        onClick={(e) => handleDeleteBoard(e, board.id)}
                                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                        title="Panoyu Sil"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                                {board.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {TEMPLATES.find(t => t.id === board.type)?.title || 'Özel'} Şablonu
                            </p>
                        </Link>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Yeni Pano Oluştur"
            >
                <form onSubmit={handleCreate} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Pano Adı</label>
                        <input
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Örn: Proje X"
                            className="w-full h-11 px-3 rounded-lg border bg-background"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-3">Şablon Seçimi</label>
                        <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
                            {TEMPLATES.map(t => (
                                <button
                                    type="button"
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t.id)}
                                    className={`flex items-center gap-4 p-3 rounded-lg border text-left transition-all
                                        ${selectedTemplate === t.id
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-muted/50 border-transparent bg-muted/20'}
                                    `}
                                >
                                    <div className={`p-2 rounded-md ${t.color} text-white shrink-0`}>
                                        {t.icon}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{t.title}</div>
                                        <div className="text-xs text-muted-foreground">{t.desc}</div>
                                    </div>
                                    {selectedTemplate === t.id && (
                                        <div className="ml-auto w-3 h-3 rounded-full bg-primary" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                        >
                            Oluştur
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Join Modal */}
            <Modal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                title="Panoya Katıl"
            >
                <form onSubmit={handleJoin} className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Sana verilen davet kodunu aşağıya girerek panoya katılabilirsin.
                    </p>
                    <div>
                        <label className="block text-sm font-medium mb-2">Davet Kodu</label>
                        <input
                            required
                            value={inviteCode}
                            onChange={e => setInviteCode(e.target.value)}
                            placeholder="Örn: a3b7c9..."
                            className="w-full h-11 px-3 rounded-lg border bg-background font-mono tracking-wider"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsJoinModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                        >
                            Katıl
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
