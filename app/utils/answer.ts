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
