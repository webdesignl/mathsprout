import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'
import { migratedDb } from './helpers/db'

const OLD_DEMO = '00000000-0000-4000-8000-0000000000a1'
const NEW_DEMO = '00000000-0000-4000-8000-0000000000a2'
const OLD_REAL = '00000000-0000-4000-8000-0000000000b1'

const count = async (db: PGlite, sql: string) => (await db.query<{ n: number }>(`select count(*)::int as n from ${sql}`)).rows[0]!.n

async function setup() {
  const db = await migratedDb()
  await db.exec(`
    insert into auth.users (id, email, aud, role, is_anonymous) values
      ('${OLD_DEMO}', null, 'authenticated', 'authenticated', true),
      ('${NEW_DEMO}', null, 'authenticated', 'authenticated', true);
    insert into auth.users (id, email, aud, role, raw_user_meta_data) values
      ('${OLD_REAL}', 'real@example.test', 'authenticated', 'authenticated', '{"family_name":"The Reals","child_nickname":"Bee"}');
    -- The old demo is 25 hours old; the new one stays new; the real family is 40 days old.
    update auth.users set created_at = now() - interval '25 hours' where id = '${OLD_DEMO}';
    update public.families set created_at = now() - interval '25 hours' where id = (select family_id from public.family_members where user_id = '${OLD_DEMO}');
    update auth.users set created_at = now() - interval '40 days' where id = '${OLD_REAL}';
    update public.families set created_at = now() - interval '40 days' where id = (select family_id from public.family_members where user_id = '${OLD_REAL}');
    -- the real family has some data too
    insert into public.tasks (family_id, child_id, kind, title)
      select f.family_id, c.id, 'homework', 'Real homework' from public.family_members f join public.children c on c.family_id = f.family_id where f.user_id = '${OLD_REAL}';
  `)
  return db
}

describe('deleting old demo families', () => {
  it('removes demo families and anonymous users older than 24 hours, with all their data', async () => {
    const db = await setup()
    const oldFamily = (await db.query<{ family_id: string }>(`select family_id from public.family_members where user_id = '${OLD_DEMO}'`)).rows[0]!.family_id
    expect(await count(db, `public.tasks where family_id = '${oldFamily}'`)).toBeGreaterThan(0)

    const result = (await db.query<{ r: { families: number; users: number } }>('select public.delete_old_demo_families() as r')).rows[0]!.r
    expect(result).toEqual({ families: 1, users: 1 })

    expect(await count(db, `auth.users where id = '${OLD_DEMO}'`)).toBe(0)
    for (const table of ['families where id', 'family_members where family_id', 'family_secrets where family_id', 'children where family_id', 'tasks where family_id', 'task_templates where family_id', 'attempts where family_id', 'awards where family_id', 'ideas where family_id', 'day_summaries where family_id', 'daily_plans where family_id']) {
      expect(await count(db, `public.${table} = '${oldFamily}'`), table).toBe(0)
    }
    await db.close()
  }, 60_000)

  it('keeps a new demo and every real family, with their data', async () => {
    const db = await setup()
    const newFamily = (await db.query<{ family_id: string }>(`select family_id from public.family_members where user_id = '${NEW_DEMO}'`)).rows[0]!.family_id
    const before = await count(db, `public.tasks where family_id = '${newFamily}'`)
    await db.query('select public.delete_old_demo_families()')

    expect(await count(db, `auth.users where id in ('${NEW_DEMO}', '${OLD_REAL}')`)).toBe(2)
    expect(await count(db, `public.families where id = '${newFamily}'`)).toBe(1)
    expect(await count(db, `public.tasks where family_id = '${newFamily}'`)).toBe(before)
    // the real family (40 days old, is_demo false) and its child and task are untouched
    expect(await count(db, "public.families where name = 'The Reals' and not is_demo")).toBe(1)
    expect(await count(db, "public.children where nickname = 'Bee'")).toBe(1)
    expect(await count(db, "public.tasks where title = 'Real homework'")).toBe(1)
    await db.close()
  }, 60_000)

  it('is harmless to run twice, and removes a demo family whose user is already gone', async () => {
    const db = await setup()
    await db.exec(`delete from public.family_members where user_id = '${OLD_DEMO}'`) // an orphan: no member, still a demo family
    const first = (await db.query<{ r: { families: number; users: number } }>('select public.delete_old_demo_families() as r')).rows[0]!.r
    expect(first.families).toBe(1)
    const second = (await db.query<{ r: { families: number; users: number } }>('select public.delete_old_demo_families() as r')).rows[0]!.r
    expect(second).toEqual({ families: 0, users: 0 })
    await db.close()
  }, 60_000)

  it('cannot be run by a signed-in or signed-out visitor', async () => {
    const db = await setup()
    for (const role of ['authenticated', 'anon']) {
      await db.exec(`set role ${role}`)
      await expect(db.query('select public.delete_old_demo_families()'), role).rejects.toThrow(/permission denied/i)
      await db.exec('reset role')
    }
    // and nothing was deleted by the attempts
    expect(await count(db, `auth.users where id = '${OLD_DEMO}'`)).toBe(1)
    await db.close()
  }, 60_000)
})
