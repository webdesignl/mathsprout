<script setup lang="ts">
import { computed, ref } from 'vue'
import GroupsPicture from './GroupsPicture.vue'
import NumberLinePicture, { type Hop } from './NumberLinePicture.vue'
import { useTutorStore } from '../../stores/tutor'
import { emojiFor } from '../../utils/storyEmoji'
import { formatMixed, toFraction, toMixed, type AnyProblem, type MixedNumber } from '../../utils/fraction'

/**
 * A picture of the question as a bar model. "question" shows the two numbers without the operation
 * (she still has to find it); "step" shows what the step does. It only draws; code checks every answer.
 */
const props = defineProps<{ problem: AnyProblem; mode: 'question' | 'step' }>()

const store = useTutorStore()
const replay = ref(0)

interface Seg {
  /** Share of the bar, in percent. */
  width: number
  label: string
  tone: 'a' | 'b' | 'unknown' | 'plain'
}
interface Bar {
  caption: string
  segs: Seg[]
}

const MAX_PIECES = 8

interface Meaning {
  text: string
  /** Whole bars (all shaded), then the cut bar: `den` equal parts with `num` shaded. */
  wholes: number
  num: number
  den: number
  sentence: string
}

function meaningOf(x: AnyProblem['a']): Meaning {
  const m: MixedNumber = 'whole' in x ? x : toMixed(x)
  const text = formatMixed(x)
  const hasPart = m.num > 0
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  let sentence: string
  if (!hasPart) sentence = `${text} is ${plural(m.whole, 'whole bar')}, all coloured.`
  else if (m.whole === 0)
    sentence = `${text}: the bar has ${m.den} equal parts. ${m.num} are coloured.`
  else
    sentence = `${text} is ${plural(m.whole, 'whole bar')}, and then ${m.num} of the ${m.den} equal parts of one more bar.`
  return { text, wholes: m.whole, num: m.num, den: m.den, sentence }
}

const value = (x: AnyProblem['a']) => {
  const f = toFraction(x)
  return f.numerator / f.denominator
}
const a = computed(() => value(props.problem.a))
const b = computed(() => value(props.problem.b))
const aText = computed(() => formatMixed(props.problem.a))
const bText = computed(() => formatMixed(props.problem.b))
const isWhole = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_PIECES

const meanings = computed(() => [meaningOf(props.problem.a), meaningOf(props.problem.b)])

const bars = computed<Bar[]>(() => {
  const x = a.value
  const y = b.value
  if (!(x > 0) || !(y > 0)) return []
  if (props.mode === 'question') return []
  switch (props.problem.op) {
    case 'add':
      return [
        {
          caption: 'Join them. How much in all?',
          segs: [
            { width: (x / (x + y)) * 100, label: aText.value, tone: 'a' },
            { width: (y / (x + y)) * 100, label: bText.value, tone: 'b' },
          ],
        },
        { caption: 'Altogether', segs: [{ width: 100, label: '?', tone: 'unknown' }] },
      ]
    case 'subtract': {
      const left = Math.max(x - y, 0)
      return [
        { caption: 'We start with this much', segs: [{ width: 100, label: aText.value, tone: 'a' }] },
        {
          caption: 'Take some away. How much is left?',
          segs: [
            { width: (Math.min(y, x) / x) * 100, label: `− ${bText.value}`, tone: 'b' },
            { width: (left / x) * 100, label: '?', tone: 'unknown' },
          ],
        },
      ]
    }
    case 'multiply':
      if (isWhole(y)) return groups(y, aText.value, 'Count them all. How much in all?')
      if (isWhole(x)) return groups(x, bText.value, 'Count them all. How much in all?')
      return [
        { caption: 'The amount we start with', segs: [{ width: 100, label: aText.value, tone: 'a' }] },
        { caption: `Take ${bText.value} of it. How much is that?`, segs: [{ width: 100, label: '?', tone: 'unknown' }] },
      ]
    default:
      if (isWhole(y)) {
        const pieces = Array.from({ length: y }, (_, i) => ({
          width: 100 / y,
          label: i === 0 ? '?' : '',
          tone: i === 0 ? ('unknown' as const) : ('plain' as const),
        }))
        return [
          { caption: 'The whole amount', segs: [{ width: 100, label: aText.value, tone: 'a' }] },
          { caption: `Share it into ${y} equal parts. How much is in one part?`, segs: pieces },
        ]
      }
      return [
        { caption: 'The whole amount', segs: [{ width: 100, label: aText.value, tone: 'a' }] },
        {
          caption: `How many groups of ${bText.value} fit in it?`,
          segs: fitting(x, y, bText.value),
        },
      ]
  }
})

