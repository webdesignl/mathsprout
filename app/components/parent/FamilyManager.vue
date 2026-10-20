<script setup lang="ts">
import { useChildStore, type Child } from '../../stores/child'
import { avatarOf } from '../../utils/avatars'
import AvatarPicker from './AvatarPicker.vue'

const client = useSupabaseClient()
const childStore = useChildStore()
const { fetchChildren } = useChildren()

const familyName = useState<string>('family-name', () => '')
const nameInput = ref('')
const message = ref('')
const newName = ref('')
const newGrade = ref<number | null>(null)
const newAvatar = ref<string | null>(null)
const editAvatar = ref<string | null>(null)
const editing = ref<string | null>(null)
const editName = ref('')
const editGrade = ref<number | null>(null)
const confirmDelete = ref<string | null>(null)

const emit = defineEmits<{ signout: [] }>()
const blocked = 'Could not save. Is parent mode still on?'

async function load() {
  const data = await fetchChildren()
  if (!data) return
  childStore.setChildren(data)
  const { data: family } = await client.from('families').select('name').maybeSingle()
  familyName.value = family?.name ?? ''
  nameInput.value = familyName.value
}
onMounted(load)

async function rename() {
  message.value = ''
  const name = nameInput.value.trim()
  const { data: id } = await client.rpc('my_family_id')
  if (!name || typeof id !== 'string') return
  const { error } = await client.from('families').update({ name }).eq('id', id)
  if (!error) familyName.value = name
  message.value = error ? blocked : 'Saved.'
}

async function add() {
  message.value = ''
  const nickname = newName.value.trim()
  const { data: family } = await client.rpc('my_family_id')
  if (!nickname || typeof family !== 'string') return
  const { error } = await client.from('children').insert({ family_id: family, nickname, grade: newGrade.value, avatar: newAvatar.value })
  if (error) message.value = blocked
  else {
    newName.value = ''
    newGrade.value = null
    newAvatar.value = null
    await load()
  }
}

function startEdit(c: Child) {
  editing.value = c.id
  editName.value = c.nickname
  editGrade.value = c.grade
  editAvatar.value = c.avatar ?? null
}

async function saveEdit() {
  if (!editing.value) return
  const { error } = await client.from('children').update({ nickname: editName.value.trim(), grade: editGrade.value, avatar: editAvatar.value }).eq('id', editing.value)
  if (error) message.value = blocked
  else {
    editing.value = null
    await load()
  }
}

async function remove(id: string) {
  const { error } = await client.from('children').delete().eq('id', id)
  confirmDelete.value = null
  if (error) message.value = blocked
  else await load()
}

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-lg font-bold'
const ghost = `${button} bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100`
const input = 'min-h-12 rounded-xl border-2 border-slate-600 bg-white px-4 text-xl text-slate-900'
</script>

<template>
  <div class="space-y-6">
    <p v-if="message" role="status" class="text-lg font-semibold text-slate-900">{{ message }}</p>

    <section aria-labelledby="family" class="space-y-3 rounded-2xl bg-white p-5">
      <h2 id="family" class="text-2xl font-bold">Family account</h2>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="rename">
        <div class="space-y-1">
          <label for="family-name" class="text-lg font-semibold">Family name</label>
          <input id="family-name" v-model="nameInput" maxlength="60" :class="input">
        </div>
        <button type="submit" :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']">Rename</button>
      </form>
    </section>

    <section aria-labelledby="children" class="space-y-4 rounded-2xl bg-white p-5">
      <h2 id="children" class="text-2xl font-bold">Children</h2>
      <p class="text-lg text-slate-700">Nicknames only.</p>
      <ul class="space-y-4">
        <li v-for="c in childStore.children" :key="c.id" class="space-y-2 rounded-xl border-2 border-slate-300 p-4">
          <form v-if="editing === c.id" class="flex flex-wrap items-end gap-3" @submit.prevent="saveEdit">
            <label class="space-y-1 text-lg font-semibold">Nickname<input v-model="editName" maxlength="30" required :class="[input, 'block']"></label>
            <label class="space-y-1 text-lg font-semibold">Grade<input v-model.number="editGrade" type="number" min="1" max="12" :class="[input, 'block w-24']"></label>
            <AvatarPicker v-model="editAvatar" label="Pick an animal" class="w-full" />
            <button type="submit" :class="[button, 'bg-emerald-700 text-white']">Save</button>
            <button type="button" :class="ghost" @click="editing = null">Cancel</button>
          </form>
          <div v-else class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-xl font-bold text-slate-900"><span aria-hidden="true" class="mr-2 text-3xl">{{ avatarOf(c.avatar) }}</span>{{ c.nickname }}<span v-if="c.grade" class="font-normal"> · Grade {{ c.grade }}</span></p>
            <div class="flex flex-wrap gap-2">
              <button type="button" :class="ghost" :aria-label="`Edit ${c.nickname}`" @click="startEdit(c)">Edit</button>
              <button v-if="confirmDelete !== c.id" type="button" :class="ghost" :aria-label="`Delete ${c.nickname}`" @click="confirmDelete = c.id">Delete</button>
              <template v-else>
                <button type="button" :class="[button, 'bg-red-700 text-white']" :aria-label="`Yes, delete ${c.nickname} and all attempts`" @click="remove(c.id)">Yes, delete</button>
                <button type="button" :class="ghost" @click="confirmDelete = null">Keep</button>
              </template>
            </div>
          </div>
        </li>
      </ul>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="add">
        <label class="space-y-1 text-lg font-semibold">New child’s nickname<input v-model="newName" maxlength="30" required :class="[input, 'block']"></label>
        <label class="space-y-1 text-lg font-semibold">Grade<input v-model.number="newGrade" type="number" min="1" max="12" :class="[input, 'block w-24']"></label>
        <AvatarPicker v-model="newAvatar" label="Pick an animal" class="w-full" />
        <button type="submit" :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']">Add</button>
      </form>
    </section>

    <div class="rounded-2xl bg-white p-5">
      <button type="button" :class="ghost" @click="emit('signout')">Sign out</button>
    </div>
  </div>
</template>
