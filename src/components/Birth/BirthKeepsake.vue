<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import {
  buildKeepsake,
  estimatePages,
  KEEPSAKE_SECTIONS,
  DEFAULT_SECTIONS
} from '../../services/keepsake.js'

const emit = defineEmits(['close'])
const store = usePregnancyStore()

const selected = ref([...DEFAULT_SECTIONS])

const keepsake = computed(() => buildKeepsake(store.state, selected.value))
const pages = computed(() => estimatePages(keepsake.value))

function toggle(id) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((s) => s !== id)
    : [...selected.value, id]
}

function print() {
  window.print()
}

// Escape closes the preview — it covers the whole app, so there must be a way
// out that does not require finding the button.
function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="keepsake-root fixed inset-0 z-50 overflow-y-auto bg-white text-neutral-900">
    <!-- Controls: on screen only, never printed -->
    <div class="keepsake-controls sticky top-0 z-10 border-b bg-white/95 backdrop-blur px-5 py-4">
      <div class="max-w-3xl mx-auto flex flex-wrap items-center gap-3">
        <h2 class="font-serif text-xl mr-auto">Keepsake</h2>
        <button
          class="bc-tap px-4 py-2.5 rounded-xl text-sm border hover:opacity-70"
          @click="emit('close')"
        >
          Close
        </button>
        <button
          class="bc-tap px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style="background-color: #c9788a"
          @click="print"
        >
          Print / Save as PDF
        </button>
      </div>

      <div class="max-w-3xl mx-auto mt-4">
        <p class="text-sm text-neutral-600 mb-3">
          Choose what to include, then print. In the print dialog, pick
          <strong>Save as PDF</strong> as the destination to keep it as a file.
        </p>
        <div class="grid sm:grid-cols-2 gap-2">
          <label
            v-for="section in KEEPSAKE_SECTIONS"
            :key="section.id"
            class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer"
          >
            <input
              type="checkbox"
              class="mt-1"
              :checked="selected.includes(section.id)"
              @change="toggle(section.id)"
            />
            <span>
              <span class="block text-sm font-medium">{{ section.label }}</span>
              <span class="block text-xs text-neutral-500">{{ section.hint }}</span>
            </span>
          </label>
        </div>
        <p class="text-xs text-neutral-500 mt-3">
          Roughly {{ pages }} {{ pages === 1 ? 'page' : 'pages' }}.
          <span v-if="pages > 60">That is a whole book — printing at home will take a while.</span>
        </p>
      </div>
    </div>

    <!-- The document itself -->
    <article class="keepsake-doc max-w-3xl mx-auto px-8 py-10">
      <section class="keepsake-cover">
        <p class="text-xs uppercase tracking-[0.3em] text-neutral-500">Womb Whispers</p>
        <h1 class="font-serif text-4xl mt-4 mb-2">
          {{ keepsake.cover.babyName || 'For Our Little One' }}
        </h1>
        <p class="text-neutral-600" v-if="keepsake.cover.dueDate">
          Expected {{ keepsake.cover.dueDate }}
        </p>
        <hr class="my-8 border-neutral-200" />
        <p class="text-sm text-neutral-600 leading-relaxed">
          Every day of this pregnancy, words were spoken over this child.
          <template v-if="keepsake.cover.spokenCount">
            {{ keepsake.cover.spokenCount }} of them were marked as spoken aloud.
          </template>
          <template v-if="keepsake.cover.journalCount">
            {{ keepsake.cover.journalCount }} days carry something written down.
          </template>
        </p>
        <p class="text-xs text-neutral-400 mt-8">Printed {{ keepsake.cover.printedOn }}</p>
      </section>

      <section v-for="section in keepsake.sections" :key="section.id" class="keepsake-section">
        <h2 class="font-serif text-2xl mb-6 keepsake-section-title">{{ section.title }}</h2>

        <!-- Favourites -->
        <template v-if="section.id === 'favourites'">
          <p v-if="!section.items.length" class="text-sm text-neutral-500">Nothing saved yet.</p>
          <div v-for="item in section.items" :key="item.key || item.label" class="keepsake-entry">
            <p class="text-xs uppercase tracking-widest text-neutral-400">
              {{ item.label }}<span v-if="item.date"> · {{ item.date }}</span>
            </p>
            <h3 class="font-serif text-lg mt-1 mb-2">{{ item.title }}</h3>
            <p class="font-serif leading-relaxed">{{ item.text }}</p>
            <p v-if="item.scripture" class="text-sm italic text-neutral-600 mt-2">
              “{{ item.scripture.text }}” — {{ item.scripture.ref }}
            </p>
          </div>
        </template>

        <!-- Journal -->
        <template v-if="section.id === 'journal'">
          <p v-if="!section.entries.length" class="text-sm text-neutral-500">
            Nothing written yet.
          </p>
          <div v-for="entry in section.entries" :key="entry.day" class="keepsake-entry">
            <p class="text-xs uppercase tracking-widest text-neutral-400">
              Day {{ entry.day }}<span v-if="entry.age"> · {{ entry.age }}</span>
              <span v-if="entry.date"> · {{ entry.date }}</span>
            </p>
            <h3 v-if="entry.declarationTitle" class="font-serif text-lg mt-1 mb-2">
              {{ entry.declarationTitle }}
            </h3>
            <p class="leading-relaxed whitespace-pre-line">{{ entry.text }}</p>
          </div>
        </template>

        <!-- Weeks -->
        <template v-if="section.id === 'weeks'">
          <div v-for="week in section.weeks" :key="week.week" class="keepsake-entry">
            <p class="text-xs uppercase tracking-widest text-neutral-400">
              Week {{ week.week }} · {{ week.monthTitle }}
            </p>
            <h3 class="font-serif text-lg mt-1 mb-2">{{ week.title }}</h3>
            <p class="font-serif leading-relaxed">{{ week.declaration }}</p>
            <p class="text-sm italic text-neutral-600 mt-3">{{ week.parentsPrayer }}</p>
          </div>
        </template>

        <!-- Every declaration -->
        <template v-if="section.id === 'declarations'">
          <div v-for="month in section.months" :key="month.month" class="keepsake-month">
            <div class="keepsake-month-title">
              <p class="text-xs uppercase tracking-[0.3em] text-neutral-400">
                Month {{ month.month }} · {{ month.weeks }}
              </p>
              <h3 class="font-serif text-2xl mt-2 mb-3">{{ month.title }}</h3>
              <p class="text-sm text-neutral-600 leading-relaxed">{{ month.intro }}</p>
              <p class="text-sm italic text-neutral-600 mt-3">
                “{{ month.keyScripture.text }}” — {{ month.keyScripture.ref }}
              </p>
            </div>
            <div v-for="day in month.days" :key="day.day" class="keepsake-entry">
              <p class="text-xs uppercase tracking-widest text-neutral-400">
                Day {{ day.day }}<span v-if="day.age"> · {{ day.age }}</span>
                <span v-if="day.date"> · {{ day.date }}</span>
              </p>
              <h4 class="font-serif text-lg mt-1 mb-2">{{ day.title }}</h4>
              <p class="font-serif leading-relaxed">{{ day.text }}</p>
              <p class="text-sm italic text-neutral-600 mt-2">
                “{{ day.scripture.text }}” — {{ day.scripture.ref }}
              </p>
            </div>
          </div>
        </template>
      </section>
    </article>
  </div>
</template>
