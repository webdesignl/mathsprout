import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export interface Child {
  id: string
  nickname: string
  grade: number | null
  avatar?: string | null
}

export const CHILD_KEY = 'mathsprout.childId'

function readSaved(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(CHILD_KEY)
  } catch {
    return null
  }
}

function writeSaved(id: string | null) {
  try {
    if (typeof window === 'undefined') return
    if (id === null) window.localStorage.removeItem(CHILD_KEY)
    else window.localStorage.setItem(CHILD_KEY, id)
  } catch {
    // Storage may be blocked; the choice just won't be remembered.
  }
}

/** Who is practicing. Only the chosen child's id is kept in the browser; the nickname and the rest come from the database. */
export const useChildStore = defineStore('child', () => {
  const selectedId = ref<string | null>(readSaved())
  const children = ref<Child[]>([])
  const loaded = ref(false)

  const selected = computed(() => children.value.find((c) => c.id === selectedId.value) ?? null)

  function select(id: string | null) {
    selectedId.value = id
    writeSaved(id)
  }

  /** Sets the list. A remembered child who no longer exists (deleted by a parent) is forgotten. */
  function setChildren(list: Child[]) {
    children.value = list
    loaded.value = true
    if (selectedId.value !== null && !list.some((c) => c.id === selectedId.value)) select(null)
    // With only one child there is nothing to choose.
    if (selectedId.value === null && list.length === 1) select(list[0]!.id)
  }

  return { selectedId, children, loaded, selected, select, setChildren }
})
