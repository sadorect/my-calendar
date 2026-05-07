import { ref, computed } from 'vue'

const MAX_HISTORY = 20

// Module-level stacks so undo/redo is shared across components
const undoStack = ref([])
const redoStack = ref([])

export function useHistory() {
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  /**
   * Record a reversible action.
   * @param {object} command - { label, undo: async fn, redo: async fn }
   */
  function record(command) {
    undoStack.value.push(command)
    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value.shift()
    }
    // Any new action clears the redo stack
    redoStack.value = []
  }

  async function undo() {
    if (!canUndo.value) return
    const command = undoStack.value.pop()
    await command.undo()
    redoStack.value.push(command)
  }

  async function redo() {
    if (!canRedo.value) return
    const command = redoStack.value.pop()
    await command.redo()
    undoStack.value.push(command)
  }

  function clearHistory() {
    undoStack.value = []
    redoStack.value = []
  }

  return { canUndo, canRedo, record, undo, redo, clearHistory }
}
