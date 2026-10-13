import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Stroke, ToolId } from '../utils/scratch'

/** The most strokes kept on one page, so a long scribble can't slow the tablet down. */
export const MAX_STROKES_PER_PAGE = 500

/**
 * Rough work for the practice page: one drawing per problem, kept while the tab stays open.
 * It is not saved or sent anywhere.
 */
export const useScratchStore = defineStore('scratch', () => {
  const open = ref(false)
  const tool = ref<ToolId>('pencil')
  /** Strokes by page key (for example "set-3"). */
  const pages = ref<Record<string, Stroke[]>>({})
  /** What a page held just before Clear, so Undo can bring it back. */
  const cleared = ref<Record<string, Stroke[]>>({})

  const hasDrawing = computed(() => (key: string) => (pages.value[key]?.length ?? 0) > 0)
  /** True when Undo would do something: there is a stroke to remove, or a Clear to take back. */
  const canUndo = computed(
    () => (key: string) => (pages.value[key]?.length ?? 0) > 0 || (cleared.value[key]?.length ?? 0) > 0,
  )

  function toggle() {
    open.value = !open.value
  }

  function setTool(next: ToolId) {
    tool.value = next
  }

  function strokes(key: string): Stroke[] {
    return pages.value[key] ?? []
  }

  function addStroke(key: string, stroke: Stroke) {
    if (stroke.points.length === 0) return
    const list = [...strokes(key), stroke]
    delete cleared.value[key] // drawing again means the old page can't be restored
    pages.value[key] = list.length > MAX_STROKES_PER_PAGE ? list.slice(-MAX_STROKES_PER_PAGE) : list
  }

  /** Removes the last stroke, or brings back a page that was just cleared. False when nothing to undo. */
  function undo(key: string): boolean {
    const list = strokes(key)
    if (list.length > 0) {
      pages.value[key] = list.slice(0, -1)
      return true
    }
    const restored = cleared.value[key]
    if (restored && restored.length > 0) {
      pages.value[key] = restored
      delete cleared.value[key]
      return true
    }
    return false
  }

  /** Wipes the page. Undo can bring it back until she draws something new. */
  function clear(key: string) {
    const list = strokes(key)
    if (list.length === 0) return
    cleared.value[key] = list
    pages.value[key] = []
  }

  function reset() {
    pages.value = {}
    cleared.value = {}
  }

  return { open, tool, pages, cleared, hasDrawing, canUndo, toggle, setTool, strokes, addStroke, undo, clear, reset }
})
