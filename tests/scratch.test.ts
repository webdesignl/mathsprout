import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { MAX_STROKES_PER_PAGE, useScratchStore } from '../app/stores/scratch'
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TOOLS,
  TOOL_ORDER,
  drawStroke,
  toPagePoint,
  type DrawingContext,
  type Stroke,
} from '../app/utils/scratch'

const stroke = (tool: Stroke['tool'], ...xy: Array<[number, number]>): Stroke => ({
  tool,
  points: xy.map(([x, y]) => ({ x, y })),
})

/** A fake canvas context that records what was drawn. */
function fakeContext() {
  const calls: string[] = []
  const state: Record<string, unknown> = {}
  const ctx = new Proxy(
    {},
    {
      get(_t, name: string) {
        if (name in state) return state[name]
        return (...args: unknown[]) => calls.push(`${name}(${args.join(',')})`)
      },
      set(_t, name: string, value) {
        state[name] = value
        calls.push(`set ${name}=${String(value)}`)
        return true
      },
    },
  ) as unknown as DrawingContext
  return { ctx, calls }
}

describe('tools', () => {
  it('offers a pencil and a pen, plus an eraser', () => {
    expect(TOOL_ORDER).toEqual(['pencil', 'pen', 'eraser'])
  })

  it('the pencil is lighter and thinner than the pen', () => {
    expect(TOOLS.pencil.width).toBeLessThan(TOOLS.pen.width)
    expect(TOOLS.pencil.alpha).toBeLessThan(TOOLS.pen.alpha)
    expect(TOOLS.pencil.color).not.toBe(TOOLS.pen.color)
  })

  it('only the eraser removes what is drawn', () => {
    expect(TOOLS.eraser.composite).toBe('destination-out')
    expect(TOOLS.pencil.composite).toBe('source-over')
    expect(TOOLS.pen.composite).toBe('source-over')
  })
})

describe('toPagePoint', () => {
  const rect = { left: 100, top: 50, width: 400, height: 500 }

  it('scales a screen position to the fixed page size', () => {
    expect(toPagePoint(300, 300, rect)).toEqual({ x: PAGE_WIDTH / 2, y: PAGE_HEIGHT / 2 })
    expect(toPagePoint(100, 50, rect)).toEqual({ x: 0, y: 0 })
    expect(toPagePoint(500, 550, rect)).toEqual({ x: PAGE_WIDTH, y: PAGE_HEIGHT })
  })

  it('keeps the point on the page even when the pointer drifts outside', () => {
    expect(toPagePoint(-50, 9999, rect)).toEqual({ x: 0, y: PAGE_HEIGHT })
  })

  it('does not divide by zero for a hidden canvas', () => {
    expect(toPagePoint(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 })
  })

  it('gives the same page position at any panel size', () => {
    const small = toPagePoint(150, 100, { left: 100, top: 50, width: 200, height: 250 })
    const big = toPagePoint(200, 150, { left: 100, top: 50, width: 400, height: 500 })
    expect(small).toEqual(big)
  })
})

describe('drawStroke', () => {
  it('draws nothing for an empty stroke', () => {
    const { ctx, calls } = fakeContext()
    drawStroke(ctx, { tool: 'pen', points: [] })
    expect(calls).toEqual([])
  })

  it('a single tap makes a dot the size of the tool', () => {
    const { ctx, calls } = fakeContext()
    drawStroke(ctx, stroke('pen', [10, 20]))
    expect(calls).toContain(`arc(10,20,${TOOLS.pen.width / 2},0,${Math.PI * 2})`)
    expect(calls).toContain('fill()')
    expect(calls).not.toContain('stroke()')
  })

  it('a line is smoothed and ends at the last point', () => {
    const { ctx, calls } = fakeContext()
    drawStroke(ctx, stroke('pencil', [0, 0], [10, 10], [20, 0], [30, 10]))
    expect(calls).toContain('moveTo(0,0)')
    expect(calls.some((c) => c.startsWith('quadraticCurveTo('))).toBe(true)
    expect(calls).toContain('lineTo(30,10)')
    expect(calls).toContain('stroke()')
  })

  it('a two-point line is drawn straight', () => {
    const { ctx, calls } = fakeContext()
    drawStroke(ctx, stroke('pen', [0, 0], [50, 50]))
    expect(calls).toContain('lineTo(50,50)')
  })

  it('sets the tool colour, width and blend mode, and restores afterwards', () => {
    const { ctx, calls } = fakeContext()
    drawStroke(ctx, stroke('eraser', [0, 0], [5, 5]))
    expect(calls[0]).toBe('save()')
    expect(calls).toContain('set globalCompositeOperation=destination-out')
    expect(calls).toContain(`set lineWidth=${TOOLS.eraser.width}`)
    expect(calls.at(-1)).toBe('restore()')

    const pen = fakeContext()
    drawStroke(pen.ctx, stroke('pen', [0, 0], [5, 5]))
    expect(pen.calls).toContain(`set strokeStyle=${TOOLS.pen.color}`)
    expect(pen.calls).toContain('set globalCompositeOperation=source-over')
  })
})

