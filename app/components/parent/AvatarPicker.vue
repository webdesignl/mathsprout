<script setup lang="ts">
import { AVATARS } from '../../utils/avatars'

defineProps<{ modelValue: string | null; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <fieldset class="space-y-1">
    <legend class="text-lg font-semibold">{{ label }}</legend>
    <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="label">
      <button
        v-for="a in AVATARS"
        :key="a.emoji"
        type="button"
        role="radio"
        :aria-checked="modelValue === a.emoji"
        :aria-label="a.name"
        class="size-14 rounded-xl text-3xl"
        :class="modelValue === a.emoji ? 'bg-emerald-100 ring-4 ring-emerald-700' : 'bg-white ring-2 ring-slate-400 hover:bg-slate-100'"
        @click="emit('update:modelValue', a.emoji)"
      >
        <span aria-hidden="true">{{ a.emoji }}</span>
      </button>
    </div>
  </fieldset>
</template>
