<script setup>
import { ref } from 'vue'

const count = ref(0)

function increment() {
  count.value++
}
</script>

<template>
  <div class="welcome">
    <h1>Welcome to Personal Calendar</h1>
    <p>Start building your productivity app.</p>
    <button @click="increment">Count: {{ count }}</button>
  </div>
</template>

<style scoped>
.welcome {
  text-align: center;
}
</style>