describe('scratch store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts closed with the pencil', () => {
    const scratch = useScratchStore()
    expect(scratch.open).toBe(false)
    expect(scratch.tool).toBe('pencil')
    scratch.toggle()
    expect(scratch.open).toBe(true)
    scratch.toggle()
    expect(scratch.open).toBe(false)
  })

  it('switches between pencil, pen and eraser', () => {
    const scratch = useScratchStore()
    scratch.setTool('pen')
    expect(scratch.tool).toBe('pen')
    scratch.setTool('eraser')
    expect(scratch.tool).toBe('eraser')
  })

  it('keeps a separate page for each problem', () => {
    const scratch = useScratchStore()
    scratch.addStroke('set-0', stroke('pen', [1, 1], [2, 2]))
    scratch.addStroke('set-1', stroke('pencil', [5, 5]))
    expect(scratch.strokes('set-0')).toHaveLength(1)
    expect(scratch.strokes('set-1')).toHaveLength(1)
    expect(scratch.strokes('set-2')).toEqual([])
    expect(scratch.hasDrawing('set-0')).toBe(true)
    expect(scratch.hasDrawing('set-2')).toBe(false)
  })

  it('ignores empty strokes', () => {
    const scratch = useScratchStore()
    scratch.addStroke('set-0', { tool: 'pen', points: [] })
    expect(scratch.hasDrawing('set-0')).toBe(false)
  })

  it('undo removes the last stroke on that page only', () => {
    const scratch = useScratchStore()
    scratch.addStroke('set-0', stroke('pen', [1, 1]))
    scratch.addStroke('set-0', stroke('pen', [2, 2]))
    scratch.addStroke('set-1', stroke('pen', [3, 3]))
    expect(scratch.undo('set-0')).toBe(true)
    expect(scratch.strokes('set-0')).toHaveLength(1)
    expect(scratch.strokes('set-0')[0]!.points[0]).toEqual({ x: 1, y: 1 })
    expect(scratch.strokes('set-1')).toHaveLength(1)
    expect(scratch.undo('set-2')).toBe(false)
  })

  it('clear empties one page and reset empties all', () => {
    const scratch = useScratchStore()
    scratch.addStroke('set-0', stroke('pen', [1, 1]))
    scratch.addStroke('set-1', stroke('pen', [1, 1]))
    scratch.clear('set-0')
    expect(scratch.hasDrawing('set-0')).toBe(false)
    expect(scratch.hasDrawing('set-1')).toBe(true)
    scratch.reset()
    expect(scratch.hasDrawing('set-1')).toBe(false)
  })

  it('Undo after Clear brings the page back', () => {
    const scratch = useScratchStore()
    scratch.addStroke('set-0', stroke('pen', [1, 1]))
    scratch.addStroke('set-0', stroke('pen', [2, 2]))
    scratch.clear('set-0')
    expect(scratch.hasDrawing('set-0')).toBe(false)
    expect(scratch.canUndo('set-0')).toBe(true)
    expect(scratch.undo('set-0')).toBe(true)
    expect(scratch.strokes('set-0')).toHaveLength(2)
    expect(scratch.canUndo('set-0')).toBe(true) // strokes can be undone one by one again
  })

  it('drawing after Clear means the old page can no longer be restored', () => {
    const scratch = useScratchStore()
    scratch.addStroke('set-0', stroke('pen', [1, 1]))
    scratch.clear('set-0')
    scratch.addStroke('set-0', stroke('pen', [9, 9]))
    scratch.undo('set-0')
    expect(scratch.hasDrawing('set-0')).toBe(false)
    expect(scratch.undo('set-0')).toBe(false)
  })

  it('Clear on an empty page does nothing, and Clear only affects its own page', () => {
    const scratch = useScratchStore()
    scratch.clear('set-0')
    expect(scratch.canUndo('set-0')).toBe(false)
    scratch.addStroke('set-1', stroke('pen', [1, 1]))
    scratch.clear('set-0')
    expect(scratch.hasDrawing('set-1')).toBe(true)
  })

  it('reset forgets cleared pages too', () => {
    const scratch = useScratchStore()
    scratch.addStroke('set-0', stroke('pen', [1, 1]))
    scratch.clear('set-0')
    scratch.reset()
    expect(scratch.canUndo('set-0')).toBe(false)
  })

  it('caps the strokes on a page, keeping the newest', () => {
    const scratch = useScratchStore()
    for (let i = 0; i < MAX_STROKES_PER_PAGE + 5; i++) {
      scratch.addStroke('set-0', stroke('pen', [i, i]))
    }
    const list = scratch.strokes('set-0')
    expect(list).toHaveLength(MAX_STROKES_PER_PAGE)
    expect(list.at(-1)!.points[0]).toEqual({ x: MAX_STROKES_PER_PAGE + 4, y: MAX_STROKES_PER_PAGE + 4 })
  })
})
