import { create } from 'zustand'
import type {
  BoardTask,
  BoardTaskCategory,
  BoardData,
  TagDefinition
} from '../../../preload/index.d'
import { nextTagColor } from '../lib/tag-colors'

interface BoardState {
  tasks: BoardTask[]
  tagDefinitions: TagDefinition[]
  loaded: boolean

  filterTags: string[]
  backlogCollapsed: boolean
  readyCollapsed: boolean

  loadBoard: () => Promise<void>
  addTask: (
    task: Omit<BoardTask, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'tags'> & {
      category?: BoardTaskCategory
      tags?: string[]
    }
  ) => void
  updateTask: (
    id: string,
    updates: Partial<Pick<BoardTask, 'title' | 'prompt' | 'cwd' | 'dangerousMode' | 'tags'>>
  ) => void
  deleteTask: (id: string) => void
  removeTask: (id: string) => void
  moveTaskCategory: (id: string, category: BoardTaskCategory) => void
  addTagToTask: (taskId: string, tagName: string) => void
  removeTagFromTask: (taskId: string, tagName: string) => void

  createTag: (name: string) => TagDefinition | null
  renameTag: (oldName: string, newName: string) => void
  recolorTag: (name: string, color: string) => void
  deleteTag: (name: string) => void

  toggleFilterTag: (name: string) => void
  clearFilters: () => void
  toggleBacklogCollapsed: () => void
  toggleReadyCollapsed: () => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave(tasks: BoardTask[], tagDefinitions: TagDefinition[]): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const data: BoardData = { tasks, tagDefinitions }
    window.electronAPI?.boardSave?.(data)
  }, 300)
}

function findTag(defs: TagDefinition[], name: string): TagDefinition | undefined {
  const lower = name.toLowerCase()
  return defs.find((t) => t.name.toLowerCase() === lower)
}

