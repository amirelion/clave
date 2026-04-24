import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export type BoardTaskCategory = 'backlog' | 'ready'

export interface BoardTask {
  id: string
  title: string
  prompt: string
  cwd: string
  dangerousMode: boolean
  createdAt: number
  updatedAt: number
  category: BoardTaskCategory
  tags: string[]
}

export interface TagDefinition {
  name: string
  color: string
}

export interface BoardData {
  tasks: BoardTask[]
  tagDefinitions: TagDefinition[]
}

class BoardManager {
  private filePath: string

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'board.json')
  }

  load(): BoardData {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Record<string, unknown>

      const rawTags = Array.isArray(parsed.tagDefinitions)
        ? (parsed.tagDefinitions as Array<Record<string, unknown>>)
        : []
      const tagDefinitions: TagDefinition[] = rawTags
        .filter((t) => typeof t.name === 'string' && typeof t.color === 'string')
        .map((t) => ({ name: t.name as string, color: t.color as string }))
      const validTagNames = new Set(tagDefinitions.map((t) => t.name))

      // Migrate old kanban tasks: only keep unrun tasks (status 'todo' or no status)
      // and strip removed fields. Default category='ready' for legacy tasks
      // (preserves current behavior — treat everything already in the queue as
      // live work). Early internal builds used 'active' for the same category;
      // map those forward. tags=[] when missing.
      const rawTasks = Array.isArray(parsed.tasks)
        ? (parsed.tasks as Array<Record<string, unknown>>)
        : []
      const tasks: BoardTask[] = rawTasks
        .filter((t) => !t.status || t.status === 'todo')
        .map((t) => {
          const rawCategory = t.category
          const category: BoardTaskCategory =
            rawCategory === 'backlog'
              ? 'backlog'
              : rawCategory === 'ready' || rawCategory === 'active'
                ? 'ready'
                : 'ready'
          const rawTaskTags = Array.isArray(t.tags) ? (t.tags as unknown[]) : []
          const tags = rawTaskTags
            .filter((name): name is string => typeof name === 'string')
            .filter((name) => validTagNames.has(name))
          return {
            id: t.id as string,
            title: (t.title as string) ?? '',
            prompt: (t.prompt as string) ?? '',
            cwd: t.cwd as string,
            dangerousMode: t.dangerousMode === true,
            createdAt: t.createdAt as number,
            updatedAt: t.updatedAt as number,
            category,
            tags
          }
        })

      return { tasks, tagDefinitions }
    } catch {
      return { tasks: [], tagDefinitions: [] }
    }
  }

  save(data: BoardData): void {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8')
  }
}

export const boardManager = new BoardManager()
