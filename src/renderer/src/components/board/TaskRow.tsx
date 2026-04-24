import { FolderIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useBoardStore } from '../../store/board-store'
import { tagChipStyle } from '../../lib/tag-colors'
import { cn } from '../../lib/utils'
import type { BoardTask } from '../../../../preload/index.d'

export const TASK_ROW_DRAG_MIME = 'application/x-clave-task-id'

function shortenCwd(cwd: string): string {
  const parts = cwd.split('/')
  if (parts.length <= 3) return cwd
  return '~/' + parts.slice(-2).join('/')
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface TaskRowProps {
  task: BoardTask
  onEdit: (task: BoardTask) => void
  onRun: (task: BoardTask) => void
  onDelete: (task: BoardTask) => void
  onContextMenu: (e: React.MouseEvent, task: BoardTask) => void
}

export function TaskRow({ task, onEdit, onRun, onDelete, onContextMenu }: TaskRowProps) {
  const tagDefinitions = useBoardStore((s) => s.tagDefinitions)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(TASK_ROW_DRAG_MIME, task.id)
    e.dataTransfer.setData('text/plain', task.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onEdit(task)
    }
  }

  const stopAnd = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onEdit(task)}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => onContextMenu(e, task)}
      className="w-full flex items-start gap-4 px-3 py-3 -mx-3 rounded-lg text-left hover:bg-surface-100 transition-colors group cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-text-primary truncate">
            {task.title || task.prompt}
          </span>
          {task.dangerousMode && (
            <span className="badge flex-shrink-0 bg-red-500/10 text-red-400">
              skip-perms
            </span>
          )}
        </div>
        <div className="flex items-center gap-0 text-xs text-text-tertiary mt-0.5">
          {task.title && task.prompt && (
            <>
              <span className="truncate max-w-[65%]">{task.prompt}</span>
              <span className="mx-1.5 opacity-40 flex-shrink-0">·</span>
            </>
          )}
          <span className="flex items-center gap-1 flex-shrink-0">
            <FolderIcon className="w-3 h-3" />
            <span className="truncate max-w-[160px]" title={task.cwd}>
              {shortenCwd(task.cwd)}
            </span>
          </span>
          <span className="mx-1.5 opacity-40 flex-shrink-0">·</span>
          <span className="flex-shrink-0 whitespace-nowrap">{formatDate(task.createdAt)}</span>
        </div>
        {task.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-1.5">
            {task.tags.map((name) => {
              const def = tagDefinitions.find((t) => t.name === name)
              if (!def) return null
              return (
                <span key={name} className="badge" style={tagChipStyle(def.color)}>
                  {def.name}
                </span>
              )
            })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={stopAnd(() => onRun(task))}
          className={cn(
            'h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5',
            'bg-green-500/10 text-green-500 hover:bg-green-500/20'
          )}
          title="Run task"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M3 1.5L10 6L3 10.5V1.5Z" fill="currentColor" />
          </svg>
          Run
        </button>
        <button
          type="button"
          onClick={stopAnd(() => onDelete(task))}
          className={cn(
            'h-7 w-7 rounded-lg flex items-center justify-center',
            'text-text-tertiary hover:text-red-400 hover:bg-red-500/10'
          )}
          title="Delete task"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
