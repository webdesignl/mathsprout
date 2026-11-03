<script setup lang="ts">
import { computed } from 'vue'
import type { SpacingPlan } from '../../utils/spacing'

/**
 * The picture for a spacing problem after `done` steps have been answered (0 shows what is given). It picks the
 * number line or the row with margins, so the page does not need to know which kind of problem this is.
 */
const props = defineProps<{ built: SpacingPlan; done: number }>()

const line = computed(() => (props.built.frame ? null : (props.built.stages[props.done - 1] ?? props.built.given)))
const frame = computed(() => (props.built.frame ? (props.built.frame.stages[props.done - 1] ?? props.built.frame.given) : null))
</script>

<template>
  <TutorSpacingFrame v-if="frame" :stage="frame" label="The row with its margins, things and gaps" />
  <TutorSpacingLine v-else-if="line" :stage="line" label="The things in a row on a number line" />
</template>
