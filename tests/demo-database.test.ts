import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'
import { migratedDb } from './helpers/db'

/**
 * The public demo, in a Postgres that runs every migration: a visitor who signs in anonymously gets a private
 * demo family with sample data; a real sign-up is unchanged; families cannot see each other.
 */
const DEMO_A = '00000000-0000-4000-8000-0000000000d1'
const DEMO_B = '00000000-0000-4000-8000-0000000000d2'
const REAL = '00000000-0000-4000-8000-0000000000e1'
const SESSION = (id: string) => id.replace('-0000000000', '-1000000000')

async function createUsers(db: PGlite) {
  await db.exec(`
    insert into auth.users (id, email, aud, role, is_anonymous) values
      ('${DEMO_A}', null, 'authenticated', 'authenticated', true),
      ('${DEMO_B}', null, 'authenticated', 'authenticated', true);
    insert into auth.users (id, email, aud, role, raw_user_meta_data) values
      ('${REAL}', 'real@example.test', 'authenticated', 'authenticated', '{"family_name":"The Reals","child_nickname":"Bee"}');
  `)
}

/** Runs SQL as a signed-in user (their row level security applies). */
async function asUser<T = Record<string, unknown>>(db: PGlite, id: string, sql: string): Promise<T[]> {
  await db.exec(`select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated","session_id":"${SESSION(id)}"}', false); set role authenticated;`)
  try {
    return (await db.query<T>(sql)).rows
  } finally {
    await db.exec('reset role')
  }
}

async function familyOf(db: PGlite, id: string) {
  return (await db.query<{ family_id: string }>(`select family_id from public.family_members where user_id = '${id}'`)).rows[0]!.family_id
}

