import { describe, expect, it } from 'vitest'
import { feedbackRow, MAX_FEEDBACK_MESSAGE } from '../app/utils/feedback'

describe('feedbackRow', () => {
  it('accepts a rating alone and turns blanks into null', () => {
    expect(feedbackRow({ rating: 4, who: '', message: '   ' })).toEqual({ row: { rating: 4, who: null, message: null } })
  })
  it('keeps who and a trimmed note', () => {
    expect(feedbackRow({ rating: 5, who: 'teacher', message: '  Clear and fun  ' })).toEqual({ row: { rating: 5, who: 'teacher', message: 'Clear and fun' } })
  })
  it('asks for stars when there is no rating or a bad one', () => {
    for (const rating of [0, 6, 2.5, Number.NaN]) {
      expect(feedbackRow({ rating, who: '', message: '' })).toEqual({ error: 'Please choose 1 to 5 stars.' })
    }
  })
  it('refuses a note over the limit and allows exactly the limit', () => {
    expect('error' in feedbackRow({ rating: 3, who: '', message: 'x'.repeat(MAX_FEEDBACK_MESSAGE + 1) })).toBe(true)
    expect('row' in feedbackRow({ rating: 3, who: '', message: 'x'.repeat(MAX_FEEDBACK_MESSAGE) })).toBe(true)
  })
})
