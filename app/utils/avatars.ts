export interface Avatar {
  emoji: string
  name: string
}

/** The animals a parent can pick for a child. */
export const AVATARS: Avatar[] = [
  { emoji: '🐰', name: 'Bunny' },
  { emoji: '🐻', name: 'Bear' },
  { emoji: '🐼', name: 'Panda' },
  { emoji: '🦊', name: 'Fox' },
  { emoji: '🐱', name: 'Kitten' },
  { emoji: '🐶', name: 'Puppy' },
  { emoji: '🐸', name: 'Frog' },
  { emoji: '🦁', name: 'Lion' },
  { emoji: '🐧', name: 'Penguin' },
  { emoji: '🦉', name: 'Owl' },
  { emoji: '🐢', name: 'Turtle' },
  { emoji: '🦄', name: 'Unicorn' },
]

/** Shown when no animal was picked yet (a sprout, like the logo). */
export const DEFAULT_AVATAR = '🌱'

/** Only an animal from the list is shown; anything else falls back, so odd data never reaches the screen. */
export function avatarOf(value: string | null | undefined): string {
  return AVATARS.some((a) => a.emoji === value) ? (value as string) : DEFAULT_AVATAR
}
