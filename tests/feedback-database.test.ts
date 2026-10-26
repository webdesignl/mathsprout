import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'
import { migratedDb } from './helpers/db'

/** Feedback: any signed-in family may add it (5 a day); nobody in the app can read, change or delete it; it survives demo cleanup. */
const DEMO = '00000000-0000-4000-8000-0000000000d1'
const OTHER = '00000000-0000-4000-8000-0000000000d2'
const REAL = '00000000-0000-4000-8000-0000000000e1'
const SESSION = (id: string) => id.replace('-0000000000', '-1000000000')

async function setup() {
  const db = await migratedDb()
  await db.exec(`
    insert into auth.users (id, email, aud, role, is_anonymous) values
      ('${DEMO}', null, 'authenticated', 'authenticated', true),
      ('${OTHER}', null, 'authenticated', 'authenticated', true);
    insert into auth.users (id, email, aud, role) values ('${REAL}', 'real@example.test', 'authenticated', 'authenticated');
  `)
  return db
}

async function familyOf(db: PGlite, id: string) {
  return (await db.query<{ family_id: string }>(`select family_id from public.family_members where user_id = '${id}'`)).rows[0]!.family_id
}

/** Runs SQL as a signed-in user (their row level security applies). A refusal comes back as { error }. */
async function asUser(db: PGlite, id: string, sql: string): Promise<{ rows?: Record<string, unknown>[]; error?: string }> {
  await db.exec(`select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated","session_id":"${SESSION(id)}"}', false); set role authenticated;`)
  try {
    return { rows: (await db.query<Record<string, unknown>>(sql)).rows }
  } catch (e) {
    return { error: (e as Error).message }
  } finally {
    await db.exec('reset role')
  }
}

const add = (family: string, isDemo: boolean, extra = `5, 'recruiter', 'Nice demo'`) =>
  `insert into public.feedback (family_id, is_demo, rating, who, message) values ('${family}', ${isDemo}, ${extra})`

describe('feedback', () => {
  it('a demo visitor and a real family can add feedback for their own family', async () => {
    const db = await setup()
    expect((await asUser(db, DEMO, add(await familyOf(db, DEMO), true))).error).toBeUndefined()
    expect((await asUser(db, REAL, add(await familyOf(db, REAL), false, `4, 'parent', null`))).error).toBeUndefined()
    const rows = (await db.query<{ is_demo: boolean }>('select is_demo from public.feedback order by is_demo desc')).rows
    expect(rows.map((r) => r.is_demo)).toEqual([true, false])
  })

  it('cannot add feedback for another family, or say a demo family is not a demo', async () => {
    const db = await setup()
    const other = await familyOf(db, OTHER)
    expect((await asUser(db, DEMO, add(other, true))).error).toMatch(/row-level security/)
    expect((await asUser(db, DEMO, add(await familyOf(db, DEMO), false))).error).toMatch(/row-level security/)
    expect((await db.query('select 1 from public.feedback')).rows).toHaveLength(0)
  })

  it('rejects a rating outside 1 to 5, a long message and an unknown "who"', async () => {
    const db = await setup()
    const fam = await familyOf(db, DEMO)
    expect((await asUser(db, DEMO, add(fam, true, `6, null, null`))).error).toMatch(/rating/)
    expect((await asUser(db, DEMO, add(fam, true, `3, null, '${'x'.repeat(1001)}'`))).error).toMatch(/message/)
    expect((await asUser(db, DEMO, add(fam, true, `3, 'spy', null`))).error).toMatch(/who/)
  })

  it('allows 5 a day and refuses the sixth', async () => {
    const db = await setup()
    const fam = await familyOf(db, DEMO)
    for (let i = 0; i < 5; i++) expect((await asUser(db, DEMO, add(fam, true))).error).toBeUndefined()
    expect((await asUser(db, DEMO, add(fam, true))).error).toMatch(/row-level security/)
  })

  it('the app can never read, change or delete feedback', async () => {
    const db = await setup()
    const fam = await familyOf(db, DEMO)
    await asUser(db, DEMO, add(fam, true))
    expect((await asUser(db, DEMO, 'select * from public.feedback')).error).toMatch(/permission denied/)
    expect((await asUser(db, DEMO, `update public.feedback set rating = 1`)).error).toMatch(/permission denied/)
    expect((await asUser(db, DEMO, 'delete from public.feedback')).error).toMatch(/permission denied/)
    expect((await db.query('select 1 from public.feedback')).rows).toHaveLength(1)
  })

  it('feedback is kept when the old demo family is deleted', async () => {
    const db = await setup()
    const fam = await familyOf(db, DEMO)
    await asUser(db, DEMO, add(fam, true))
    await db.exec(`update public.families set created_at = now() - interval '25 hours' where id = '${fam}'; update auth.users set created_at = now() - interval '25 hours' where id = '${DEMO}'; select public.delete_old_demo_families();`)
    expect((await db.query('select 1 from public.families where id = $1', [fam])).rows).toHaveLength(0)
    expect((await db.query('select 1 from public.feedback where family_id = $1', [fam])).rows).toHaveLength(1)
  })

  it('stores a problem report with a severity, and refuses a bad severity, a long issue or a severity with no issue', async () => {
    const db = await setup()
    const fam = await familyOf(db, DEMO)
    const withIssue = (cols: string) => `insert into public.feedback (family_id, is_demo, rating, issue, severity) values ('${fam}', true, 3, ${cols})`
    expect((await asUser(db, DEMO, withIssue(`'Stars missing', 'high'`))).error).toBeUndefined()
    expect((await asUser(db, DEMO, withIssue(`'Stars missing', 'urgent'`))).error).toMatch(/severity/)
    expect((await asUser(db, DEMO, withIssue(`'${'x'.repeat(1001)}', 'low'`))).error).toMatch(/issue/)
    expect((await asUser(db, DEMO, withIssue(`null, 'low'`))).error).toMatch(/severity/)
    expect((await db.query('select issue, severity from public.feedback')).rows).toEqual([{ issue: 'Stars missing', severity: 'high' }])
  })

  it('the app cannot read the problem reports either', async () => {
    const db = await setup()
    expect((await asUser(db, DEMO, 'select issue, severity from public.feedback')).error).toMatch(/permission denied/)
  })
})
