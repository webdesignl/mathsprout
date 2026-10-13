import { describe, expect, it } from 'vitest'
import { mixedToBoxes, textToBoxes, boxesToText } from '../app/utils/answer'
import {
  ADD_SUBTRACT_EXAMPLES,
  ENGINE_EXAMPLES,
  MULTIPLY_DIVIDE_EXAMPLES,
} from '../app/utils/engineExamples'
import { analyze } from '../app/utils/engineLab'
import { parseMixed } from '../app/utils/fraction'
import { generateProblem } from '../app/utils/problems'

describe('every playground example (the buttons never lie)', () => {
  it('has the test cases from the engine tests', () => {
    expect(ADD_SUBTRACT_EXAMPLES.length).toBeGreaterThanOrEqual(10)
    expect(MULTIPLY_DIVIDE_EXAMPLES.length).toBeGreaterThanOrEqual(15)
    const labels = ENGINE_EXAMPLES.map((e) => e.label)
    for (const wanted of ['2/3 × 3/4', '4/9 × 3/8', '2 1/2 × 3 1/3', '6 ÷ 2/3', '2/3 ÷ 4/9', '3/5 ÷ 0', '8 1/5 − 4 3/4', '9 − 3 5/6']) {
      expect(labels).toContain(wanted)
    }
  })

  for (const example of ENGINE_EXAMPLES) {
    it(`${example.label} = ${example.expected}`, () => {
      const lab = analyze(example.op, example.a, example.b, example.student?.text ?? '')
      expect(lab.inputError).toBeNull()
      if (example.expected === 'error') {
        expect(lab.mathError).toMatch(/divide by zero/)
        expect(lab.answer).toBeNull()
        expect(lab.steps.map((s) => s.kind)).toEqual(['divideByZero'])
      } else {
        expect(lab.answer?.mixed).toBe(example.expected)
        expect(lab.steps.at(-1)!.kind).toBe('answer')
        expect(lab.steps.at(-1)!.expression).toBe(example.expected)
        expect(lab.inverse?.holds).toBe(true)
        expect(lab.estimate?.close).toBe(true)
      }
      if (example.student && example.student.slip !== 'unknown') {
        expect(lab.student?.diagnosis.slip).toBe(example.student.slip)
        expect(lab.student?.status).toBe('wrong')
      }
    })
  }

  it('the size examples are flagged by the size rule', () => {
    for (const label of ['6 × 1/2 = 12 (size)', '6 ÷ 1/2 = 3 (size)']) {
      const e = ENGINE_EXAMPLES.find((x) => x.label === label)!
      const lab = analyze(e.op, e.a, e.b, e.student!.text)
      expect(lab.student?.size).toMatchObject({ applies: true, ok: false })
      expect(lab.student?.size?.message).toMatch(/less than 1/)
    }
  })
})