function groups(count: number, each: string, caption: string): Bar[] {
  return [
    {
      caption: `${count} groups, each one ${each}`,
      segs: Array.from({ length: count }, () => ({ width: 100 / count, label: each, tone: 'a' as const })),
    },
    { caption, segs: [{ width: 100, label: '?', tone: 'unknown' }] },
  ]
}

/** Pieces of size `piece` laid along a bar of size `total` (the last one may be partly empty). */
function fitting(total: number, piece: number, label: string): Seg[] {
  const count = Math.ceil(total / piece - 1e-9)
  if (count > 12) return [{ width: 100, label: '?', tone: 'unknown' }]
  return Array.from({ length: count }, (_, i) => {
    const used = Math.min(piece, total - i * piece)
    return { width: (used / total) * 100, label: used < piece - 1e-9 ? '' : label, tone: 'b' as const }
  })
}

type Picture =
  | { kind: 'groups' | 'share'; boxes: number; count: number; label: string }
  | { kind: 'line'; max: number; hops: Hop[]; start: { at: number; label: string }; end?: number; label: string }

const unitHops = (from: number, n: number, dir: 1 | -1): Hop[] =>
  Array.from({ length: n }, (_, i) => ({ from: from + dir * i, to: from + dir * (i + 1), label: dir === 1 ? '+1' : '−1' }))

/** A picture that suits the question better than bars, or null to fall back to the bar model. */
const picture = computed<Picture | null>(() => {
  if (props.mode !== 'step') return null
  const x = a.value
  const y = b.value
  if (!(x > 0) || !(y > 0)) return null
  const whole = Number.isInteger(x) && Number.isInteger(y)
  switch (props.problem.op) {
    case 'multiply':
      if (whole && y <= MAX_PIECES && x <= 12 && x * y <= 60)
        return { kind: 'groups', boxes: y, count: x, label: `${y} groups with ${x} in each. How many in all?` }
      return null
    case 'divide':
      if (whole && x % y === 0 && y <= MAX_PIECES && x <= 36)
        return { kind: 'share', boxes: y, count: x, label: `Deal ${x} out equally into ${y} boxes. How many in each box?` }
      if (x <= 20)
        return {
          kind: 'line',
          max: Math.ceil(x),
          start: { at: 0, label: '0' },
          hops: [{ from: 0, to: Math.min(y, x), label: bText.value }],
          label: `How many hops of ${bText.value} fit to reach ${aText.value}?`,
        }
      return null
    case 'add':
      if (x + y > 20) return null
      return {
        kind: 'line',
        max: Math.max(Math.ceil(x + y), 1),
        start: { at: x, label: aText.value },
        end: x + y,
        hops: Number.isInteger(y) && y <= 10 ? unitHops(x, y, 1) : [{ from: x, to: x + y, label: `+${bText.value}` }],
        label: `Start at ${aText.value} and hop forward ${bText.value}. Where do you land?`,
      }
    case 'subtract':
      if (x > 20 || y > x) return null
      return {
        kind: 'line',
        max: Math.max(Math.ceil(x), 1),
        start: { at: x, label: aText.value },
        end: x - y,
        hops: Number.isInteger(y) && y <= 10 ? unitHops(x, y, -1) : [{ from: x, to: x - y, label: `−${bText.value}` }],
        label: `Start at ${aText.value} and hop back ${bText.value}. Where do you land?`,
      }
    default:
      return null
  }
})
const icon = computed(() => emojiFor(store.problemText) ?? '●')

const TONE: Record<Seg['tone'], string> = {
  a: 'bg-emerald-300',
  b: 'bg-amber-300',
  unknown: 'border-dashed bg-indigo-100 text-indigo-950',
  plain: 'bg-white',
}

const steps = computed(() => Array.from({ length: store.stepCount }, (_, i) => i))
const meaningLabel = (m: Meaning) => m.sentence
const summary = computed(() =>
  bars.value.map((bar) => `${bar.caption}: ${bar.segs.map((s) => s.label || 'a part').join(', ')}`).join('. '),
)
</script>

