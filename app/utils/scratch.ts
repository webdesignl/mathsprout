/** Rough work drawing helpers. Pure functions, so they can be tested without a browser. */

export type ToolId = 'pencil' | 'pen' | 'eraser'

export interface ToolSpec {
  id: ToolId
  label: string
  color: string
  /** Line width in drawing units (the page is 800 x 1000). */
  width: number
  alpha: number
  /** The eraser cuts through what is already drawn. */
  composite: 'source-over' | 'destination-out'
}

export interface Point {
  x: number
  y: number
}

/** One continuous line, from pen down to pen up. */
export interface Stroke {
  tool: ToolId
  points: Point[]
}

/** The page is a fixed size, so drawings keep their shape however the panel is resized. */
export const PAGE_WIDTH = 800
export const PAGE_HEIGHT = 1000

export const TOOLS: Record<ToolId, ToolSpec> = {
  pencil: { id: 'pencil', label: 'Pencil', color: '#4b5563', width: 3, alpha: 0.85, composite: 'source-over' },
  pen: { id: 'pen', label: 'Pen', color: '#1e3a8a', width: 6, alpha: 1, composite: 'source-over' },
  eraser: { id: 'eraser', label: 'Eraser', color: '#000000', width: 32, alpha: 1, composite: 'destination-out' },
}

export const TOOL_ORDER: ToolId[] = ['pencil', 'pen', 'eraser']

/** Turns a pointer position on screen into a position on the page, kept inside the page. */
export function toPagePoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): Point {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 }
  const x = ((clientX - rect.left) / rect.width) * PAGE_WIDTH
  const y = ((clientY - rect.top) / rect.height) * PAGE_HEIGHT
  return {
    x: Math.min(PAGE_WIDTH, Math.max(0, Math.round(x * 10) / 10)),
    y: Math.min(PAGE_HEIGHT, Math.max(0, Math.round(y * 10) / 10)),
  }
}

/** The bits of the canvas drawing API we use, so tests can pass a fake. */
export interface DrawingContext {
  save(): void
  restore(): void
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void
  arc(x: number, y: number, r: number, start: number, end: number): void
  stroke(): void
  fill(): void
  lineWidth: number
  strokeStyle: string | CanvasGradient | CanvasPattern
  fillStyle: string | CanvasGradient | CanvasPattern
  globalAlpha: number
  globalCompositeOperation: GlobalCompositeOperation
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
}

/** Draws one stroke. A single tap makes a dot; longer lines are smoothed through their midpoints. */
export function drawStroke(ctx: DrawingContext, stroke: Stroke): void {
  const spec = TOOLS[stroke.tool]
  const [first, ...rest] = stroke.points
  if (!first) return

  ctx.save()
  ctx.globalAlpha = spec.alpha
  ctx.globalCompositeOperation = spec.composite
  ctx.strokeStyle = spec.color
  ctx.fillStyle = spec.color
  ctx.lineWidth = spec.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()

  if (rest.length === 0) {
    ctx.arc(first.x, first.y, spec.width / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.moveTo(first.x, first.y)
    for (let i = 0; i < rest.length - 1; i++) {
      const current = rest[i]!
      const next = rest[i + 1]!
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2)
    }
    const last = rest[rest.length - 1]!
    ctx.lineTo(last.x, last.y)
    ctx.stroke()
  }
  ctx.restore()
}
