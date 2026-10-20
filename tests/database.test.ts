import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Runs every migration, in order, in an in-memory Postgres (PGlite) with small stand-ins for Supabase's
 * auth schema and roles, then runs the row level security tests in supabase/tests/rls_tests.sql.
 * This catches SQL mistakes (like an ambiguous column in a function) before anything reaches Supabase.
 * The stand-ins only copy what the migrations use: roles, auth.users, auth.uid() and auth.jwt().
 */
const ROOT = join(__dirname, '..', 'supabase')

const SUPABASE_STANDINS = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema extensions;
create extension pgcrypto schema extensions;
create table auth.users (id uuid primary key, email text, aud text, role text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema public, auth, extensions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`

describe('database migrations and row level security', () => {
  it('applies every migration and passes the RLS tests', async () => {
    const db = new PGlite({ extensions: { pgcrypto } })
    await db.exec(SUPABASE_STANDINS)
    const files = readdirSync(join(ROOT, 'migrations')).filter((f) => f.endsWith('.sql')).sort()
    for (const file of files) {
      try {
        await db.exec(readFileSync(join(ROOT, 'migrations', file), 'utf8'))
      } catch (e) {
        throw new Error(`Migration ${file} failed: ${(e as Error).message}`)
      }
    }
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