const BACKLOG_COLLAPSED_KEY = 'clave-queue-backlog-collapsed'
const READY_COLLAPSED_KEY = 'clave-queue-ready-collapsed'

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: [],
  tagDefinitions: [],
  loaded: false,

  filterTags: [],
  backlogCollapsed: localStorage.getItem(BACKLOG_COLLAPSED_KEY) === 'true',
  readyCollapsed: localStorage.getItem(READY_COLLAPSED_KEY) === 'true',

  loadBoard: async () => {
    if (!window.electronAPI?.boardLoad) return
    const data = await window.electronAPI.boardLoad()
    set({
      tasks: data.tasks,
      tagDefinitions: data.tagDefinitions ?? [],
      loaded: true
    })
  },

  addTask: (partial) => {
    const now = Date.now()
    const task: BoardTask = {
      id: crypto.randomUUID(),
      title: partial.title,
      prompt: partial.prompt,
      cwd: partial.cwd,
      dangerousMode: partial.dangerousMode,
      createdAt: now,
      updatedAt: now,
      category: partial.category ?? 'backlog',
      tags: partial.tags ?? []
    }
    const newTasks = [...get().tasks, task]
    set({ tasks: newTasks })
    debouncedSave(newTasks, get().tagDefinitions)
  },

  updateTask: (id, updates) => {
    const newTasks = get().tasks.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
    )
    set({ tasks: newTasks })
    debouncedSave(newTasks, get().tagDefinitions)
  },

  deleteTask: (id) => {
    const newTasks = get().tasks.filter((t) => t.id !== id)
    set({ tasks: newTasks })
    debouncedSave(newTasks, get().tagDefinitions)
  },

  removeTask: (id) => {
    const newTasks = get().tasks.filter((t) => t.id !== id)
    set({ tasks: newTasks })
    debouncedSave(newTasks, get().tagDefinitions)
  },

  moveTaskCategory: (id, category) => {
    const newTasks = get().tasks.map((t) =>
      t.id === id ? { ...t, category, updatedAt: Date.now() } : t
    )
    set({ tasks: newTasks })
    debouncedSave(newTasks, get().tagDefinitions)
  },

  addTagToTask: (taskId, tagName) => {
    const def = findTag(get().tagDefinitions, tagName)
    if (!def) return
    const newTasks = get().tasks.map((t) => {
      if (t.id !== taskId) return t
      if (t.tags.includes(def.name)) return t
      return { ...t, tags: [...t.tags, def.name], updatedAt: Date.now() }
    })
    set({ tasks: newTasks })
    debouncedSave(newTasks, get().tagDefinitions)
  },

  removeTagFromTask: (taskId, tagName) => {
    const newTasks = get().tasks.map((t) => {
      if (t.id !== taskId) return t
      if (!t.tags.includes(tagName)) return t
      return { ...t, tags: t.tags.filter((n) => n !== tagName), updatedAt: Date.now() }
    })
    set({ tasks: newTasks })
    debouncedSave(newTasks, get().tagDefinitions)
  },

  createTag: (name) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const existing = findTag(get().tagDefinitions, trimmed)
    if (existing) return existing
    const def: TagDefinition = {
      name: trimmed,
      color: nextTagColor(get().tagDefinitions)
    }
    const newDefs = [...get().tagDefinitions, def]
    set({ tagDefinitions: newDefs })
    debouncedSave(get().tasks, newDefs)
    return def
  },

  renameTag: (oldName, newName) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const existing = findTag(get().tagDefinitions, oldName)
    if (!existing) return
    // Block rename if another tag already has the new name (case-insensitive)
    const collision = findTag(get().tagDefinitions, trimmed)
    if (collision && collision.name !== existing.name) return

    const newDefs = get().tagDefinitions.map((t) =>
      t.name === existing.name ? { ...t, name: trimmed } : t
    )
    const newTasks = get().tasks.map((t) => {
      if (!t.tags.includes(existing.name)) return t
      return { ...t, tags: t.tags.map((n) => (n === existing.name ? trimmed : n)) }
    })
    const newFilter = get().filterTags.map((n) => (n === existing.name ? trimmed : n))
    set({ tagDefinitions: newDefs, tasks: newTasks, filterTags: newFilter })
    debouncedSave(newTasks, newDefs)
  },

  recolorTag: (name, color) => {
    const existing = findTag(get().tagDefinitions, name)
    if (!existing) return
    const newDefs = get().tagDefinitions.map((t) =>
      t.name === existing.name ? { ...t, color } : t
    )
    set({ tagDefinitions: newDefs })
    debouncedSave(get().tasks, newDefs)
  },

  deleteTag: (name) => {
    const existing = findTag(get().tagDefinitions, name)
    if (!existing) return
    const newDefs = get().tagDefinitions.filter((t) => t.name !== existing.name)
    const newTasks = get().tasks.map((t) => {
      if (!t.tags.includes(existing.name)) return t
      return { ...t, tags: t.tags.filter((n) => n !== existing.name) }
    })
    const newFilter = get().filterTags.filter((n) => n !== existing.name)
    set({ tagDefinitions: newDefs, tasks: newTasks, filterTags: newFilter })
    debouncedSave(newTasks, newDefs)
  },

  toggleFilterTag: (name) => {
    const current = get().filterTags
    set({
      filterTags: current.includes(name)
        ? current.filter((n) => n !== name)
        : [...current, name]
    })
  },

  clearFilters: () => set({ filterTags: [] }),

  toggleBacklogCollapsed: () =>
    set((s) => {
      const next = !s.backlogCollapsed
      localStorage.setItem(BACKLOG_COLLAPSED_KEY, String(next))
      return { backlogCollapsed: next }
    }),

  toggleReadyCollapsed: () =>
    set((s) => {
      const next = !s.readyCollapsed
      localStorage.setItem(READY_COLLAPSED_KEY, String(next))
      return { readyCollapsed: next }
    })
}))