describe('analyze', () => {
  it('shows the answer as a mixed number and an improper fraction', () => {
    const lab = analyze('multiply', '2 1/2', '3 1/3')
    expect(lab.answer).toEqual({ mixed: '8 1/3', improper: '25/3', negative: false })
    expect(lab.estimate).toMatchObject({ roundedAText: '2 1/2', roundedBText: '3 1/2', estimateText: '8 3/4', close: true })
    expect(lab.size).toEqual({ applies: false, ok: true, message: null })
  })

  it('shows the checks only for the operations they belong to', () => {
    expect(analyze('add', '1/2', '1/3').size).toBeNull()
    expect(analyze('divide', '6', '1/2').size).toMatchObject({ applies: true, ok: true })
  })

  it('reports a student answer: checkAnswer, diagnose (slip, step index, hint)', () => {
    const lab = analyze('divide', '2/3', '4/9', '8/27')
    expect(lab.student).toMatchObject({
      text: '8/27',
      status: 'wrong',
      simplestForm: '1 1/2',
      stepKind: 'flip',
      diagnosis: { slip: 'forgotReciprocal', stepIndex: 0 },
    })
    expect(lab.student?.diagnosis.hint).toMatch(/\?$/)
  })

  it('a right but unsimplified answer is correctNotSimplest, and a right one is correct', () => {
    expect(analyze('multiply', '2/3', '3/4', '3/6').student?.status).toBe('correctNotSimplest')
    expect(analyze('multiply', '2/3', '3/4', '1/2').student?.status).toBe('correct')
  })

  it('an unreadable student answer does not break anything', () => {
    const lab = analyze('add', '1/2', '1/3', 'banana')
    expect(lab.student?.status).toBeNull()
    expect(lab.student?.diagnosis.slip).toBe('unknown')
  })

  it('flags a negative subtraction and skips the estimate for it', () => {
    const lab = analyze('subtract', '1/4', '1/2')
    expect(lab.answer?.negative).toBe(true)
    expect(lab.estimate).toBeNull()
    expect(lab.steps.at(-1)!.kind).toBe('negative')
  })

  it('asks for numbers when they cannot be read, with nothing else filled in', () => {
    for (const [a, b] of [['', '1/2'], ['1/0', '1/2'], ['x', 'y'], ['1/2', '']] as const) {
      const lab = analyze('add', a, b)
      expect(lab.inputError).toBeTruthy()
      expect(lab.steps).toEqual([])
      expect(lab.answer).toBeNull()
    }
  })

  it('never throws, whatever the numbers or the operation', () => {
    const texts = ['0', '0/4', '5', '3/4', '2 1/2', '7 14/15', '9']
    for (const op of ['add', 'subtract', 'multiply', 'divide'] as const) {
      for (const a of texts) {
        for (const b of texts) {
          expect(() => analyze(op, a, b, '1/2')).not.toThrow()
          expect(() => analyze(op, a, b, '')).not.toThrow()
        }
      }
    }
  })

  it('works for generated problems of every operation', () => {
    for (let i = 0; i < 200; i++) {
      const problem = generateProblem({ op: 'all', maxDenominator: 12 })
      const lab = analyze(
        problem.op,
        boxesToText(mixedToBoxes(problem.a as { whole: number; num: number; den: number })),
        boxesToText(mixedToBoxes(problem.b as { whole: number; num: number; den: number })),
      )
      expect(lab.inputError).toBeNull()
      expect(lab.answer).not.toBeNull()
      expect(lab.inverse?.holds).toBe(true)
    }
  })
})

describe('answer box helpers', () => {
  it('textToBoxes keeps zeros and splits mixed numbers', () => {
    expect(textToBoxes('2 1/4')).toEqual({ whole: '2', num: '1', den: '4' })
    expect(textToBoxes('3/4')).toEqual({ whole: '', num: '3', den: '4' })
    expect(textToBoxes('0/4')).toEqual({ whole: '', num: '0', den: '4' })
    expect(textToBoxes('5')).toEqual({ whole: '5', num: '', den: '' })
    expect(textToBoxes('0')).toEqual({ whole: '0', num: '', den: '' })
  })

  it('round-trips through boxesToText and parseMixed', () => {
    for (const text of ['2 1/4', '3/4', '0/4', '5', '0']) {
      expect(boxesToText(textToBoxes(text))).toBe(text)
      expect(parseMixed(boxesToText(textToBoxes(text)))).not.toBeNull()
    }
  })

  it('mixedToBoxes leaves empty boxes where there is nothing to write', () => {
    expect(mixedToBoxes({ whole: 3, num: 0, den: 1 })).toEqual({ whole: '3', num: '', den: '' })
    expect(mixedToBoxes({ whole: 0, num: 1, den: 4 })).toEqual({ whole: '', num: '1', den: '4' })
    expect(mixedToBoxes({ whole: 2, num: 1, den: 4 })).toEqual({ whole: '2', num: '1', den: '4' })
  })
})
