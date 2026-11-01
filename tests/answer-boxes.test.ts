import { describe, expect, it } from 'vitest'
import { boxesToText, isAnswerEmpty } from '../app/utils/answer'

describe('money and big answers', () => {
  it('ignores a leading $ and commas', () => {
    expect(boxesToText({ whole: '$500', num: '', den: '' })).toBe('500')
    expect(boxesToText({ whole: '$1,250', num: '', den: '' })).toBe('1250')
  })
  it('keeps a mixed number with a big whole part', () => {
    expect(boxesToText({ whole: '$250', num: '1', den: '2' })).toBe('250 1/2')
  })
  it('treats a lone $ as empty', () => {
    expect(isAnswerEmpty({ whole: '$', num: '', den: '' })).toBe(true)
  })
})
