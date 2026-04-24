import type { TagDefinition } from '../../../preload/index.d'

export const TAG_COLOR_TOKENS = [
  'journal-project-1',
  'journal-project-2',
  'journal-project-3',
  'journal-project-4',
  'journal-project-5',
  'journal-project-6',
  'journal-project-7',
  'journal-project-8'
] as const

export type TagColorToken = (typeof TAG_COLOR_TOKENS)[number]

export function isTagColorToken(value: string): value is TagColorToken {
  return (TAG_COLOR_TOKENS as readonly string[]).includes(value)
}

export function nextTagColor(existing: TagDefinition[]): TagColorToken {
  return TAG_COLOR_TOKENS[existing.length % TAG_COLOR_TOKENS.length]
}

export function resolveTagColor(color: string): string {
  if (isTagColorToken(color)) return `var(--${color})`
  return color
}

export function tagChipStyle(color: string): { color: string; backgroundColor: string } {
  const resolved = resolveTagColor(color)
  return {
    color: resolved,
    backgroundColor: `color-mix(in srgb, ${resolved} 18%, transparent)`
  }
}

export function tagChipActiveStyle(color: string): { color: string; backgroundColor: string } {
  const resolved = resolveTagColor(color)
  return {
    color: resolved,
    backgroundColor: `color-mix(in srgb, ${resolved} 45%, transparent)`
  }
}
