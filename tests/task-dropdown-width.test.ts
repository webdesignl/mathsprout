import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Issue #54: the "Kind of task" dropdown took the width of its longest option
// and stuck out of its card on phones. The label and select must be able to
// shrink to the card width.
const files = ['app/components/TaskAdder.vue', 'app/components/parent/TemplateManager.vue']

describe('Kind of task dropdown fits its card', () => {
  for (const file of files) {
    it(file, () => {
      const src = readFileSync(join(__dirname, '..', file), 'utf8')
      const match = src.match(/<label class="([^"]*)">\s*Kind of task\s*<select[^>]*:class="\[input, '([^']*)'\]"/)
      expect(match, 'Kind of task label and select not found').not.toBeNull()
      const label = match![1]!.split(/\s+/)
      const select = match![2]!.split(/\s+/)
      expect(label).toEqual(expect.arrayContaining(['min-w-0', 'max-w-full']))
      expect(select).toEqual(expect.arrayContaining(['w-full', 'max-w-full']))
    })
  }
})