describe('the demo sandbox', () => {
  it('an anonymous visitor gets a demo family with Sprout, routines, tasks, stars and a working PIN 1234', async () => {
    const db = await migratedDb()
    await createUsers(db)

    const family = (await db.query<{ name: string; is_demo: boolean }>(`select f.name, f.is_demo from public.families f join public.family_members m on m.family_id = f.id where m.user_id = '${DEMO_A}'`)).rows[0]!
    expect(family).toEqual({ name: 'Demo family', is_demo: true })

    const member = (await db.query<{ email: string | null }>(`select email from public.family_members where user_id = '${DEMO_A}'`)).rows[0]!
    expect(member.email).toBeNull()

    const kids = await asUser<{ nickname: string; avatar: string }>(db, DEMO_A, 'select nickname, avatar from public.children')
    expect(kids).toEqual([{ nickname: 'Sprout', avatar: '🐰' }])

    const templates = await asUser<{ title: string; repeat_daily: boolean }>(db, DEMO_A, 'select title, repeat_daily from public.task_templates order by sort_order')
    expect(templates.map((t) => t.title)).toEqual(['IXL', 'Reading', 'Olympiad set', 'Math homework book'])
    expect(templates.filter((t) => t.repeat_daily)).toHaveLength(3)

    const tasks = await asUser<{ title: string; done: boolean; priority: number | null; start_time: string | null; seen_by_parent: boolean }>(
      db, DEMO_A, 'select title, done, priority, start_time, seen_by_parent from public.tasks order by priority nulls last, title',
    )
    expect(tasks.filter((t) => t.priority !== null).map((t) => [t.title, t.priority, t.start_time])).toEqual([
      ['Math homework book: pages 45 to 47', 1, '16:30:00'],
      ['MAP practice', 2, '17:15:00'],
      ['Fractions test prep', 3, '18:00:00'],
    ])
    expect(tasks.filter((t) => t.done)).toHaveLength(1)
    expect(tasks.some((t) => t.title === 'Spelling words' && !t.seen_by_parent)).toBe(true)

    // The routines fill Today.
    const kid = (await db.query<{ id: string }>(`select id from public.children where family_id = '${family ? await familyOf(db, DEMO_A) : ''}'`)).rows[0]!.id
    await db.exec(`select set_config('request.jwt.claims', '{"sub":"${DEMO_A}","role":"authenticated"}', false); set role authenticated;`)
    await db.query(`select public.ensure_routines('${kid}', current_date)`)
    await db.exec('reset role')
    const routineTitles = (await db.query<{ title: string }>(`select title from public.tasks where child_id = '${kid}' and template_id is not null order by title`)).rows.map((r) => r.title)
    expect(routineTitles).toEqual(['IXL', 'Olympiad set', 'Reading'])

    const stars = await asUser<{ kind: string }>(db, DEMO_A, 'select kind from public.awards order by kind')
    expect(stars.map((s) => s.kind).sort()).toEqual(['day_done', 'idea_star', 'idea_star', 'proof_master'])
    const attempts = await asUser<{ n: number }>(db, DEMO_A, 'select count(*)::int as n from public.attempts')
    expect(attempts[0]!.n).toBeGreaterThanOrEqual(6)
    const waiting = await asUser<{ n: number }>(db, DEMO_A, "select count(*)::int as n from public.day_summaries where finished_all and not seen")
    expect(waiting[0]!.n).toBe(1)

    // The PIN 1234 works; a wrong one does not.
    const wrong = await asUser<{ r: string | null }>(db, DEMO_A, "select public.unlock_parent_mode('0000') as r")
    expect(wrong[0]!.r).toBeNull()
    const right = await asUser<{ r: string | null }>(db, DEMO_A, "select public.unlock_parent_mode('1234') as r")
    expect(right[0]!.r).not.toBeNull()
    expect((await asUser<{ r: boolean }>(db, DEMO_A, 'select public.is_parent_unlocked() as r'))[0]!.r).toBe(true)
    await db.close()
  }, 60_000)

  it('a real sign-up still gets an empty family from its metadata, not a demo family', async () => {
    const db = await migratedDb()
    await createUsers(db)
    const family = (await db.query<{ name: string; is_demo: boolean }>(`select f.name, f.is_demo from public.families f join public.family_members m on m.family_id = f.id where m.user_id = '${REAL}'`)).rows[0]!
    expect(family).toEqual({ name: 'The Reals', is_demo: false })
    const member = (await db.query<{ email: string }>(`select email from public.family_members where user_id = '${REAL}'`)).rows[0]!
    expect(member.email).toBe('real@example.test')
    expect((await asUser<{ nickname: string }>(db, REAL, 'select nickname from public.children')).map((c) => c.nickname)).toEqual(['Bee'])
    for (const table of ['tasks', 'task_templates', 'awards', 'attempts', 'ideas', 'day_summaries', 'daily_plans']) {
      const n = (await asUser<{ n: number }>(db, REAL, `select count(*)::int as n from public.${table}`))[0]!.n
      expect(n, table).toBe(0)
    }
    // Its PIN is not 1234: nothing is set yet.
    expect((await db.query<{ pin_hash: string | null }>(`select pin_hash from public.family_secrets where family_id = '${await familyOf(db, REAL)}'`)).rows[0]!.pin_hash).toBeNull()
    await db.close()
  }, 60_000)

  it('demo family A cannot read or change demo family B or a real family', async () => {
    const db = await migratedDb()
    await createUsers(db)
    const famB = await familyOf(db, DEMO_B)
    const famReal = await familyOf(db, REAL)
    const kidB = (await db.query<{ id: string }>(`select id from public.children where family_id = '${famB}'`)).rows[0]!.id
    const kidReal = (await db.query<{ id: string }>(`select id from public.children where family_id = '${famReal}'`)).rows[0]!.id

    // A sees only Sprout and only its own rows.
    expect((await asUser(db, DEMO_A, 'select id from public.children')).length).toBe(1)
    for (const table of ['tasks', 'attempts', 'awards', 'ideas', 'task_templates', 'day_summaries', 'daily_plans']) {
      const foreign = await asUser<{ n: number }>(db, DEMO_A, `select count(*)::int as n from public.${table} where family_id in ('${famB}', '${famReal}')`)
      expect(foreign[0]!.n, table).toBe(0)
    }

    // A cannot write into B's or the real family, even as another family's child.
    const attempt = (child: string, fam: string) =>
      asUser(db, DEMO_A, `insert into public.attempts (family_id, child_id, mode, problem, correct) values ('${fam}', '${child}', 'practice', '1 + 1', true)`)
    await expect(attempt(kidB, famB)).rejects.toThrow()
    await expect(attempt(kidReal, famReal)).rejects.toThrow()
    await db.exec('reset role')
    const renamed = await asUser<{ n: number }>(db, DEMO_A, `with u as (update public.children set nickname = 'Hacked' where id in ('${kidB}', '${kidReal}') returning 1) select count(*)::int as n from u`)
    expect(renamed[0]!.n).toBe(0)
    expect((await db.query<{ nickname: string }>(`select nickname from public.children where id = '${kidB}'`)).rows[0]!.nickname).toBe('Sprout')

    // Demo B's PIN does not unlock demo A, and the secrets stay unreadable.
    await expect(asUser(db, DEMO_A, 'select * from public.family_secrets')).rejects.toThrow()
    await db.close()
  }, 60_000)

  it('a demo family cannot store a photo, but a real family can', async () => {
    const db = await migratedDb()
    await createUsers(db)
    const kidDemo = (await db.query<{ id: string }>(`select id from public.children where family_id = '${await familyOf(db, DEMO_A)}'`)).rows[0]!.id
    const kidReal = (await db.query<{ id: string }>(`select id from public.children where family_id = '${await familyOf(db, REAL)}'`)).rows[0]!.id
    const upload = (user: string, fam: string, child: string) =>
      asUser(db, user, `insert into public.uploads (family_id, child_id, storage_path, kind) values ('${fam}', '${child}', 'x/y.jpg', 'tutor')`)
    await expect(upload(DEMO_A, await familyOf(db, DEMO_A), kidDemo)).rejects.toThrow()
    await db.exec('reset role')
    await upload(REAL, await familyOf(db, REAL), kidReal)
    await db.exec('reset role')
    expect((await db.query<{ n: number }>('select count(*)::int as n from public.uploads')).rows[0]!.n).toBe(1)
    await db.close()
  }, 60_000)
})
