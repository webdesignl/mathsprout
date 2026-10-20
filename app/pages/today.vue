<script setup lang="ts">
import { useChildStore } from '../stores/child'
import { kindLabel, startClock } from '../utils/todayPlan'

useHead({ title: 'Today · MathSprout' })

const user = useSupabaseUser()
const childStore = useChildStore()
const childId = computed(() => childStore.selectedId)
const { day, allDone, dayStar, context, load, loaded, failed, complete, uncomplete, add } = useTodayData(childId)

// A parent may give the star while this page is open on another device; check again when she comes back to it.
function refresh() {
  if (document.visibilityState === 'visible' && allDone.value && !dayStar.value) void load()
}
onMounted(() => document.addEventListener('visibilitychange', refresh))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', refresh))
const { templates } = useTaskTemplates(childId)
const openTitles = computed(() => day.value.filter((t) => !t.done).map((t) => t.title))
/** The first task she has not finished: that is the one to do next. */
const nextId = computed(() => day.value.find((t) => !t.done)?.id ?? null)
const message = ref('')

/** Ticking works like a shopping list: tick to cross out, tick again to bring it back. */
async function toggle(task: { id: string; done: boolean }) {
  message.value = ''
  const ok = task.done ? await uncomplete(task.id) : await complete(task.id)
  if (!ok) message.value = 'Could not save that. Try again.'
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <h1 class="text-4xl font-bold text-emerald-900">Today</h1>

    <p v-if="!user" class="text-xl text-slate-900">
      <NuxtLink to="/login" class="font-semibold text-emerald-900 underline">A parent can sign in</NuxtLink> to see today’s list.
    </p>
    <p v-else-if="!childStore.selected" class="text-xl text-slate-900">
      Pick who’s practicing on the <NuxtLink to="/" class="font-semibold text-emerald-900 underline">home page</NuxtLink>.
    </p>
    <p v-else-if="failed" role="alert" class="text-xl text-red-800">Could not load today’s list. Check your connection.</p>

    <template v-else-if="loaded">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="min-w-0 space-y-6">
      <p v-if="allDone" role="status" class="rounded-2xl bg-emerald-100 p-4 text-2xl font-bold text-emerald-950">
        <span aria-hidden="true">🎉</span> All done for today. Great work!
        <span v-if="dayStar" class="block text-xl font-semibold"><span aria-hidden="true">⭐</span> You earned a star for finishing the day.</span>
        <span v-else class="block text-xl font-semibold">Your parent will take a look and give you a star.</span>
      </p>

      <section aria-labelledby="todo" class="space-y-3">
        <h2 id="todo" class="sr-only">Today’s list</h2>
        <p v-if="day.length === 0" class="rounded-2xl bg-white p-5 text-xl text-slate-900">
          Nothing on the list yet. Add your first task below.
        </p>
        <ol v-else class="space-y-3">
          <li
            v-for="(task, i) in day"
            :key="task.id"
            class="flex items-center gap-4 rounded-2xl p-4"
            :class="[task.done ? 'bg-slate-100' : 'bg-white', task.id === nextId ? 'ring-4 ring-emerald-600' : '']"
          >
            <span
              class="flex size-12 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
              :class="task.done ? 'bg-slate-500' : 'bg-emerald-700'"
              :aria-label="`Number ${i + 1}`"
            >{{ i + 1 }}</span>
            <label :for="`task-${task.id}`" class="min-w-0 flex-1 cursor-pointer">
              <span class="block text-2xl font-bold" :class="task.done ? 'text-slate-600 line-through decoration-2' : 'text-slate-900'">
                {{ task.title }}
              </span>
              <span class="mt-1 flex flex-wrap items-center gap-2 text-lg text-slate-700">
                <span v-if="startClock(task, context.today)" class="rounded-full bg-amber-100 px-3 py-0.5 font-semibold text-amber-950">
                  <span aria-hidden="true">⏰</span> {{ startClock(task, context.today) }}
                </span>
                <span v-if="task.id === nextId" class="rounded-full bg-emerald-100 px-3 py-0.5 font-semibold text-emerald-950">Do this next</span>
                <span v-if="!task.done && task.seen_by_parent === false" class="rounded-full bg-slate-100 px-3 py-0.5 text-slate-800">Sent to your parent</span>
                <span>{{ kindLabel(task.kind) }}<template v-if="task.minutes"> · {{ task.minutes }} min</template> · {{ task.reason }}</span>
              </span>
              <span v-if="task.note" class="mt-1 block text-lg text-slate-900">
                <span class="font-semibold">Note from your parent:</span> {{ task.note }}
              </span>
            </label>
            <input
              :id="`task-${task.id}`"
              type="checkbox"
              class="size-9 shrink-0 accent-emerald-700"
              :checked="task.done"
              :aria-label="task.done ? `Done: ${task.title}. Tap to undo` : `Mark done: ${task.title}`"
              @change="toggle(task)"
            >
          </li>
        </ol>
        <p v-if="message" role="alert" class="text-lg font-semibold text-red-800">{{ message }}</p>
      </section>

      <section aria-labelledby="my-homework" class="space-y-3 rounded-2xl bg-white p-5">
        <h2 id="my-homework" class="text-2xl font-bold text-slate-900">My homework</h2>
        <p class="text-lg text-slate-700">Type each thing you need to do. Your parent will see it.</p>
        <HomeworkChecklist :add="add" />
      </section>

        </div>
        <aside class="space-y-6 lg:sticky lg:top-4 lg:self-start" aria-label="Add tasks">
      <section v-if="templates.length" aria-labelledby="quick" class="space-y-3 rounded-2xl bg-white p-5">
        <h2 id="quick" class="text-2xl font-bold text-slate-900">My usual tasks</h2>
        <p class="text-lg text-slate-700">Tap one to add it to today.</p>
        <QuickAdd stacked :templates="templates" :open-titles="openTitles" :add="add" />
      </section>

      <section aria-labelledby="add-task" class="space-y-3 rounded-2xl bg-white p-5">
        <h2 id="add-task" class="text-2xl font-bold text-slate-900">What’s not on the list?</h2>
        <TaskAdder :add="add" />
      </section>
        </aside>
      </div>
    </template>
  </div>
</template>