<template>
  <section aria-labelledby="picture-title" class="space-y-3 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="picture-title" class="text-xl font-bold text-slate-900 sm:text-2xl">
        {{ mode === 'question' ? 'Picture of the question' : 'Picture of this step' }}
      </h2>
      <button
        type="button"
        class="min-h-11 rounded-xl px-4 text-base font-semibold text-slate-900 underline underline-offset-4"
        @click="replay++"
      >
        Show again
      </button>
    </div>

    <ol v-if="mode === 'step' && store.plan" class="flex flex-wrap gap-2" aria-label="Where you are">
      <li
        v-for="i in steps"
        :key="i"
        :aria-current="i === store.stepIndex ? 'step' : undefined"
        :class="[
          'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-4 text-base font-bold',
          i < store.stepIndex
            ? 'bg-emerald-700 text-white'
            : i === store.stepIndex
              ? 'bg-indigo-700 text-white ring-4 ring-indigo-200'
              : 'bg-slate-200 text-slate-800',
        ]"
      >
        <span aria-hidden="true">{{ i < store.stepIndex ? '✓' : i + 1 }}</span>
        <span class="sr-only">Step {{ i + 1 }}{{ i < store.stepIndex ? ', done' : i === store.stepIndex ? ', you are here' : '' }}</span>
      </li>
    </ol>

    <div :key="`m${replay}`" class="space-y-4">
      <p v-if="mode === 'question' && icon !== '●'" class="text-5xl" aria-hidden="true">{{ icon }}</p>
      <div v-for="(m, i) in meanings" :key="i" class="space-y-1">
        <div class="flex flex-wrap items-end gap-2" role="img" :aria-label="meaningLabel(m)">
          <span
            v-for="w in m.wholes"
            :key="`w${w}`"
            class="seg flex h-10 w-20 rounded-lg border-2 border-slate-700 bg-emerald-300 sm:h-12 sm:w-28"
            :style="{ animationDelay: `${(i * 4 + w) * 100}ms` }"
          />
          <span v-if="m.num > 0" class="flex h-14 w-full max-w-xs overflow-hidden rounded-lg border-2 border-slate-700 bg-white sm:h-16">
            <span
              v-for="p in m.den"
              :key="p"
              :class="[
                'seg flex flex-1 items-center justify-center border-l-2 border-slate-700 text-lg font-bold first:border-l-0 sm:text-xl',
                p <= m.num ? 'bg-emerald-300 text-slate-900' : 'bg-white',
              ]"
              :style="{ animationDelay: `${(i * 4 + m.wholes + p) * 250}ms` }"
            >
              <span v-if="p <= m.num" aria-hidden="true">{{ p }}</span>
            </span>
          </span>
        </div>
        <p class="flex items-center gap-2 text-4xl font-bold text-slate-900" aria-hidden="true">
          <span v-if="m.wholes > 0 || m.num === 0">{{ m.wholes }}</span>
          <span v-if="m.num > 0" class="flex flex-col items-center text-3xl leading-tight">
            <span>{{ m.num }}</span>
            <span class="my-0.5 h-1 w-full rounded bg-slate-900" />
            <span>{{ m.den }}</span>
          </span>
        </p>
      </div>
    </div>

    <div v-if="picture" :key="`p${replay}`">
      <GroupsPicture
        v-if="picture.kind !== 'line'"
        :mode="picture.kind"
        :boxes="picture.boxes"
        :count="picture.count"
        :icon="icon"
        :label="picture.label"
      />
      <NumberLinePicture
        v-else
        :max="picture.max"
        :hops="picture.hops"
        :start="picture.start"
        :end="picture.end"
        :label="picture.label"
      />
    </div>

    <div v-else-if="bars.length" :key="replay" role="img" :aria-label="summary" class="space-y-4">
      <div v-for="(bar, row) in bars" :key="row" class="space-y-1">
        <p class="text-base font-semibold text-slate-800">{{ bar.caption }}</p>
        <div class="flex h-12 w-full overflow-hidden rounded-lg border-2 border-slate-700 sm:h-14">
          <span
            v-for="(seg, s) in bar.segs"
            :key="s"
            :style="{ width: `${seg.width}%`, animationDelay: `${(row * bar.segs.length + s) * 120}ms` }"
            :class="[
              'seg flex min-w-0 items-center justify-center border-l-2 border-slate-700 px-1 text-lg font-bold text-slate-900 first:border-l-0 sm:text-2xl',
              TONE[seg.tone],
            ]"
          >
            <span class="truncate">{{ seg.label }}</span>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.seg {
  transform-origin: left center;
}
@media (prefers-reduced-motion: no-preference) {
  .seg {
    animation: grow 0.5s ease-out both;
  }
}
@keyframes grow {
  from {
    transform: scaleX(0);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}
</style>
