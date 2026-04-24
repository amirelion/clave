import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import {
  FunnelIcon,
  XMarkIcon,
  TrashIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'
import { useBoardStore } from '../../store/board-store'
import {
  TAG_COLOR_TOKENS,
  tagChipStyle,
  tagChipActiveStyle,
  resolveTagColor
} from '../../lib/tag-colors'
import { cn } from '../../lib/utils'
import type { TagDefinition } from '../../../../preload/index.d'

function TagEditorPopover({ def }: { def: TagDefinition }) {
  const renameTag = useBoardStore((s) => s.renameTag)
  const recolorTag = useBoardStore((s) => s.recolorTag)
  const deleteTag = useBoardStore((s) => s.deleteTag)
  const [name, setName] = useState(def.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const commitRename = () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === def.name) return
    renameTag(def.name, trimmed)
  }

  return (
    <Popover.Content
      side="bottom"
      align="start"
      sideOffset={4}
      className="z-50 bg-surface-100 border border-border rounded-lg shadow-xl p-3 w-60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
    >
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] text-text-tertiary mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitRename()
              }
            }}
            className="input-compact w-full"
          />
        </div>
        <div>
          <label className="block text-[11px] text-text-tertiary mb-1">Color</label>
          <div className="grid grid-cols-8 gap-1">
            {TAG_COLOR_TOKENS.map((token) => (
              <button
                key={token}
                type="button"
                onClick={() => recolorTag(def.name, token)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all',
                  def.color === token ? 'border-text-primary scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: resolveTagColor(token) }}
                aria-label={token}
              />
            ))}
          </div>
        </div>
        <div className="pt-1 border-t border-border-subtle">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary flex-1">Delete tag?</span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn-secondary text-xs h-7 px-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTag(def.name)}
                className="btn-primary text-xs h-7 px-2 bg-red-500 hover:bg-red-400"
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Delete tag
            </button>
          )}
        </div>
      </div>
    </Popover.Content>
  )
}

function FilterChip({ def }: { def: TagDefinition }) {
  const filterTags = useBoardStore((s) => s.filterTags)
  const toggleFilterTag = useBoardStore((s) => s.toggleFilterTag)
  const [editorOpen, setEditorOpen] = useState(false)
  const active = filterTags.includes(def.name)

  return (
    <div className="relative group/chip inline-flex items-center">
      <button
        type="button"
        onClick={() => toggleFilterTag(def.name)}
        onContextMenu={(e) => {
          e.preventDefault()
          setEditorOpen(true)
        }}
        className={cn(
          'badge cursor-pointer transition-all',
          active ? 'font-semibold' : 'opacity-60 hover:opacity-100'
        )}
        style={active ? tagChipActiveStyle(def.color) : tagChipStyle(def.color)}
        title={active ? 'Click to remove filter' : 'Click to filter'}
      >
        {def.name}
      </button>
      <Popover.Root open={editorOpen} onOpenChange={setEditorOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setEditorOpen(true)
            }}
            className={cn(
              'ml-1 flex items-center justify-center w-5 h-5 rounded-md',
              'text-text-tertiary bg-surface-100 border border-border-subtle',
              'hover:bg-surface-200 hover:text-text-primary',
              'opacity-0 group-hover/chip:opacity-100 focus-visible:opacity-100 transition-opacity'
            )}
            title="Edit tag"
            aria-label={`Edit tag ${def.name}`}
          >
            <PencilSquareIcon className="w-3 h-3" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <TagEditorPopover def={def} />
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}

export function TagFilterBar() {
  const tagDefinitions = useBoardStore((s) => s.tagDefinitions)
  const filterTags = useBoardStore((s) => s.filterTags)
  const clearFilters = useBoardStore((s) => s.clearFilters)

  if (tagDefinitions.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-4">
      <FunnelIcon className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
      {tagDefinitions.map((def) => (
        <FilterChip key={def.name} def={def} />
      ))}
      {filterTags.length > 0 && (
        <button
          type="button"
          onClick={clearFilters}
          className="btn-icon btn-icon-xs ml-0.5 text-text-tertiary hover:text-text-primary"
          title="Clear filters"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
