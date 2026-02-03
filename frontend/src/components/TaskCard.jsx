import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, CheckSquare, AlertCircle } from 'lucide-react'

export default function TaskCard({ task, onDelete, onClick }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    // Overdue Logic
    const isOverdue = (() => {
        if (!task.due_date || task.status === 'Done') return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const due = new Date(task.due_date)
        return due < today
    })()

    // Priority Display Logic
    const displayPriority = task.priority || 'Medium'

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`bg-card text-card-foreground p-4 rounded-xl shadow-sm border transition-all mb-3 select-none relative group
                ${isDragging ? 'shadow-lg ring-2 ring-primary/20 rotate-2' : ''}
                ${isOverdue ? 'border-red-500/50 hover:border-red-500' : 'border-border hover:border-primary/50'}
            `}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                ${task.status === 'Todo' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : ''}
                ${task.status === 'Doing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                ${task.status === 'Done' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
             `}>
                        {task.status}
                    </span>
                    {isOverdue && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
                            <AlertCircle className="h-3 w-3" />
                            Gecikti
                        </span>
                    )}
                </div>

                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onClick()
                        }}
                        className="text-muted-foreground hover:text-primary p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                        }}
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <h3 className="font-semibold text-sm mb-1">{task.title}</h3>
            {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {task.description}
                </p>
            )}

            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                        ${displayPriority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                        ${displayPriority === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                        ${displayPriority === 'Low' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' : ''}
                    `}>
                    {displayPriority === 'High' ? 'Yüksek' : displayPriority === 'Medium' ? 'Orta' : 'Düşük'}
                </span>

                {task.due_date && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 
                        ${isOverdue ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-muted text-muted-foreground'}`}>
                        📅 {new Date(task.due_date).toLocaleDateString()}
                    </span>
                )}
                {task.subtasks && task.subtasks.length > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1
                        ${task.subtasks.every(s => s.is_completed)
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-muted text-muted-foreground'}
                    `}>
                        <CheckSquare className="h-3 w-3" />
                        {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
                <div {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
                    <GripVertical className="h-4 w-4" />
                </div>

                <div className="flex -space-x-2 items-center">
                    {/* Creator (only if different from assignee or if no assignee) */}
                    {(!task.assignees || task.assignees.email !== task.profiles?.email) && (
                        <div className="h-6 w-6 rounded-full bg-secondary border border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden uppercase" title={`Oluşturan: ${task.profiles?.email}`}>
                            {task.profiles?.email?.[0] || '?'}
                        </div>
                    )}

                    {/* Assignee */}
                    {task.assignees && (
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[1.5px] shadow-sm z-10" title={`Atanan: ${task.assignees.email}`}>
                            <div className="h-full w-full rounded-full bg-background flex items-center justify-center text-[10px] font-bold text-foreground overflow-hidden uppercase">
                                {task.assignees.email[0]}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
