<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h2 class="text-xl font-bold mb-6 text-center text-gray-800">Choose Event Type</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      <div
        v-for="template in eventTemplates"
        :key="template.id"
        class="bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center min-h-[120px] group"
        @click="selectTemplate(template)"
      >
        <div class="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
          {{ template.icon }}
        </div>
        <div
          class="text-sm font-medium text-center text-gray-700 group-hover:text-blue-600 transition-colors"
        >
          {{ template.name }}
        </div>
        <div
          v-if="template.color"
          class="w-3 h-3 rounded-full mt-2"
          :style="{ backgroundColor: template.color }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineEmits } from 'vue'

const emit = defineEmits(['select-template'])

const eventTemplates = [
  {
    id: 'work',
    name: 'Work Meeting',
    icon: '💼',
    category: 'Work Meeting',
    defaultDuration: 60,
    color: '#2196F3'
  },
  {
    id: 'gym',
    name: 'Gym/Workout',
    icon: '🏋️',
    category: 'Gym/Workout',
    defaultDuration: 45,
    color: '#F44336'
  },
  {
    id: 'doctor',
    name: 'Doctor',
    icon: '🏥',
    category: 'Doctor Appointment',
    defaultDuration: 30,
    color: '#4CAF50',
    requiresLocation: true
  },
  {
    id: 'meal',
    name: 'Meal',
    icon: '🍽️',
    category: 'Meal/Lunch',
    defaultDuration: 60,
    color: '#FF9800'
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '✈️',
    category: 'Travel',
    allDay: true,
    color: '#9C27B0',
    requiresLocation: true
  },
  {
    id: 'social',
    name: 'Social',
    icon: '👥',
    category: 'Social Event',
    defaultDuration: 120,
    color: '#E91E63'
  },
  {
    id: 'study',
    name: 'Study',
    icon: '📚',
    category: 'Study Session',
    defaultDuration: 120,
    color: '#3F51B5'
  },
  {
    id: 'submission',
    name: 'Submission',
    icon: '📝',
    category: 'School Submission',
    allDay: true,
    color: '#FF5722'
  },
  { id: 'project', name: 'Project', icon: '🎯', category: 'Project Milestone', color: '#009688' },
  {
    id: 'phone',
    name: 'Phone',
    icon: '📞',
    category: 'Phone Call',
    defaultDuration: 30,
    color: '#00BCD4'
  },
  {
    id: 'class',
    name: 'Class',
    icon: '🎓',
    category: 'Class/Lecture',
    defaultDuration: 60,
    color: '#FFC107',
    requiresLocation: true
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛒',
    category: 'Shopping/Errands',
    defaultDuration: 60,
    color: '#795548'
  },
  {
    id: 'school-runs',
    name: 'School Runs',
    icon: '🚗',
    category: 'School Runs',
    defaultDuration: 30,
    color: '#607D8B',
    requiresLocation: true
  },
  {
    id: 'other',
    name: 'Other',
    icon: '📝',
    category: 'Other',
    defaultDuration: 60,
    color: '#9E9E9E'
  }
]

function selectTemplate(template) {
  emit('select-template', template)
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
