<script setup>
import { computed } from 'vue'
import { useShareApp } from '../composables/useShareApp.js'

const props = defineProps({
  /**
   * header — compact button for the desktop header bar
   * menu   — full-width row for the mobile "More" sheet
   * card   — labelled section for a settings screen
   */
  variant: { type: String, default: 'header' },
  title: { type: String, default: 'Birth Calendar' },
  text: { type: String, default: '' }
})

const { share, install, note, busy, canInstall, installed, appUrl } = useShareApp()

const label = computed(() => note.value || 'Share app')

function doShare() {
  share({ title: props.title, text: props.text || undefined })
}
</script>

<template>
  <!-- Desktop header -->
  <button
    v-if="props.variant === 'header'"
    class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium flex items-center gap-2"
    title="Share this app with someone"
    :disabled="busy"
    @click="doShare"
  >
    <span aria-hidden="true">🔗</span>
    {{ label }}
  </button>

  <!-- Mobile "More" sheet -->
  <template v-else-if="props.variant === 'menu'">
    <button
      class="w-full text-left p-4 rounded-2xl hover:bg-theme-secondary transition-colors flex items-center space-x-3"
      :disabled="busy"
      @click="doShare"
    >
      <span class="text-lg" aria-hidden="true">🔗</span>
      <span class="font-medium">{{ label }}</span>
    </button>
    <button
      v-if="canInstall"
      class="w-full text-left p-4 rounded-2xl hover:bg-theme-secondary transition-colors flex items-center space-x-3"
      @click="install"
    >
      <span class="text-lg" aria-hidden="true">⬇️</span>
      <span class="font-medium">Install app</span>
    </button>
  </template>

  <!-- Settings-style card -->
  <section v-else class="bc-card p-5">
    <h2 class="font-medium mb-1">Share this app</h2>
    <p class="text-sm bc-muted mb-4">
      Send someone the link. They can open it in a browser and install it on their phone — no app
      store, and their own data stays on their own device.
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <button
        class="bc-tap px-4 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
        :style="{ backgroundColor: 'var(--bc-accent)' }"
        :disabled="busy"
        @click="doShare"
      >
        {{ label }}
      </button>
      <button
        v-if="canInstall"
        class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        @click="install"
      >
        Install on this device
      </button>
      <span v-else-if="installed" class="text-sm bc-muted">Installed on this device.</span>
    </div>

    <p class="text-xs bc-muted mt-3 break-all">{{ appUrl() }}</p>
  </section>
</template>
