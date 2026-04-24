import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useBoardStore } from '../../store/board-store'
import { TagInput } from './TagInput'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import type { BoardTask, BoardTaskCategory } from '../../../../preload/index.d'

interface TaskFormProps {
  isOpen: boolean
  onClose: () => void
  editTask?: BoardTask | null
  onRun?: (task: BoardTask) => void
  initialCategory?: BoardTaskCategory
}

export function TaskForm({
  isOpen,
  onClose,
  editTask,
  onRun,
  initialCategory = 'backlog'
}: TaskFormProps) {
  const addTask = useBoardStore((s) => s.addTask)
  const updateTask = useBoardStore((s) => s.updateTask)
  const deleteTask = useBoardStore((s) => s.deleteTask)

  const [prompt, setPrompt] = useState('')
  const [cwd, setCwd] = useState('')
  const [dangerousMode, setDangerousMode] = useState(false)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (editTask) {
        setPrompt(editTask.prompt)
        setCwd(editTask.cwd)
        setDangerousMode(editTask.dangerousMode)
        setTitle(editTask.title)
        setTags(editTask.tags ?? [])
      } else {
        setPrompt('')
        setCwd('')
        setDangerousMode(false)
        setTitle('')
        setTags([])
      }
      setConfirmDelete(false)
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [isOpen, editTask])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Let the delete confirmation dialog handle its own Escape first.
      if (confirmDelete) return
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, confirmDelete])

  const handlePickFolder = useCallback(async () => {
    const folder = await window.electronAPI?.openFolderDialog()
    if (folder) setCwd(folder)
  }, [])

  const commitEdits = useCallback((): BoardTask | null => {
    if (!prompt.trim() || !cwd.trim()) return null
    if (editTask) {
      const updated: BoardTask = {
        ...editTask,
        title: title.trim(),
        prompt: prompt.trim(),
        cwd: cwd.trim(),
        dangerousMode,
        tags,
        updatedAt: Date.now()
      }
      updateTask(editTask.id, {
        title: updated.title,
        prompt: updated.prompt,
        cwd: updated.cwd,
        dangerousMode,
        tags
      })
      return updated
    }
    addTask({
      title: title.trim(),
      prompt: prompt.trim(),
      cwd: cwd.trim(),
      dangerousMode,
      tags,
      category: initialCategory
    })
    return null
  }, [title, prompt, cwd, dangerousMode, tags, editTask, addTask, updateTask, initialCategory])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const result = commitEdits()
      if (!prompt.trim() || !cwd.trim()) return
      // result is null when creating (task list refresh is enough); when editing,
      // we don't need the return value on plain save either.
      void result
      onClose()
    },
    [commitEdits, prompt, cwd, onClose]
  )

  const handleRunClick = useCallback(() => {
    if (!editTask || !onRun) return
    const updated = commitEdits()
    if (!updated) return
    onClose()
    onRun(updated)
  }, [editTask, onRun, commitEdits, onClose])

  const handleDeleteConfirm = useCallback(() => {
    if (!editTask) return
    deleteTask(editTask.id)
    onClose()
  }, [editTask, deleteTask, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.metaKey) {
        e.preventDefault()
        handleSubmit(e as unknown as React.FormEvent)
      }
    },
    [handleSubmit]
  )

  return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="fixed z-50 left-1/2 -translate-x-1/2 w-[480px]"
              style={{ top: '20%' }}
            >
              <form
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                className="bg-surface-100 rounded-xl border border-border shadow-2xl"
              >
                <div className="px-5 pt-4 pb-3">
                  <h2 className="text-sm font-semibold text-text-primary">
                    {editTask ? 'Edit Task' : 'New Task'}
                  </h2>
                </div>

                <div className="px-5 space-y-3 pb-4">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Title</label>
                    <input
                      ref={titleRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What is this task?"
                      className="input-field bg-surface-200 border-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Prompt</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Instructions for Claude Code..."
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg bg-surface-200 border-none text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:ring-1 focus:ring-border transition-colors resize-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Folder</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cwd}
                        readOnly
                        placeholder="Select a folder..."
                        className="input-field flex-1 bg-surface-200 border-none cursor-default truncate"
                      />
                      <button
                        type="button"
                        onClick={handlePickFolder}
                        className="btn-secondary h-8 bg-surface-200 hover:bg-surface-300 flex-shrink-0"
                      >
                        Browse
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={dangerousMode}
                      onClick={() => setDangerousMode(!dangerousMode)}
                      className={`relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${dangerousMode ? 'bg-red-500' : 'bg-surface-300'}`}
                    >
                      <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${dangerousMode ? 'translate-x-[14px]' : ''}`} />
                    </button>
                    <span className={`text-xs transition-colors ${dangerousMode ? 'text-red-400' : 'text-text-secondary group-hover:text-text-primary'}`}>
                      Skip permissions
                    </span>
                  </label>

                  <div>
                    <label className="block text-xs text-text-tertiary mb-1">Tags</label>
                    <TagInput value={tags} onChange={setTags} />
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {editTask && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="btn-icon btn-icon-sm text-text-tertiary hover:text-red-400"
                        title="Delete task"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                    <span className="text-[11px] text-text-tertiary">
                      <kbd className="px-1 py-0.5 rounded bg-surface-200 text-text-secondary">Cmd+Enter</kbd> submit
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    {editTask && onRun && (
                      <button
                        type="button"
                        onClick={handleRunClick}
                        disabled={!prompt.trim() || !cwd.trim()}
                        className="btn-primary bg-green-500/90 hover:bg-green-500 text-white"
                        title="Save changes and launch a session"
                      >
                        Run
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!prompt.trim() || !cwd.trim()}
                      className="btn-primary"
                    >
                      {editTask ? 'Save' : 'Create'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
            <ConfirmDialog
              isOpen={confirmDelete}
              title="Delete task?"
              message={
                editTask
                  ? `"${editTask.title || editTask.prompt.slice(0, 60)}" will be removed from the queue.`
                  : ''
              }
              onCancel={() => setConfirmDelete(false)}
              onConfirm={() => {
                setConfirmDelete(false)
                handleDeleteConfirm()
              }}
            />
          </>
        )}
      </AnimatePresence>
  )
}
