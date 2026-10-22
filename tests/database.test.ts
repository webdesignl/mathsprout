import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, migratedDb } from './helpers/db'
import { describe, expect, it } from 'vitest'
import { defaultCategory, taskState, todayString } from '../app/utils/todayPlan'

/**
 * Runs every migration, in order, in an in-memory Postgres (PGlite) with small stand-ins for Supabase's
 * auth schema and roles, then runs the row level security tests in supabase/tests/rls_tests.sql.
 * This catches SQL mistakes (like an ambiguous column in a function) before anything reaches Supabase.
 * The stand-ins only copy what the migrations use: roles, auth.users, auth.uid() and auth.jwt().
 */
describe('database migrations and row level security', () => {
  it('keeps the carry-over rule in the database equal to the one in the app', async () => {
    const db = await migratedDb()
    const today = '2026-10-20'
    const kinds = ['ixl', 'homework', 'testPrep'] as const
    for (const kind of kinds) {
      for (let age = -1; age <= 6; age++) {
        for (const dueOffset of [null, -1, 0, 4]) {
          const forDate = todayString(new Date(2026, 9, 20 - age))
          const due = dueOffset === null ? null : todayString(new Date(2026, 9, 20 + dueOffset))
          const category = defaultCategory(kind)
          const fromApp = taskState({ kind, category, for_date: forDate, created_at: `${forDate}T12:00:00Z`, due }, today)
          const { rows } = await db.query<{ s: string }>('select public.task_state($1, $2::date, $3::date, $4::date) as s', [category, forDate, due, today])
          expect(rows[0]!.s, `${kind} age ${age} due ${due}`).toBe(fromApp)
        }
      }
    }
    await db.close()
  }, 60_000)

  it('applies every migration and passes the RLS tests', async () => {
    const db = await migratedDb()
    // The test script ends with an error on purpose: its message is the report, and it rolls everything back.
    let report = ''
    try {
      await db.exec(readFileSync(join(ROOT, 'tests', 'rls_tests.sql'), 'utf8'))
    } catch (e) {
      report = (e as Error).message
    }
    expect(report, report).toMatch(/^ALL PASSED/)
    await db.close()
  }, 60_000)
})
