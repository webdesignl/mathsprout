<script setup lang="ts">
import { DEMO_HOURS } from '../utils/demo'

useHead({ title: 'Privacy · MathSprout' })

const contactEmail = String(useRuntimeConfig().public.contactEmail ?? '')
</script>

<template>
  <article class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-[clamp(1.75rem,4vw+1rem,2.5rem)] font-bold text-emerald-900">Privacy</h1>
    <p class="text-base text-slate-900">
      MathSprout is a personal project: a math practice app made for one family. This page says in plain words what it keeps.
    </p>

    <section class="space-y-2" aria-labelledby="demo">
      <h2 id="demo" class="text-xl font-bold text-slate-900">If you try the demo</h2>
      <ul class="list-disc space-y-1 pl-6 text-base text-slate-900">
        <li>You get a private sandbox with sample data and a child called Sprout. No one else can see it.</li>
        <li>Nothing you do is kept longer than {{ DEMO_HOURS }} hours. After that the sandbox and everything in it is deleted.</li>
        <li>Please do not type real names or personal details. Use made-up nicknames.</li>
        <li>No email is asked for, and no photos are stored.</li>
        <li>The tutor uses a sample problem and canned answers. Nothing you type is sent to an AI.</li>
      </ul>
    </section>

    <section class="space-y-2" aria-labelledby="family">
      <h2 id="family" class="text-xl font-bold text-slate-900">For the family this app is made for</h2>
      <ul class="list-disc space-y-1 pl-6 text-base text-slate-900">
        <li>What is stored: the parent's email, a child's nickname and emoji, tasks, practice and quiz results, stars and ideas. Never a full name, school or photo of a child.</li>
        <li>It is kept until a parent deletes it. Only that family can read it; the database enforces this.</li>
        <li>The parent PIN is never stored as typed. Only a scrambled version is kept.</li>
        <li>The tutor may send a homework problem (the numbers and the child's work, or a photo of the problem) to an AI service to get a hint question. Names, email addresses and phone numbers are removed first. The app does not store the photo. Code, not AI, decides whether an answer is right.</li>
      </ul>
    </section>

    <section class="space-y-2" aria-labelledby="who">
      <h2 id="who" class="text-xl font-bold text-slate-900">Who handles the data</h2>
      <ul class="list-disc space-y-1 pl-6 text-base text-slate-900">
        <li>Supabase stores the data and runs sign-in.</li>
        <li>Vercel hosts the website.</li>
        <li>Cloudflare Turnstile checks that a demo visitor is a person, not a bot.</li>
        <li>Anthropic provides the AI behind the tutor, for the family account only.</li>
      </ul>
    </section>

    <section class="space-y-2" aria-labelledby="browser">
      <h2 id="browser" class="text-xl font-bold text-slate-900">In your browser</h2>
      <p class="text-base text-slate-900">
        The site keeps your sign-in session, the child you picked, and which Deep Check topics are open. There are no advertising or tracking cookies.
      </p>
    </section>

    <section class="space-y-2" aria-labelledby="contact">
      <h2 id="contact" class="text-xl font-bold text-slate-900">Questions or deletion</h2>
      <p v-if="contactEmail" class="text-base text-slate-900">
        Write to <a :href="`mailto:${contactEmail}`" class="font-semibold text-emerald-900 underline">{{ contactEmail }}</a>.
      </p>
      <p v-else class="text-base text-slate-900">Contact details will be added here before this site is shared publicly.</p>
    </section>
  </article>
</template>
