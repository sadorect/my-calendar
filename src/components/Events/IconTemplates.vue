<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h2 class="text-xl font-bold mb-6 text-center text-gray-800">Choose Event Type</h2>
    <div
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
    >
      <button
        v-for="template in eventTemplates"
        :key="template.id"
        type="button"
        :aria-label="'Select ' + template.name + ' event template'"
        class="bg-white border-2 border-gray-200 rounded-xl p-3 md:p-4 cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center min-h-[100px] md:min-h-[120px] group touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        @click="selectTemplate(template)"
      >
        <div
          class="text-3xl md:text-4xl mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-200"
        >
          {{ template.icon }}
        </div>
        <div
          class="text-xs md:text-sm font-medium text-center text-gray-700 group-hover:text-blue-600 transition-colors leading-tight"
        >
          {{ template.name }}
        </div>
        <div
          v-if="template.color"
          class="w-2 h-2 md:w-3 md:h-3 rounded-full mt-1 md:mt-2"
          :style="{ backgroundColor: template.color }"
        ></div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['select-template'])

const eventTemplates = [
  {
    id: 'work',
    name: 'Work Meeting',
    icon: '💼',
    category: 'Work Meeting',
    defaultDuration: 60,
    color: '#2196F3',
    preferredTimes: [9, 10, 11, 14, 15, 16] // 9-11 AM, 2-4 PM
  },
  {
    id: 'gym',
    name: 'Gym/Workout',
    icon: '🏋️',
    category: 'Gym/Workout',
    defaultDuration: 45,
    color: '#F44336',
    preferredTimes: [6, 7, 17, 18, 19, 20] // Early morning or evening
  },
  {
    id: 'doctor',
    name: 'Doctor',
    icon: '🏥',
    category: 'Doctor Appointment',
    defaultDuration: 30,
    color: '#4CAF50',
    requiresLocation: true,
    preferredTimes: [8, 9, 10, 11, 14, 15, 16, 17] // Morning and afternoon
  },
  {
    id: 'meal',
    name: 'Meal',
    icon: '🍽️',
    category: 'Meal/Lunch',
    defaultDuration: 60,
    color: '#FF9800',
    preferredTimes: [11, 12, 13, 18, 19, 20] // Lunch time and dinner time
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '✈️',
    category: 'Travel',
    allDay: true,
    color: '#9C27B0',
    requiresLocation: true,
    preferredTimes: [] // All day, no specific preference
  },
  {
    id: 'social',
    name: 'Social',
    icon: '👥',
    category: 'Social Event',
    defaultDuration: 120,
    color: '#E91E63',
    preferredTimes: [18, 19, 20, 21] // Evening social events
  },
  {
    id: 'study',
    name: 'Study',
    icon: '📚',
    category: 'Study Session',
    defaultDuration: 120,
    color: '#3F51B5',
    preferredTimes: [8, 9, 10, 14, 15, 16, 19, 20, 21] // Morning, afternoon, evening
  },
  {
    id: 'submission',
    name: 'Submission',
    icon: '📝',
    category: 'School Submission',
    allDay: true,
    color: '#FF5722',
    preferredTimes: [] // All day, no specific preference
  },
  {
    id: 'project',
    name: 'Project',
    icon: '🎯',
    category: 'Project Milestone',
    color: '#009688',
    preferredTimes: [9, 10, 11, 14, 15, 16] // Work hours
  },
  {
    id: 'phone',
    name: 'Phone',
    icon: '📞',
    category: 'Phone Call',
    defaultDuration: 30,
    color: '#00BCD4',
    preferredTimes: [8, 9, 10, 11, 14, 15, 16, 17] // Business hours
  },
  {
    id: 'class',
    name: 'Class',
    icon: '🎓',
    category: 'Class/Lecture',
    defaultDuration: 60,
    color: '#FFC107',
    requiresLocation: true,
    preferredTimes: [8, 9, 10, 11, 12, 13, 14, 15, 16] // School hours
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛒',
    category: 'Shopping/Errands',
    defaultDuration: 60,
    color: '#795548',
    preferredTimes: [10, 11, 12, 13, 14, 15, 16, 18, 19, 20] // Midday and evening
  },
  {
    id: 'school-runs',
    name: 'School Runs',
    icon: '🚗',
    category: 'School Runs',
    defaultDuration: 30,
    color: '#607D8B',
    requiresLocation: true,
    preferredTimes: [7, 8, 15, 16] // School start/end times
  },
  {
    id: 'other',
    name: 'Other',
    icon: '📝',
    category: 'Other',
    defaultDuration: 60,
    color: '#9E9E9E',
    preferredTimes: [9, 10, 11, 14, 15, 16] // General work hours
  }
]

function selectTemplate(template) {
  emit('select-template', template)
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
