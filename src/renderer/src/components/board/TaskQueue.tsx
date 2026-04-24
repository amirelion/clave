import { useState, useCallback, useMemo } from 'react'
import { PlusIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible'
import { useBoardStore } from '../../store/board-store'
import { useSessionStore } from '../../store/session-store'
import { useBoardPersistence } from '../../hooks/use-board-persistence'
import { TaskForm } from './TaskForm'
import { TagFilterBar } from './TagFilterBar'
import { TaskRow, TASK_ROW_DRAG_MIME } from './TaskRow'
import { ContextMenu } from '../ui/ContextMenu'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { cn } from '../../lib/utils'
import type { BoardTask, BoardTaskCategory } from '../../../../preload/index.d'

interface ContextMenuState {
  x: number
  y: number
  items: { label: string; onClick: () => void; danger?: boolean }[]
}

function SectionHeader({
  title,
  total,
  hiddenCount,
  collapsed,
  onToggle,
  onAdd
}: {
  title: string
  total: number
  hiddenCount: number
  collapsed: boolean
  onToggle: () => void
  onAdd: () => void
}) {
  const Icon = collapsed ? ChevronRightIcon : ChevronDownIcon
  return (
    <div className="w-full flex items-center gap-1.5 py-1">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-left flex-1 min-w-0"
        >
          <Icon className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            {title}
          </span>
          <span className="text-[11px] text-text-tertiary opacity-60">{total}</span>
          {hiddenCount > 0 && (
            <span className="text-[10px] text-text-tertiary opacity-60 ml-1">
              ({hiddenCount} hidden by filter)
            </span>
          )}
        </button>
      </CollapsibleTrigger>
      <button
        type="button"
        onClick={onAdd}
        className="btn-icon btn-icon-sm"
        title={`Add task to ${title}`}
      >
        <PlusIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function TaskQueue() {
  const tasks = useBoardStore((s) => s.tasks)
  const filterTags = useBoardStore((s) => s.filterTags)
  const removeTask = useBoardStore((s) => s.removeTask)
  const deleteTask = useBoardStore((s) => s.deleteTask)
  const moveTaskCategory = useBoardStore((s) => s.moveTaskCategory)
  const addTagToTask = useBoardStore((s) => s.addTagToTask)
  const removeTagFromTask = useBoardStore((s) => s.removeTagFromTask)
  const createTag = useBoardStore((s) => s.createTag)
  const tagDefinitions = useBoardStore((s) => s.tagDefinitions)
  const backlogCollapsed = useBoardStore((s) => s.backlogCollapsed)
  const readyCollapsed = useBoardStore((s) => s.readyCollapsed)
  const toggleBacklogCollapsed = useBoardStore((s) => s.toggleBacklogCollapsed)
  const toggleReadyCollapsed = useBoardStore((s) => s.toggleReadyCollapsed)

  const addSession = useSessionStore((s) => s.addSession)

  const [formOpen, setFormOpen] = useState(false)
  const [editTask, setEditTask] = useState<BoardTask | null>(null)
  const [newTaskCategory, setNewTaskCategory] = useState<BoardTaskCategory>('backlog')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [dragOverCategory, setDragOverCategory] = useState<BoardTaskCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BoardTask | null>(null)

  useBoardPersistence()

  const { readyTasks, backlogTasks, readyHidden, backlogHidden } = useMemo(() => {
    const readyAll = tasks.filter((t) => t.category === 'ready')
    const backlogAll = tasks.filter((t) => t.category !== 'ready')
    const matchesFilter = (t: BoardTask): boolean => {
      if (filterTags.length === 0) return true
      return t.tags.some((tag) => filterTags.includes(tag))
    }
    const readyFiltered = readyAll.filter(matchesFilter)
    const backlogFiltered = backlogAll.filter(matchesFilter)
    return {
      readyTasks: readyFiltered,
      backlogTasks: backlogFiltered,
      readyHidden: readyAll.length - readyFiltered.length,
      backlogHidden: backlogAll.length - backlogFiltered.length
    }
  }, [tasks, filterTags])

  const handleEdit = useCallback((task: BoardTask) => {
    setEditTask(task)
    setFormOpen(true)
  }, [])

  const handleNewTask = useCallback((category: BoardTaskCategory) => {
    setEditTask(null)
    setNewTaskCategory(category)
    setFormOpen(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setFormOpen(false)
    setEditTask(null)
  }, [])

  const runTask = useCallback(
    async (task: BoardTask) => {
      if (!window.electronAPI?.spawnSession) return

      const dangerousMode = task.dangerousMode ?? false
      const sessionInfo = await window.electronAPI.spawnSession(task.cwd, {
        dangerousMode,
        claudeMode: true
      })

      addSession({
        id: sessionInfo.id,
        cwd: sessionInfo.cwd,
        folderName: sessionInfo.folderName,
        name: task.title || task.prompt.slice(0, 40),
        alive: sessionInfo.alive,
        activityStatus: 'idle',
        promptWaiting: null,
        claudeMode: true,
        dangerousMode,
        claudeSessionId: sessionInfo.claudeSessionId,
        sessionType: 'local'
      })

      removeTask(task.id)
      useSessionStore.getState().selectSession(sessionInfo.id, false)

      if (task.prompt) {
        let sent = false
        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const sendPrompt = (): void => {
          if (sent) return
          sent = true
          if (debounceTimer) clearTimeout(debounceTimer)
          window.electronAPI?.writeSession(sessionInfo.id, task.prompt)
          setTimeout(() => {
            window.electronAPI?.writeSession(sessionInfo.id, '\r')
          }, 150)
          cleanup?.()
        }

        const cleanup = window.electronAPI?.onSessionData(sessionInfo.id, () => {
          if (sent) return
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(sendPrompt, 2000)
        })

        setTimeout(sendPrompt, 20000)
      }
    },
    [addSession, removeTask]
  )

  const buildTagMenuItems = useCallback(
    (task: BoardTask): ContextMenuState['items'] => {
      const items: ContextMenuState['items'] = []
      for (const def of tagDefinitions) {
        const attached = task.tags.includes(def.name)
        items.push({
          label: attached ? `✓  ${def.name}` : `    ${def.name}`,
          onClick: () =>
            attached ? removeTagFromTask(task.id, def.name) : addTagToTask(task.id, def.name)
        })
      }
      items.push({
        label: '＋  New tag…',
        onClick: () => {
          const name = window.prompt('New tag name')
          if (!name) return
          const def = createTag(name)
          if (def) addTagToTask(task.id, def.name)
        }
      })
      return items
    },
    [tagDefinitions, addTagToTask, removeTagFromTask, createTag]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, task: BoardTask) => {
      e.preventDefault()
      const targetCategory: BoardTaskCategory = task.category === 'ready' ? 'backlog' : 'ready'
      const items: ContextMenuState['items'] = [
        { label: 'Edit', onClick: () => handleEdit(task) },
        {
          label: task.category === 'ready' ? 'Move to Backlog' : 'Move to Ready',
          onClick: () => moveTaskCategory(task.id, targetCategory)
        },
        ...buildTagMenuItems(task),
        { label: 'Delete', onClick: () => setDeleteTarget(task), danger: true }
      ]
      setContextMenu({ x: e.clientX, y: e.clientY, items })
    },
    [handleEdit, moveTaskCategory, buildTagMenuItems]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, category: BoardTaskCategory) => {
      if (!e.dataTransfer.types.includes(TASK_ROW_DRAG_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (dragOverCategory !== category) setDragOverCategory(category)
    },
    [dragOverCategory]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return
      setDragOverCategory(null)
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, category: BoardTaskCategory) => {
      const id = e.dataTransfer.getData(TASK_ROW_DRAG_MIME)
      setDragOverCategory(null)
      if (!id) return
      const task = tasks.find((t) => t.id === id)
      if (!task || task.category === category) return
      moveTaskCategory(id, category)
    },
    [tasks, moveTaskCategory]
  )

  const renderSection = (
    category: BoardTaskCategory,
    title: string,
    emptyMessage: string,
    filteredTasks: BoardTask[],
    totalCount: number,
    hiddenCount: number,
    collapsed: boolean,
    onToggle: () => void
  ) => {
    const isDropTarget = dragOverCategory === category
    return (
      <Collapsible open={!collapsed} onOpenChange={() => onToggle()}>
        <SectionHeader
          title={title}
          total={totalCount}
          hiddenCount={hiddenCount}
          collapsed={collapsed}
          onToggle={onToggle}
          onAdd={() => handleNewTask(category)}
        />
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
          <div
            onDragOver={(e) => handleDragOver(e, category)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, category)}
            className={cn(
              'rounded-lg transition-colors',
              isDropTarget ? 'bg-surface-100 ring-1 ring-accent/40' : ''
            )}
          >
            {totalCount === 0 ? (
              <div className="py-6 text-center text-xs text-text-tertiary">{emptyMessage}</div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-tertiary">
                No tasks match the current filter.
              </div>
            ) : (
              <div>
                {filteredTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onEdit={handleEdit}
                    onRun={runTask}
                    onDelete={setDeleteTarget}
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-surface-50">
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-text-primary">Queue</h1>
          </div>

          <TagFilterBar />

          <div className="space-y-4">
            {renderSection(
              'ready',
              'Ready',
              'Nothing ready yet. Drag an idea here when you want to run it soon.',
              readyTasks,
              readyTasks.length + readyHidden,
              readyHidden,
              readyCollapsed,
              toggleReadyCollapsed
            )}
            {renderSection(
              'backlog',
              'Backlog',
              'No ideas parked yet. Click + to capture one.',
              backlogTasks,
              backlogTasks.length + backlogHidden,
              backlogHidden,
              backlogCollapsed,
              toggleBacklogCollapsed
            )}
          </div>
        </div>
      </div>

      <TaskForm
        isOpen={formOpen}
        onClose={handleCloseForm}
        editTask={editTask}
        onRun={runTask}
        initialCategory={newTaskCategory}
      />

      {contextMenu && (
        <ContextMenu
          items={contextMenu.items}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete task?"
        message={
          deleteTarget
            ? `"${deleteTarget.title || deleteTarget.prompt.slice(0, 60)}" will be removed from the queue.`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteTask(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
