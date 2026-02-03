import { useState, useEffect } from 'react'
import { DndContext, closestCenter, DragOverlay, defaultDropAnimationSideEffects, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useAuth } from '../context/AuthContext'
import { getTasks, createTask, updateTask, deleteTask, createSubtask, updateSubtask, deleteSubtask, deleteTasksByStatus } from '../api/tasks'
import TaskCard from '../components/TaskCard'
import Modal from '../components/Modal'
import { Plus, Loader2, Trash2, Settings } from 'lucide-react'

const COLUMNS = [
    { id: 'Todo', title: 'Yapılacaklar' },
    { id: 'Doing', title: 'Yapılıyor' },
    { id: 'Done', title: 'Tamamlandı' }
]

import { useRef } from 'react'

function DroppableColumn({ column, tasks, children, onClear }) {
    const { setNodeRef } = useDroppable({
        id: column.id,
    })

    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef(null)

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={setNodeRef} className="w-80 flex flex-col shrink-0 h-full relative group/column">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full 
                        ${column.id === 'Todo' ? 'bg-orange-500' : ''} 
                        ${column.id === 'Doing' ? 'bg-blue-500' : ''} 
                        ${column.id === 'Done' ? 'bg-green-500' : ''} 
                    `} />
                    {column.title}
                </h2>
                <div className="flex items-center gap-2">
                    <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                        {tasks.length}
                    </span>

                    {/* Settings Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border shadow-lg rounded-lg z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-200">
                                {column.id === 'Done' ? (
                                    <button
                                        onClick={() => {
                                            onClear()
                                            setShowMenu(false)
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 text-left transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Tamamlananları Temizle
                                    </button>
                                ) : (
                                    <div className="px-3 py-2 text-muted-foreground text-xs text-center">
                                        Seçenek yok
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {children}
        </div>
    )
}

export default function Board() {
    const { user } = useAuth()
    const [tasks, setTasks] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeId, setActiveId] = useState(null)

    // Edit State
    const [editingTask, setEditingTask] = useState(null)
    const [editTitle, setEditTitle] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [editPriority, setEditPriority] = useState('Medium')
    const [editStatus, setEditStatus] = useState('Todo')
    const [editDueDate, setEditDueDate] = useState('')
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

    // ... (skipping unchanged parts)

    const openEditModal = (task) => {
        setEditingTask(task)
        setEditTitle(task.title)
        setEditDesc(task.description || '')
        setEditPriority(task.priority || 'Medium')
        setEditStatus(task.status)
        setEditDueDate(task.due_date ? task.due_date.split('T')[0] : '')
    }

    const handleUpdateTaskDetails = async (e) => {
        e.preventDefault()
        if (!editingTask) return

        // Find the latest version of the task to preserve subtasks
        const currentTask = tasks.find(t => t.id === editingTask.id)
        const updatedTask = {
            ...currentTask,
            title: editTitle,
            description: editDesc,
            priority: editPriority,
            status: editStatus, // Update status locally
            due_date: editDueDate || null
        }

        // Optimistic
        const optimisticallyUpdatedTasks = tasks.map(t => t.id === editingTask.id ? updatedTask : t)
        setTasks(sortTasks(optimisticallyUpdatedTasks))
        setEditingTask(null)

        try {
            await updateTask({
                id: editingTask.id,
                title: editTitle,
                description: editDesc,
                status: editStatus, // Send new status to API
                priority: editPriority,
                due_date: editDueDate || null
            })
        } catch (error) {
            console.error("Update failed", error)
            fetchTasks()
        }
    }

    // Create State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [createColumnId, setCreateColumnId] = useState('Todo')
    const [newTitle, setNewTitle] = useState('')
    const [newPriority, setNewPriority] = useState('Medium')
    const [newDueDate, setNewDueDate] = useState('')

    // Mobile Tab State (Moved here to fix Hook Order)
    const [activeTab, setActiveTab] = useState('Todo')

    useEffect(() => {
        if (!user) return
        fetchTasks()
    }, [user])

    // Handle window resize for responsive check
    useEffect(() => {
        const handleResize = () => {
            setActiveTab(prev => prev)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Filter columns for mobile view
    const visibleColumns = window.innerWidth < 768 ? COLUMNS.filter(c => c.id === activeTab) : COLUMNS

    // Sorting helper
    const sortTasks = (tasksList) => {
        const getPriorityWeight = (p) => {
            const priority = p?.toLowerCase() || ''
            if (priority === 'high' || priority === 'yüksek') return 3
            if (priority === 'medium' || priority === 'orta') return 2
            if (priority === 'low' || priority === 'düşük') return 1
            return 0
        }

        return [...tasksList].sort((a, b) => {
            const p1 = getPriorityWeight(a.priority)
            const p2 = getPriorityWeight(b.priority)

            if (p1 !== p2) return p2 - p1 // Descending (High first)

            // DueDate Ascending
            if (!a.due_date && !b.due_date) return a.position - b.position
            if (!a.due_date) return 1
            if (!b.due_date) return -1

            return new Date(a.due_date) - new Date(b.due_date) || a.position - b.position
        })
    }

    const fetchTasks = async () => {
        try {
            const data = await getTasks()
            console.log("Fetched Tasks:", data)
            // Always enforce sort on fetch
            setTasks(sortTasks(data || []))
        } catch (error) {
            console.error("Fetch Tasks Error:", error)
            alert("Görevler yüklenirken hata oluştu: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDragStart = (event) => {
        setActiveId(event.active.id)
    }

    const handleDragEnd = async (event) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        // If dropped on the same task or same position, do nothing
        if (active.id === over.id) return

        const activeId = active.id
        const overId = over.id

        // Find active task
        const activeTask = tasks.find(t => t.id === activeId)
        // Find over column or task
        const overColumnId = COLUMNS.find(c => c.id === overId)?.id
        const overTask = tasks.find(t => t.id === overId)
        const targetColumnId = overColumnId || overTask?.status

        if (!activeTask || !targetColumnId) return

        // If column changed (Status Update)
        if (activeTask.status !== targetColumnId) {
            // Optimistic Update
            const updatedTasks = tasks.map(t => {
                if (t.id === activeId) {
                    return { ...t, status: targetColumnId }
                }
                return t
            })
            // Enforce sort after status change so it lands in the right spot
            setTasks(sortTasks(updatedTasks))

            // API Update
            try {
                await updateTask({ id: activeId, status: targetColumnId })
            } catch (error) {
                console.error("Failed to update task", error)
                fetchTasks()
            }
        } else {
            // Same column drop (Reorder attempt)
            // We DO NOT update state. Snap back to sorted position.
            // This enforces "Auto-Sort" over "Manual Sort".
            return
        }
    }

    const openCreateModal = (columnId) => {
        setCreateColumnId(columnId)
        setNewTitle('')
        setNewPriority('Medium')
        setNewDueDate('')
        setIsCreateModalOpen(true)
    }

    const handleCreateTask = async (e) => {
        e.preventDefault()
        if (!newTitle.trim()) return

        const tempId = Math.random().toString()
        const newTask = {
            id: tempId,
            title: newTitle,
            status: createColumnId,
            priority: newPriority,
            due_date: newDueDate || null,
            user_id: user.id
        }

        setTasks(sortTasks([...tasks, newTask]))
        setIsCreateModalOpen(false)

        try {
            await createTask({
                title: newTitle,
                status: createColumnId,
                priority: newPriority,
                due_date: newDueDate || null,
                position: tasks.length
            })
            fetchTasks()
        } catch (error) {
            console.error(error)
            setTasks(prev => prev.filter(t => t.id !== tempId))
        }
    }

    const handleAddTask = async (columnId) => {
        // This function is now replaced by openCreateModal
        // The original prompt-based logic is removed.
        openCreateModal(columnId)
    }

    const handleDeleteTask = async (taskId) => {
        if (!confirm("Görevi silmek istediğinize emin misiniz?")) return

        // Optimistic delete
        const previousTasks = [...tasks]
        setTasks(tasks.filter(t => t.id !== taskId))

        try {
            await deleteTask(taskId)
        } catch (error) {
            console.error("Delete failed", error)
            setTasks(previousTasks)
        }
    }

    // Functions moved up to state declaration area

    const handleClearColumn = async (columnId) => {
        if (columnId !== 'Done') return
        if (!confirm("Tamamlanan tüm görevleri silmek istediğinize emin misiniz?")) return

        // Optimistic delete
        const previousTasks = [...tasks]
        setTasks(tasks.filter(t => t.status !== 'Done'))

        try {
            await deleteTasksByStatus('Done')
        } catch (error) {
            console.error("Clear column failed", error)
            setTasks(previousTasks)
            alert("Silme işlemi başarısız oldu: " + error.message)
        }
    }

    const getTasksByColumn = (columnId) => tasks.filter(t => {
        if (columnId === 'Todo' && !t.status) return true // Fallback: Show tasks with missing status in 'Todo'
        return t.status === columnId
    })

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: { opacity: '0.5' },
            },
        }),
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            {/* Edit Modal */}
            <Modal
                isOpen={!!editingTask}
                onClose={() => setEditingTask(null)}
                title="Görevi Düzenle"
            >
                <form onSubmit={handleUpdateTaskDetails} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Başlık</label>
                        <input
                            className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Açıklama</label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Öncelik</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value)}
                            >
                                <option value="Low">Düşük</option>
                                <option value="Medium">Orta</option>
                                <option value="High">Yüksek</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bitiş Tarihi</label>
                            <input
                                type="date"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Durum (Sütun Değiştir)</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                        >
                            {COLUMNS.map(col => (
                                <option key={col.id} value={col.id}>{col.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subtasks Section */}
                    <div className="space-y-3 pt-4 border-t border-border">
                        <label className="text-sm font-medium flex items-center justify-between">
                            Kontrol Listesi
                            <span className="text-xs text-muted-foreground">
                                {(thisTask => {
                                    if (!thisTask?.subtasks?.length) return ''
                                    const completed = thisTask.subtasks.filter(s => s.is_completed).length
                                    return `%${Math.round((completed / thisTask.subtasks.length) * 100)} Tamamlandı`
                                })(tasks.find(t => t.id === editingTask?.id))}
                            </span>
                        </label>

                        <div className="space-y-2">
                            {tasks.find(t => t.id === editingTask?.id)?.subtasks?.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-2 group">
                                    <input
                                        type="checkbox"
                                        checked={subtask.is_completed}
                                        onChange={async (e) => {
                                            const updatedSub = { ...subtask, is_completed: e.target.checked }
                                            // Optimistic UI for subtask toggle
                                            const parentTask = tasks.find(t => t.id === editingTask.id)
                                            const updatedSubtasks = parentTask.subtasks.map(s => s.id === subtask.id ? updatedSub : s)
                                            setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, subtasks: updatedSubtasks } : t))

                                            await updateSubtask(updatedSub)
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className={`text-sm flex-1 ${subtask.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                        {subtask.title}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!confirm('Silinsin mi?')) return
                                            // Optimistic delete
                                            const parentTask = tasks.find(t => t.id === editingTask.id)
                                            const updatedSubtasks = parentTask.subtasks.filter(s => s.id !== subtask.id)
                                            setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, subtasks: updatedSubtasks } : t))

                                            await deleteSubtask(subtask.id)
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 text-destructive rounded"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Yeni madde ekle..."
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        if (!newSubtaskTitle.trim()) return

                                        const tempId = Math.random().toString()
                                        const newSub = { id: tempId, title: newSubtaskTitle, is_completed: false, task_id: editingTask.id }

                                        // Optimistic add
                                        const parentTask = tasks.find(t => t.id === editingTask.id)
                                        const updatedSubtasks = [...(parentTask.subtasks || []), newSub]
                                        setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, subtasks: updatedSubtasks } : t))

                                        setNewSubtaskTitle('')

                                        try {
                                            const realSub = await createSubtask({ title: newSubtaskTitle, task_id: editingTask.id })
                                            // Replace temp with real
                                            setTasks(prev => prev.map(t => {
                                                if (t.id === editingTask.id) {
                                                    return {
                                                        ...t,
                                                        subtasks: t.subtasks.map(s => s.id === tempId ? realSub[0] : s)
                                                    }
                                                }
                                                return t
                                            }))
                                        } catch (err) {
                                            console.error(err)
                                        }
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!newSubtaskTitle.trim()) return
                                    const tempId = Math.random().toString()
                                    const newSub = { id: tempId, title: newSubtaskTitle, is_completed: false, task_id: editingTask.id }

                                    // Optimistic add
                                    const parentTask = tasks.find(t => t.id === editingTask.id)
                                    const updatedSubtasks = [...(parentTask.subtasks || []), newSub]
                                    setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, subtasks: updatedSubtasks } : t))

                                    setNewSubtaskTitle('')

                                    try {
                                        const realSub = await createSubtask({ title: newSubtaskTitle, task_id: editingTask.id })
                                        setTasks(prev => prev.map(t => {
                                            if (t.id === editingTask.id) {
                                                return {
                                                    ...t,
                                                    subtasks: t.subtasks.map(s => s.id === tempId ? realSub[0] : s)
                                                }
                                            }
                                            return t
                                        }))
                                    } catch (err) { console.error(err) }
                                }}
                                className="bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-9 px-3 rounded-md text-xs font-medium"
                            >
                                Ekle
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setEditingTask(null)}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            Kaydet
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Yeni Görev Oluştur"
            >
                <form onSubmit={handleCreateTask} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Başlık</label>
                        <input
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Görev adı ne?"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Öncelik</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={newPriority}
                                onChange={(e) => setNewPriority(e.target.value)}
                            >
                                <option value="Low">Düşük</option>
                                <option value="Medium">Orta</option>
                                <option value="High">Yüksek</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bitiş Tarihi</label>
                            <input
                                type="date"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={newDueDate}
                                onChange={(e) => setNewDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            Oluştur
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Mobile Tab Navigation */}
            <div className="flex md:hidden bg-muted/20 p-1 rounded-lg mb-4 shrink-0 overflow-x-auto">
                {COLUMNS.map(col => (
                    <button
                        key={col.id}
                        onClick={() => setActiveTab(col.id)}
                        className={`
                            flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all whitespace-nowrap
                            ${activeTab === col.id
                                ? 'bg-background shadow text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                            }
                        `}
                    >
                        {col.title}
                        <span className="ml-2 text-xs opacity-70 bg-primary/10 px-1.5 rounded-full inline-block">
                            {getTasksByColumn(col.id).length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex gap-6 h-full md:min-w-[1000px] flex-1 overflow-hidden">
                <DndContext
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {/* Render filtered columns for mobile, all for desktop */}
                    {COLUMNS.map(col => {
                        // On mobile, hide inactive columns
                        const isHiddenOnMobile = activeTab !== col.id

                        return (
                            <div
                                key={col.id}
                                className={`
                                    flex-1 h-full min-h-0
                                    ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}
                                `}
                            >
                                <DroppableColumn
                                    column={col}
                                    tasks={getTasksByColumn(col.id)}
                                    onClear={() => handleClearColumn(col.id)}
                                >
                                    <div className="flex-1 bg-muted/50 rounded-2xl p-3 border border-border/50 flex flex-col min-h-0 overflow-y-auto">
                                        <SortableContext
                                            items={getTasksByColumn(col.id).map(t => t.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-3 min-h-[50px] pb-2">
                                                {getTasksByColumn(col.id).map(task => (
                                                    <TaskCard
                                                        key={task.id}
                                                        task={task}
                                                        onDelete={() => handleDeleteTask(task.id)}
                                                        onClick={() => openEditModal(task)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>

                                        <button
                                            onClick={() => openCreateModal(col.id)}
                                            className="w-full mt-auto py-3 flex items-center justify-center text-sm font-medium text-muted-foreground hover:bg-white/10 hover:text-primary rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all backdrop-blur-sm shrink-0"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Görev Ekle
                                        </button>
                                    </div>
                                </DroppableColumn>
                            </div>
                        )
                    })}

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeId ? (
                            <TaskCard task={tasks.find(t => t.id === activeId)} />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    )
}
