import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { attemptRow, type AttemptInput, type AttemptRow } from '../utils/attempts'

/** Saves one row, or says why not. The app wires this to Supabase; tests pass a fake. */
export type RowSaver = (row: AttemptRow) => Promise<boolean>

/** Saves one idea (her own words, already tidied). */
export type IdeaSaver = (row: { family_id: string; child_id: string; set_number: number; text: string }) => Promise<boolean>

/** Saves one award, like a Proof Master. */
export type AwardSaver = (row: { family_id: string; child_id: string; kind: 'proof_master' }) => Promise<boolean>

export const NOT_SAVED_NOTE = 'Not saved yet. We will try again.'

/**
 * Saves each finished problem to the family's attempts table. It never blocks her: a failure keeps the row
 * and tries again with the next one. A row is saved only when a child is picked and the family is known.
 */
export const useSyncStore = defineStore('sync', () => {
  let saver: RowSaver | null = null
  let familyId: (() => Promise<string | null>) | null = null
  let childId: () => string | null = () => null
  let ideaSaver: IdeaSaver | null = null
  let awardSaver: AwardSaver | null = null

  const pending = ref<AttemptRow[]>([])
  const failed = ref(false)
  const note = computed(() => (failed.value ? NOT_SAVED_NOTE : ''))

  function configure(options: {
    save: RowSaver
    familyId: () => Promise<string | null>
    childId: () => string | null
    saveIdea?: IdeaSaver
    saveAward?: AwardSaver
  }) {
    ideaSaver = options.saveIdea ?? null
    awardSaver = options.saveAward ?? null
    saver = options.save
    familyId = options.familyId
    childId = options.childId
  }

  async function trySave(row: AttemptRow): Promise<boolean> {
    // One more try right away, then it waits for the next problem.
    return (await saver!(row)) || (await saver!(row))
  }

  async function flush(): Promise<void> {
    while (pending.value.length > 0) {
      const next = pending.value[0]!
      if (!(await trySave(next))) {
        failed.value = true
        return
      }
      pending.value.shift()
    }
    failed.value = false
  }

  /** Records a finished problem. Does nothing when nobody is signed in or no child is picked. */
  async function record(input: AttemptInput): Promise<void> {
    const child = childId()
    if (!saver || !familyId || !child) return
    const family = await familyId()
    if (!family) return
    pending.value.push(attemptRow(input, family, child))
    await flush()
  }

  /** Saves her ideas for the parent to review. Needs a child and a family; a failure only shows the small note. */
  async function recordIdeas(setNumber: number, texts: string[]): Promise<void> {
    const child = childId()
    if (!ideaSaver || !familyId || !child || texts.length === 0) return
    const family = await familyId()
    if (!family) return
    let allSaved = true
    for (const text of texts) {
      const row = { family_id: family, child_id: child, set_number: setNumber, text: text.slice(0, 200) }
      if (!(await ideaSaver(row)) && !(await ideaSaver(row))) allSaved = false
    }
    if (!allSaved) failed.value = true
  }

  /** Saves an award for the chosen child. It never blocks her; one retry, then only the small note. */
  async function recordAward(kind: 'proof_master'): Promise<void> {
    const child = childId()
    if (!awardSaver || !familyId || !child) return
    const family = await familyId()
    if (!family) return
    const row = { family_id: family, child_id: child, kind }
    if (!(await awardSaver(row)) && !(await awardSaver(row))) failed.value = true
  }

  function clear() {
    pending.value = []
    failed.value = false
  }

  return { pending, failed, note, configure, record, recordIdeas, recordAward, flush, clear }
})
