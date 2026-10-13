<script setup lang="ts">
import type { ToolId } from '../../utils/scratch'

defineProps<{ tool: ToolId }>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    class="size-8"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Pencil: long body, sharp tip, a band near the eraser end -->
    <template v-if="tool === 'pencil'">
      <path d="M4 20l1.2-4.4L16.6 4.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8 4 20Z" />
      <path d="M14.5 6.3l3.2 3.2" />
      <path d="M5.2 15.6l3.2 3.2" />
    </template>
    <!-- Pen: a nib with a slit and a round hole, like a fountain pen -->
    <template v-else-if="tool === 'pen'">
      <path d="M12 21l-4-5.5L9.5 7h5L16 15.5 12 21Z" />
      <path d="M12 21v-8" />
      <circle cx="12" cy="11" r="1.2" />
      <path d="M9.5 7V4.5h5V7" />
    </template>
    <!-- Eraser: a slanted block with a band across it -->
    <template v-else>
      <path d="M8.5 20 3.8 15.3a2 2 0 0 1 0-2.8l8.5-8.5a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L12.5 20H8.5Z" />
      <path d="M8.2 8.2l8 8" />
      <path d="M12.5 20H21" />
    </template>
  </svg>
</template>
