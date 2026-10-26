import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'
import { migratedDb } from './helpers/db'

/** Invite a parent: a one-time link that adds a second parent to the SAME family. Runs every migration in Postgres. */
const A1 = '00000000-0000-4000-8000-0000000000a1' // parent of family A
const B1 = '00000000-0000-4000-8000-0000000000b1' // parent of family B
const DEMO = '00000000-0000-4000-8000-0000000000d1'
const A2 = '00000000-0000-4000-8000-0000000000a2' // the invited parent
const SESSION = (id: string) => id.replace('-0000000000', '-1000000000')
const PIN = '2468'

async function setup() {
  const db = await migratedDb()
  await db.exec(`
    insert into auth.users (id, email, aud, role, raw_user_meta_data) values
      ('${A1}', 'a1@example.test', 'authenticated', 'authenticated', '{"family_name":"Family A","child_nickname":"Bee"}'),
      ('${B1}', 'b1@example.test', 'authenticated', 'authenticated', '{"family_name":"Family B"}');
    insert into auth.users (id, email, aud, role, is_anonymous) values ('${DEMO}', null, 'authenticated', 'authenticated', true);
  `)
  return db
}

type Result = { rows?: Record<string, unknown>[]; error?: string }
/** Runs SQL as a signed-in user (their row level security applies). A refusal comes back as { error }. */
async function asUser(db: PGlite, id: string, sql: string): Promise<Result> {
  await db.exec(`select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated","session_id":"${SESSION(id)}"}', false); set role authenticated;`)
  try {
    return { rows: (await db.query<Record<string, unknown>>(sql)).rows }
  } catch (e) {
    return { error: (e as Error).message }
  } finally {
    await db.exec('reset role')
  }
}

async function asAnon(db: PGlite, sql: string): Promise<Result> {
  await db.exec(`select set_config('request.jwt.claims', '', false); set role anon;`)
  try {
    return { rows: (await db.query<Record<string, unknown>>(sql)).rows }
  } catch (e) {
    return { error: (e as Error).message }
  } finally {
    await db.exec('reset role')
  }
}

async function parentMode(db: PGlite, id: string) {
  await asUser(db, id, `select public.set_parent_pin('${PIN}')`)
  await asUser(db, id, `select public.unlock_parent_mode('${PIN}')`)
}

async function invite(db: PGlite, id: string): Promise<{ token: string; expires_at: string }> {
  const r = await asUser(db, id, 'select public.create_family_invite() as r')
  expect(r.error).toBeUndefined()
  return r.rows![0]!.r as { token: string; expires_at: string }
}

const familyOf = async (db: PGlite, id: string) =>
  (await db.query<{ family_id: string }>(`select family_id from public.family_members where user_id = '${id}'`)).rows[0]?.family_id

const signUp = (db: PGlite, id: string, token: string | null) =>
  db.exec(`insert into auth.users (id, email, aud, role, raw_user_meta_data) values ('${id}', 'new@example.test', 'authenticated', 'authenticated', '${JSON.stringify(token === null ? {} : { invite_token: token })}')`)

