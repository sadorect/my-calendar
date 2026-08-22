<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import { weekOfPregnancy } from '../../services/pregnancyTimeline.js'
import { monthPalette, monthForDay } from '../../data/pregnancy/index.js'
import {
  declarationCardBlob,
  cardFileName,
  canShareImage
} from '../../services/declarationImage.js'

const props = defineProps({
  day: { type: Number, required: true },
  content: { type: Object, required: true },
  babyName: { type: String, default: 'your little one' },
  prominent: { type: Boolean, default: false }
})
const emit = defineEmits(['open'])

const store = usePregnancyStore()
const speaking = ref(false)
const shareNote = ref('')
let utterance = null

const isFavourite = computed(() => store.isFavourite('day', props.day))
const isSpoken = computed(() => store.isSpoken(props.day))

// Content is written with "Little one" as the address; the store swaps in the
// chosen name. Done here too because the card is also handed raw content.
const body = computed(() => store.personalise(props.content.body))

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function speak() {
  if (!speechSupported) return
  if (speaking.value) {
    window.speechSynthesis.cancel()
    speaking.value = false
    return
  }
  utterance = new window.SpeechSynthesisUtterance(
    `${body.value} ${props.content.scripture.text} ${props.content.scripture.ref}`
  )
  // Slower and slightly lower than default: this is meant to be spoken over a
  // baby, not read out like a notification.
  utterance.rate = 0.85
  utterance.pitch = 1.0
  utterance.onend = () => (speaking.value = false)
  utterance.onerror = () => (speaking.value = false)
  speaking.value = true
  window.speechSynthesis.speak(utterance)
}

onBeforeUnmount(() => {
  if (speechSupported && speaking.value) window.speechSynthesis.cancel()
})

const shareText = computed(
  () => `${body.value}\n\n“${props.content.scripture.text}”\n— ${props.content.scripture.ref}`
)

const sharingImage = ref(false)

function flash(message) {
  shareNote.value = message
  setTimeout(() => (shareNote.value = ''), 2200)
}

/** The card image, rendered in the palette of the month the day belongs to. */
function cardMeta() {
  return {
    dayLabel: `Day ${props.day}`,
    weekLabel: `Week ${weekOfPregnancy(props.day)}`,
    palette: monthPalette(monthForDay(props.day)),
    babyName: store.state.babyName?.trim() || ''
  }
}

async function cardBlob() {
  return declarationCardBlob(
    { title: props.content.title, body: body.value, scripture: props.content.scripture },
    cardMeta()
  )
}

/**
 * Shares the declaration as an image where the platform supports it, and falls
 * back through text share, then a download, then the clipboard. Every path
 * leaves the user with something they can actually send.
 */
async function share() {
  if (sharingImage.value) return
  shareNote.value = ''
  sharingImage.value = true
  try {
    if (canShareImage()) {
      const blob = await cardBlob()
      const file = new File([blob], cardFileName(`day-${props.day}`), { type: 'image/png' })
      // Some platforms drop the text when files are present; the image carries
      // the words anyway, so this is a hint, not a loss.
      await navigator.share({ files: [file], title: props.content.title })
      return
    }
    if (navigator.share) {
      await navigator.share({ title: props.content.title, text: shareText.value })
      return
    }
    await navigator.clipboard.writeText(shareText.value)
    flash('Copied')
  } catch (e) {
    // A user dismissing the share sheet throws AbortError — not an error worth
    // showing them.
    if (e?.name !== 'AbortError') flash('Could not share')
  } finally {
    sharingImage.value = false
  }
}

/** Saves the card as a PNG — the keepsake path, and the desktop fallback. */
async function saveImage() {
  if (sharingImage.value) return
  sharingImage.value = true
  try {
    const blob = await cardBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = cardFileName(`day-${props.day}`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    flash('Image saved')
  } catch {
    flash('Could not make the image')
  } finally {
    sharingImage.value = false
  }
}
</script>

<template>
  <article
    class="bc-card overflow-hidden animate-gentle-rise"
    :class="prominent ? 'p-7 sm:p-8' : 'p-5'"
  >
    <header class="flex items-start justify-between gap-3 mb-4">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-1">Day {{ day }}</p>
        <h2 class="font-serif leading-snug" :class="prominent ? 'text-2xl sm:text-3xl' : 'text-lg'">
          {{ content.title }}
        </h2>
      </div>
      <button
        class="bc-tap shrink-0 flex items-center justify-center rounded-full transition hover:scale-110"
        :aria-label="isFavourite ? 'Remove from favourites' : 'Save to favourites'"
        :aria-pressed="isFavourite"
        @click="store.toggleFavourite('day', day)"
      >
        <svg
          class="w-6 h-6"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          :fill="isFavourite ? 'var(--bc-accent)' : 'none'"
          :stroke="isFavourite ? 'var(--bc-accent)' : 'currentColor'"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 21s-6.5-4.35-8.5-8A4.5 4.5 0 0112 7.5 4.5 4.5 0 0120.5 13c-2 3.65-8.5 8-8.5 8z"
          />
        </svg>
      </button>
    </header>

    <p class="bc-scripture mb-5" :class="prominent ? 'text-lg sm:text-xl' : 'text-base'">
      {{ body }}
    </p>

    <blockquote class="pl-4 border-l-2 mb-6" :style="{ borderColor: 'var(--bc-accent)' }">
      <p class="bc-scripture text-sm italic">“{{ content.scripture.text }}”</p>
      <footer class="text-xs bc-accent mt-1.5 not-italic">{{ content.scripture.ref }}</footer>
    </blockquote>

    <div class="flex flex-wrap items-center gap-2">
      <button
        class="bc-tap px-4 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
        :style="{ backgroundColor: 'var(--bc-accent)' }"
        :disabled="!speechSupported"
        :title="speechSupported ? '' : 'Your browser does not support speech'"
        @click="speak"
      >
        {{ speaking ? 'Stop' : 'Speak this over your baby' }}
      </button>

      <button
        class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70 flex items-center gap-2"
        :style="{
          borderColor: isSpoken ? 'var(--bc-accent)' : 'var(--bc-hairline)',
          color: isSpoken ? 'var(--bc-accent)' : 'inherit'
        }"
        :aria-pressed="isSpoken"
        @click="store.toggleSpoken(day)"
      >
        <svg
          v-if="isSpoken"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {{ isSpoken ? 'Spoken today' : 'Mark as spoken' }}
      </button>

      <button
        class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70 disabled:opacity-50"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        :disabled="sharingImage"
        @click="share"
      >
        {{ shareNote || 'Share' }}
      </button>

      <button
        v-if="prominent"
        class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70 disabled:opacity-50"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        :disabled="sharingImage"
        title="Save this declaration as an image"
        @click="saveImage"
      >
        Save image
      </button>

      <button
        v-if="prominent"
        class="bc-tap px-4 py-2.5 rounded-xl text-sm bc-accent hover:opacity-70 transition ml-auto"
        @click="emit('open')"
      >
        Journal →
      </button>
    </div>
  </article>
</template>
