<script setup>
import { computed, ref } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'

/**
 * The prayer journal: what the family is praying for, and what was answered.
 *
 * Family-scoped, so it reads every child's prayers at once; the child chip on
 * each entry says whose it is. An entry that grew from a declaration keeps a
 * link back to it.
 */
const store = usePregnancyStore()
const emit = defineEmits(['close', 'open-source'])

const draft = ref('')
const draftProfileId = ref('')
const editingId = ref(null)
const editText = ref('')
const answeringId = ref(null)
const answerText = ref('')
const confirmingDelete = ref(null)

const children = computed(() => store.profiles)

function childName(prayer) {
  if (!prayer.profileId) return null
  const profile = store.profiles.find((p) => p.id === prayer.profileId)
  if (!profile) return null
  return profile.name?.trim() || (profile.kind === 'womb' ? 'Baby' : 'Child')
}

function when(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

async function add() {
  const prayer = await store.addPrayer({
    text: draft.value,
    profileId: draftProfileId.value || null
  })
  if (prayer) draft.value = ''
}

function startEdit(prayer) {
  editingId.value = prayer.id
  editText.value = prayer.text
  answeringId.value = null
}

async function saveEdit(id) {
  if (await store.updatePrayer(id, { text: editText.value })) editingId.value = null
}

function startAnswer(prayer) {
  answeringId.value = prayer.id
  answerText.value = prayer.answer || ''
  editingId.value = null
}

async function saveAnswer(id) {
  await store.markAnswered(id, answerText.value)
  answeringId.value = null
  answerText.value = ''
}

async function remove(id) {
  await store.deletePrayer(id)
  confirmingDelete.value = null
}
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto" data-testid="prayer-journal">
    <div class="flex items-start justify-between gap-3 mb-1">
      <h1 class="font-serif text-2xl">Prayer journal</h1>
      <button
        class="bc-tap text-sm bc-accent px-2 -mr-2"
        type="button"
        aria-label="Back"
        @click="emit('close')"
      >
        ← Back
      </button>
    </div>
    <p class="text-sm bc-muted mb-6">
      What you are asking for, kept in one place — and what was answered, so you can look back.
    </p>

    <!-- New prayer -->
    <form class="bc-card p-4 mb-8 space-y-3" @submit.prevent="add">
      <label for="bc-prayer-draft" class="sr-only">A new prayer</label>
      <textarea
        id="bc-prayer-draft"
        v-model="draft"
        rows="3"
        placeholder="What are you praying for?"
        class="bc-field bc-tap w-full px-4 py-3 text-sm"
      />
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-if="children.length"
          v-model="draftProfileId"
          class="bc-field bc-tap px-3 py-2 text-sm flex-1 min-w-0"
          aria-label="Who this prayer is for"
        >
          <option value="">For the whole family</option>
          <option v-for="child in children" :key="child.id" :value="child.id">
            For {{ child.name?.trim() || (child.kind === 'womb' ? 'Baby' : 'this child') }}
          </option>
        </select>
        <button
          type="submit"
          class="bc-tap px-5 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-40"
          :style="{ backgroundColor: 'var(--bc-accent)' }"
          :disabled="!draft.trim()"
        >
          Add prayer
        </button>
      </div>
    </form>

    <!-- Praying -->
    <section class="mb-10">
      <h2 class="font-serif text-xl mb-1">Praying</h2>
      <p class="text-sm bc-muted mb-4">
        {{
          store.openPrayers.length
            ? `${store.openPrayers.length} still open.`
            : 'Nothing open right now.'
        }}
      </p>

      <p v-if="!store.openPrayers.length" class="bc-card p-8 text-center bc-muted text-sm">
        Write the first one above. A prayer kept is a prayer remembered.
      </p>

      <ul v-else class="space-y-3">
        <li v-for="prayer in store.openPrayers" :key="prayer.id">
          <article class="bc-card p-5" :data-prayer-id="prayer.id">
            <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-1.5 flex flex-wrap gap-x-2">
              <span>{{ when(prayer.createdAt) }}</span>
              <span v-if="childName(prayer)">· {{ childName(prayer) }}</span>
              <button
                v-if="prayer.source"
                type="button"
                class="bc-accent normal-case tracking-normal hover:underline"
                @click="emit('open-source', prayer.source)"
              >
                · {{ prayer.source.title || 'From a declaration' }}
              </button>
            </p>

            <template v-if="editingId === prayer.id">
              <textarea
                v-model="editText"
                rows="3"
                class="bc-field bc-tap w-full px-4 py-3 text-sm mb-2"
                aria-label="Edit this prayer"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  class="bc-tap px-4 py-2 rounded-xl text-sm text-white"
                  :style="{ backgroundColor: 'var(--bc-accent)' }"
                  @click="saveEdit(prayer.id)"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="bc-tap px-4 py-2 rounded-xl text-sm border hover:opacity-70"
                  :style="{ borderColor: 'var(--bc-hairline)' }"
                  @click="editingId = null"
                >
                  Cancel
                </button>
              </div>
            </template>

            <template v-else-if="answeringId === prayer.id">
              <p class="bc-scripture text-sm mb-3 whitespace-pre-line">{{ prayer.text }}</p>
              <label :for="`bc-answer-${prayer.id}`" class="text-sm font-medium block mb-1">
                How was it answered?
              </label>
              <textarea
                :id="`bc-answer-${prayer.id}`"
                v-model="answerText"
                rows="2"
                placeholder="Optional — but you will be glad you wrote it down."
                class="bc-field bc-tap w-full px-4 py-3 text-sm mb-2"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  class="bc-tap px-4 py-2 rounded-xl text-sm text-white"
                  :style="{ backgroundColor: 'var(--bc-accent)' }"
                  @click="saveAnswer(prayer.id)"
                >
                  Mark answered
                </button>
                <button
                  type="button"
                  class="bc-tap px-4 py-2 rounded-xl text-sm border hover:opacity-70"
                  :style="{ borderColor: 'var(--bc-hairline)' }"
                  @click="answeringId = null"
                >
                  Not yet
                </button>
              </div>
            </template>

            <template v-else-if="confirmingDelete === prayer.id">
              <p class="text-sm mb-2">Remove this prayer? This cannot be undone.</p>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="bc-tap px-4 py-2 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700"
                  @click="remove(prayer.id)"
                >
                  Remove it
                </button>
                <button
                  type="button"
                  class="bc-tap px-4 py-2 rounded-xl text-sm border hover:opacity-70"
                  :style="{ borderColor: 'var(--bc-hairline)' }"
                  @click="confirmingDelete = null"
                >
                  Keep it
                </button>
              </div>
            </template>

            <template v-else>
              <p class="bc-scripture text-sm mb-3 whitespace-pre-line">{{ prayer.text }}</p>
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <button
                  type="button"
                  class="bc-accent font-medium hover:underline"
                  @click="startAnswer(prayer)"
                >
                  Answered
                </button>
                <button type="button" class="bc-muted hover:underline" @click="startEdit(prayer)">
                  Edit
                </button>
                <button
                  type="button"
                  class="bc-muted hover:underline"
                  @click="confirmingDelete = prayer.id"
                >
                  Remove
                </button>
              </div>
            </template>
          </article>
        </li>
      </ul>
    </section>

    <!-- Answered -->
    <section v-if="store.answeredPrayers.length">
      <h2 class="font-serif text-xl mb-1">Answered</h2>
      <p class="text-sm bc-muted mb-4">{{ store.answeredPrayers.length }} to be thankful for.</p>
      <ul class="space-y-3">
        <li v-for="prayer in store.answeredPrayers" :key="prayer.id">
          <article class="bc-card p-5" :data-prayer-id="prayer.id">
            <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-1.5 flex flex-wrap gap-x-2">
              <span>Asked {{ when(prayer.createdAt) }}</span>
              <span>· answered {{ when(prayer.answeredAt) }}</span>
              <span v-if="childName(prayer)">· {{ childName(prayer) }}</span>
            </p>
            <p class="bc-scripture text-sm mb-2 whitespace-pre-line">{{ prayer.text }}</p>
            <p
              v-if="prayer.answer"
              class="text-sm whitespace-pre-line pl-3 border-l-2"
              :style="{ borderColor: 'var(--bc-accent)' }"
            >
              {{ prayer.answer }}
            </p>
            <template v-if="confirmingDelete === prayer.id">
              <p class="text-sm mt-3 mb-2">Remove this prayer? This cannot be undone.</p>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="bc-tap px-4 py-2 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700"
                  @click="remove(prayer.id)"
                >
                  Remove it
                </button>
                <button
                  type="button"
                  class="bc-tap px-4 py-2 rounded-xl text-sm border hover:opacity-70"
                  :style="{ borderColor: 'var(--bc-hairline)' }"
                  @click="confirmingDelete = null"
                >
                  Keep it
                </button>
              </div>
            </template>
            <div v-else class="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-3">
              <button
                type="button"
                class="bc-muted hover:underline"
                @click="store.reopenPrayer(prayer.id)"
              >
                Still praying
              </button>
              <button
                type="button"
                class="bc-muted hover:underline"
                @click="confirmingDelete = prayer.id"
              >
                Remove
              </button>
            </div>
          </article>
        </li>
      </ul>
    </section>
  </div>
</template>