describe('creating an invite', () => {
  it('a parent in parent mode gets a random token once; only its hash is stored; it lasts 3 days', async () => {
    const db = await setup()
    await parentMode(db, A1)
    const { token, expires_at } = await invite(db, A1)
    expect(token).toMatch(/^[0-9a-f]{48}$/)
    const stored = (await db.query<{ token_hash: string; family_id: string }>('select token_hash, family_id from public.family_invites')).rows
    expect(stored).toHaveLength(1)
    expect(stored[0]!.token_hash).not.toBe(token)
    expect(JSON.stringify(stored)).not.toContain(token)
    expect(stored[0]!.family_id).toBe(await familyOf(db, A1))
    const days = (new Date(expires_at).getTime() - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(2.9)
    expect(days).toBeLessThan(3.1)
  })

  it('is refused when parent mode is off, and for a demo family', async () => {
    const db = await setup()
    expect((await asUser(db, A1, 'select public.create_family_invite()')).error).toMatch(/Parent mode is off/)
    await parentMode(db, DEMO)
    await asUser(db, DEMO, `select public.unlock_parent_mode('1234')`)
    expect((await asUser(db, DEMO, 'select public.create_family_invite()')).error).toMatch(/not available in the demo/)
    expect((await db.query('select 1 from public.family_invites')).rows).toHaveLength(0)
  })

  it('allows 5 open invites and refuses the sixth', async () => {
    const db = await setup()
    await parentMode(db, A1)
    for (let i = 0; i < 5; i++) await invite(db, A1)
    expect((await asUser(db, A1, 'select public.create_family_invite()')).error).toMatch(/Too many open invites/)
  })

  it('the app cannot insert an invite directly or read the token hash', async () => {
    const db = await setup()
    await parentMode(db, A1)
    const fam = await familyOf(db, A1)
    expect((await asUser(db, A1, `insert into public.family_invites (family_id, token_hash) values ('${fam}', 'x')`)).error).toMatch(/permission denied/)
    await invite(db, A1)
    expect((await asUser(db, A1, 'select token_hash from public.family_invites')).error).toMatch(/permission denied/)
    expect((await asUser(db, A1, 'select * from public.family_invites')).error).toMatch(/permission denied/)
    expect((await asUser(db, A1, 'select id, expires_at, used_at from public.family_invites')).rows).toHaveLength(1)
  })
})

describe('listing and revoking', () => {
  it('needs parent mode, and each family sees only its own invites', async () => {
    const db = await setup()
    await parentMode(db, A1)
    await parentMode(db, B1)
    await invite(db, A1)
    expect((await asUser(db, B1, 'select id from public.family_invites')).rows).toHaveLength(0)
    expect((await asUser(db, A1, 'select id from public.family_invites')).rows).toHaveLength(1)
    await asUser(db, A1, 'select public.lock_parent_mode()')
    expect((await asUser(db, A1, 'select id from public.family_invites')).rows).toHaveLength(0)
  })

  it('a parent can revoke an unused invite; another family cannot; a used one stays', async () => {
    const db = await setup()
    await parentMode(db, A1)
    await parentMode(db, B1)
    const { token } = await invite(db, A1)
    const id = (await db.query<{ id: string }>('select id from public.family_invites')).rows[0]!.id
    await asUser(db, B1, `delete from public.family_invites where id = '${id}'`)
    expect((await db.query('select 1 from public.family_invites')).rows).toHaveLength(1)
    await signUp(db, A2, token)
    await asUser(db, A1, `delete from public.family_invites where id = '${id}'`)
    expect((await db.query('select 1 from public.family_invites')).rows).toHaveLength(1) // used: kept as a record
    const second = await invite(db, A1)
    const id2 = (await db.query<{ id: string }>(`select id from public.family_invites where used_at is null`)).rows[0]!.id
    await asUser(db, A1, `delete from public.family_invites where id = '${id2}'`)
    expect((await db.query('select 1 from public.family_invites where used_at is null')).rows).toHaveLength(0)
    expect((await asAnon(db, `select public.invite_is_valid('${second.token}') as v`)).rows![0]!.v).toBe(false)
  })
})

describe('signing up from the link', () => {
  it('joins the inviting family instead of getting a new one, and the invite is used up', async () => {
    const db = await setup()
    await parentMode(db, A1)
    const { token } = await invite(db, A1)
    const familiesBefore = (await db.query<{ n: number }>('select count(*)::int n from public.families')).rows[0]!.n
    await signUp(db, A2, token)
    expect(await familyOf(db, A2)).toBe(await familyOf(db, A1))
    expect((await db.query<{ n: number }>('select count(*)::int n from public.families')).rows[0]!.n).toBe(familiesBefore)
    expect((await db.query<{ n: number }>('select count(*)::int n from public.family_secrets')).rows[0]!.n).toBe(familiesBefore)
    const used = (await db.query<{ used_by: string; used_at: string | null }>('select used_by, used_at from public.family_invites')).rows[0]!
    expect(used.used_by).toBe(A2)
    expect(used.used_at).not.toBeNull()
    const member = (await db.query<{ email: string }>(`select email from public.family_members where user_id = '${A2}'`)).rows[0]!
    expect(member.email).toBe('new@example.test')
  })

  it('the new parent sees the family and unlocks parent mode with the family PIN', async () => {
    const db = await setup()
    await parentMode(db, A1)
    const { token } = await invite(db, A1)
    await signUp(db, A2, token)
    expect((await asUser(db, A2, 'select nickname from public.children')).rows).toEqual([{ nickname: 'Bee' }])
    await asUser(db, A2, `select public.unlock_parent_mode('${PIN}')`)
    expect((await asUser(db, A2, 'select public.is_parent_unlocked() as r')).rows![0]!.r).toBe(true)
  })

  it('a link works once: the second sign-up with it is refused', async () => {
    const db = await setup()
    await parentMode(db, A1)
    const { token } = await invite(db, A1)
    await signUp(db, A2, token)
    const other = '00000000-0000-4000-8000-0000000000a3'
    await expect(signUp(db, other, token)).rejects.toThrow(/Invite link is not valid/)
    expect((await db.query('select 1 from auth.users where id = $1', [other])).rows).toHaveLength(0)
  })

  it('an expired link, a wrong token and a stolen hash are all refused', async () => {
    const db = await setup()
    await parentMode(db, A1)
    const { token } = await invite(db, A1)
    await expect(signUp(db, A2, 'f'.repeat(48))).rejects.toThrow(/Invite link is not valid/)
    const hash = (await db.query<{ token_hash: string }>('select token_hash from public.family_invites')).rows[0]!.token_hash
    await expect(signUp(db, A2, hash)).rejects.toThrow(/Invite link is not valid/)
    await db.exec(`update public.family_invites set expires_at = now() - interval '1 minute'`)
    await expect(signUp(db, A2, token)).rejects.toThrow(/Invite link is not valid/)
    expect((await asAnon(db, `select public.invite_is_valid('${token}') as v`)).rows![0]!.v).toBe(false)
  })

  it('a sign-up with no invite is unchanged: a new family', async () => {
    const db = await setup()
    const solo = '00000000-0000-4000-8000-0000000000c1'
    await db.exec(`insert into auth.users (id, email, aud, role, raw_user_meta_data) values ('${solo}', 'solo@example.test', 'authenticated', 'authenticated', '{"family_name":"Solo"}')`)
    const fam = await familyOf(db, solo)
    expect(fam).not.toBe(await familyOf(db, A1))
    expect((await db.query<{ name: string }>('select name from public.families where id = $1', [fam])).rows[0]!.name).toBe('Solo')
  })

  it('anyone can ask whether a link is valid, and only gets yes or no', async () => {
    const db = await setup()
    await parentMode(db, A1)
    const { token } = await invite(db, A1)
    expect((await asAnon(db, `select public.invite_is_valid('${token}') as v`)).rows![0]!.v).toBe(true)
    expect((await asAnon(db, `select public.invite_is_valid('nope') as v`)).rows![0]!.v).toBe(false)
    expect((await asAnon(db, `select public.invite_is_valid(null) as v`)).rows![0]!.v).toBe(false)
    expect((await asAnon(db, 'select public.create_family_invite()')).error).toMatch(/permission denied/)
  })
})
