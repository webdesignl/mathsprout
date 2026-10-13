<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useScratchStore } from '../../stores/scratch'
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TOOLS,
  TOOL_ORDER,
  drawStroke,
  toPagePoint,
  type Point,
  type Stroke,
} from '../../utils/scratch'

/** Resolution multiplier so lines stay sharp on tablets. */
const SCALE = 2

const props = defineProps<{ pageKey: string }>()
const emit = defineEmits<{ close: [] }>()

const scratch = useScratchStore()
const canvas = ref<HTMLCanvasElement | null>(null)

let drawing: Stroke | null = null
let activePointer: number | null = null
/** Once a pen is used, finger touches are ignored so a resting palm doesn't draw. */
let penSeen = false

function context(): CanvasRenderingContext2D | null {
  return canvas.value?.getContext('2d') ?? null
}

/** Draws every saved stroke, then the line being drawn right now. */
function redraw() {
  const ctx = context()
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, PAGE_WIDTH * SCALE, PAGE_HEIGHT * SCALE)
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
  for (const stroke of scratch.strokes(props.pageKey)) drawStroke(ctx, stroke)
  if (drawing) drawStroke(ctx, drawing)
}

function pointFrom(event: PointerEvent): Point {
  return toPagePoint(event.clientX, event.clientY, canvas.value!.getBoundingClientRect())
}

function onDown(event: PointerEvent) {
  if (event.pointerType === 'pen') penSeen = true
  if (event.pointerType === 'touch' && penSeen) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (activePointer !== null) return
  event.preventDefault()
  try {
    canvas.value?.setPointerCapture(event.pointerId)
  } catch {
    // Capture is only a convenience (keeps drawing when the finger slides off the page).
  }
  activePointer = event.pointerId
  drawing = { tool: scratch.tool, points: [pointFrom(event)] }
  redraw()
}

function onMove(event: PointerEvent) {
  if (!drawing || event.pointerId !== activePointer) return
  event.preventDefault()
  const events = event.getCoalescedEvents?.() ?? []
  for (const e of events.length > 0 ? events : [event]) drawing.points.push(pointFrom(e))
  redraw()
}

function onUp(event: PointerEvent) {
  if (!drawing || event.pointerId !== activePointer) return
  scratch.addStroke(props.pageKey, drawing)
  drawing = null
  activePointer = null
  redraw()
}

// Each problem has its own page; redraw when she changes problem or the strokes change.
watch(
  () => [props.pageKey, scratch.strokes(props.pageKey).length],
  () => {
    drawing = null
    activePointer = null
    redraw()
  },
)
onMounted(async () => {
  await nextTick()
  redraw()
})

const toolButton = 'inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-lg font-bold'
const clearButton = `${toolButton} bg-white text-red-900 ring-2 ring-red-800 hover:bg-red-50`
const actionButton = `${toolButton} bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500 disabled:ring-slate-300`
</script>

<template>
  <section aria-labelledby="rough-work-title" class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <h2 id="rough-work-title" class="text-2xl font-bold text-slate-900">Rough work</h2>
      <button
        type="button"
        class="min-h-12 rounded-xl px-4 text-lg font-semibold text-slate-900 underline underline-offset-4"
        @click="emit('close')"
      >
        Close
      </button>
    </div>

    <div class="flex flex-wrap gap-2" role="group" aria-label="Drawing tools">
      <button
        v-for="id in TOOL_ORDER"
        :key="id"
        type="button"
        :aria-pressed="scratch.tool === id"
        :class="[
          toolButton,
          scratch.tool === id
            ? 'bg-slate-900 text-white'
            : 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100',
        ]"
        @click="scratch.setTool(id)"
      >
        {{ TOOLS[id].label }}
      </button>
    </div>

    <div class="flex flex-wrap gap-2" role="group" aria-label="Fix mistakes">
      <button type="button" :class="actionButton" :disabled="!scratch.canUndo(pageKey)" @click="scratch.undo(pageKey)">
        Undo
      </button>
      <button
        type="button"
        :class="clearButton"
        aria-label="Clear all rough work on this page"
        @click="scratch.clear(pageKey)"
      >
        Clear
      </button>
    </div>

    <canvas
      ref="canvas"
      :width="PAGE_WIDTH * SCALE"
      :height="PAGE_HEIGHT * SCALE"
      role="img"
      aria-label="Rough work page. Draw with a finger, a pen or a mouse."
      class="paper mx-auto block aspect-[4/5] h-[48vh] w-auto max-w-full touch-none rounded-xl border-2 border-slate-700 bg-white lg:h-auto lg:w-full"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    />
    <p class="text-base text-slate-700">Your rough work stays on this page for each problem.</p>
  </section>
</template>

<style scoped>
/* A light grid, like graph paper, drawn behind the canvas. */
.paper {
  background-image:
    linear-gradient(to right, rgb(148 163 184 / 0.35) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(148 163 184 / 0.35) 1px, transparent 1px);
  background-size: 5% 4%;
}
</style>
