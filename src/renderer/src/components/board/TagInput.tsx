import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useBoardStore } from '../../store/board-store'
import { tagChipStyle } from '../../lib/tag-colors'
import { cn } from '../../lib/utils'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ value, onChange }: TagInputProps) {
  const tagDefinitions = useBoardStore((s) => s.tagDefinitions)
  const createTag = useBoardStore((s) => s.createTag)

  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    const query = input.trim().toLowerCase()
    const available = tagDefinitions.filter((t) => !value.includes(t.name))
    if (!query) return available
    return available.filter((t) => t.name.toLowerCase().includes(query))
  }, [tagDefinitions, value, input])

  const exactMatch = useMemo(() => {
    const query = input.trim().toLowerCase()
    if (!query) return null
    return tagDefinitions.find((t) => t.name.toLowerCase() === query) ?? null
  }, [tagDefinitions, input])

  const canCreate = input.trim().length > 0 && !exactMatch

  useEffect(() => {
    setActiveIndex(0)
  }, [input, focused])

  useEffect(() => {
    if (!focused) return
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [focused])

  const addTagByName = useCallback(
    (name: string) => {
      const def = tagDefinitions.find((t) => t.name === name) ?? createTag(name)
      if (!def) return
      if (value.includes(def.name)) return
      onChange([...value, def.name])
      setInput('')
      setFocused(true)
      // Re-focus on next tick in case the DOM focus landed elsewhere briefly.
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    [tagDefinitions, createTag, value, onChange]
  )

  const removeTag = useCallback(
    (name: string) => {
      onChange(value.filter((n) => n !== name))
    },
    [value, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const totalOptions = suggestions.length + (canCreate ? 1 : 0)
        if (totalOptions === 0) return
        const index = Math.min(activeIndex, totalOptions - 1)
        if (index < suggestions.length) {
          addTagByName(suggestions[index].name)
        } else if (canCreate) {
          addTagByName(input.trim())
        }
      } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
        e.preventDefault()
        removeTag(value[value.length - 1])
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const total = suggestions.length + (canCreate ? 1 : 0)
        if (total > 0) setActiveIndex((i) => (i + 1) % total)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const total = suggestions.length + (canCreate ? 1 : 0)
        if (total > 0) setActiveIndex((i) => (i - 1 + total) % total)
      } else if (e.key === 'Escape') {
        setFocused(false)
        inputRef.current?.blur()
      }
    },
    [suggestions, canCreate, activeIndex, input, value, addTagByName, removeTag]
  )

  const showDropdown = focused && (suggestions.length > 0 || canCreate)

  return (
    <div ref={containerRef} className="relative">
      <div
        className="input-field flex items-center flex-wrap gap-1 min-h-8 h-auto py-1 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((name) => {
          const def = tagDefinitions.find((t) => t.name === name)
          const style = def ? tagChipStyle(def.color) : undefined
          return (
            <span key={name} className="badge" style={style}>
              <span>{name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(name)
                }}
                className="btn-icon btn-icon-xs -mr-1"
                aria-label={`Remove ${name}`}
              >
                <XMarkIcon className="w-2.5 h-2.5" />
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? 'Add tags…' : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-text-primary placeholder:text-text-tertiary"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-surface-100 border border-border rounded-lg shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto">
          {suggestions.map((def, i) => {
            const style = tagChipStyle(def.color)
            return (
              <button
                key={def.name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  addTagByName(def.name)
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm',
                  activeIndex === i ? 'bg-surface-200' : ''
                )}
              >
                <span className="badge" style={style}>
                  {def.name}
                </span>
              </button>
            )
          })}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                addTagByName(input.trim())
              }}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary',
                activeIndex === suggestions.length ? 'bg-surface-200' : ''
              )}
            >
              Create <span className="text-text-primary font-medium">"{input.trim()}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
