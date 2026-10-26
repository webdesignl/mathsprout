import { describe, expect, it } from 'vitest'
import { feedbackRow, MAX_FEEDBACK_ISSUE, MAX_FEEDBACK_MESSAGE } from '../app/utils/feedback'

describe('feedbackRow', () => {
  it('accepts a rating alone and turns blanks into null', () => {
    expect(feedbackRow({ rating: 4, who: '', message: '   ' })).toEqual({ row: { rating: 4, who: null, message: null, issue: null, severity: null } })
  })
  it('keeps who and a trimmed note', () => {
    expect(feedbackRow({ rating: 5, who: 'teacher', message: '  Clear and fun  ' })).toEqual({ row: { rating: 5, who: 'teacher', message: 'Clear and fun', issue: null, severity: null } })
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
  it('keeps a trimmed problem report with its severity', () => {
    const checked = feedbackRow({ rating: 3, who: '', message: '', issue: '  Stars did not show  ', severity: 'high' })
    expect(checked).toEqual({ row: { rating: 3, who: null, message: null, issue: 'Stars did not show', severity: 'high' } })
  })
  it('treats a problem with no severity as medium, and drops a severity with no problem', () => {
    expect(feedbackRow({ rating: 3, who: '', message: '', issue: 'Broken', severity: '' })).toMatchObject({ row: { severity: 'medium' } })
    expect(feedbackRow({ rating: 3, who: '', message: '', issue: '   ', severity: 'high' })).toMatchObject({ row: { issue: null, severity: null } })
  })
  it('refuses a problem report over the limit', () => {
    expect('error' in feedbackRow({ rating: 3, who: '', message: '', issue: 'x'.repeat(MAX_FEEDBACK_ISSUE + 1) })).toBe(true)
    expect('row' in feedbackRow({ rating: 3, who: '', message: '', issue: 'x'.repeat(MAX_FEEDBACK_ISSUE) })).toBe(true)
  })
})
