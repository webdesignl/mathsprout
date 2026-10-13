/** What the student typed into the three boxes. */
export interface AnswerBoxes {
  whole: string
  num: string
  den: string
}

/** True when the fraction boxes are half filled (one of top/bottom is empty). */
export function isFractionIncomplete(boxes: AnswerBoxes): boolean {
  return (boxes.num.trim() === '') !== (boxes.den.trim() === '')
}

/** True when nothing has been typed at all. */
export function isAnswerEmpty(boxes: AnswerBoxes): boolean {
  return [boxes.whole, boxes.num, boxes.den].every((v) => v.trim() === '')
}

/** Joins the boxes into text for checkAnswer: "3 9/20", "9/20" or "3". */
export function boxesToText(boxes: AnswerBoxes): string {
  const whole = boxes.whole.trim()
  const fraction = boxes.num.trim() && boxes.den.trim() ? `${boxes.num.trim()}/${boxes.den.trim()}` : ''
  return [whole, fraction].filter(Boolean).join(' ')
}

/** A mixed number put into the three boxes: 2 1/4 is "2", "1", "4"; 3 is "3", "", ""; 1/4 is "", "1", "4". */
export function mixedToBoxes(m: { whole: number; num: number; den: number }): AnswerBoxes {
  return {
    whole: m.whole === 0 && m.num > 0 ? '' : String(m.whole),
    num: m.num > 0 ? String(m.num) : '',
    den: m.num > 0 ? String(m.den) : '',
  }
}

/** Text like "2 1/4", "3/4", "0/4" or "5" put into the three boxes, keeping zeros exactly as typed. */
export function textToBoxes(text: string): AnswerBoxes {
  const t = text.trim()
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(t)
  if (mixed) return { whole: mixed[1]!, num: mixed[2]!, den: mixed[3]! }
  const fraction = /^(\d+)\/(\d+)$/.exec(t)
  if (fraction) return { whole: '', num: fraction[1]!, den: fraction[2]! }
  return { whole: t, num: '', den: '' }
}
