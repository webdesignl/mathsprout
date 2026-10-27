/**
 * Reads problem reports as JSON on stdin and prints what the agent may read.
 *   <rows as JSON> | npx vite-node scripts/screen-feedback.ts
 * Rows look like { id, created_at, severity, issue }. Nothing is sent anywhere.
 */
import { screenReports, type ReportRow } from '../app/utils/feedbackTriage'

let input = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) input += chunk

const rows = JSON.parse(input || '[]') as ReportRow[]
if (!Array.isArray(rows)) throw new Error('Expected a JSON array of reports')
console.log(JSON.stringify(screenReports(rows), null, 2))
