import { describe, expect, it } from 'vitest'
import { emojiFor } from '../app/utils/storyEmoji'

describe('emojiFor', () => {
  it('finds a picture word in the story', () => {
    expect(emojiFor('An elephant has 8 1/5 buckets of water.')).toBe('🪣')
    expect(emojiFor('Share 12 Apples among 4 friends')).toBe('🍎')
  })
  it('matches whole words only', () => {
    expect(emojiFor('The carpet is 3 metres long')).toBeNull()
  })
  it('returns null when nothing matches or the text is empty', () => {
    expect(emojiFor('')).toBeNull()
    expect(emojiFor('Add 3 and 4')).toBeNull()
  })
})
