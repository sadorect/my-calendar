import { describe, it, expect } from 'vitest'
import { useHistory } from '@/composables/useHistory'

describe('useHistory', () => {
  it('starts with empty stacks', () => {
    const { canUndo, canRedo } = useHistory()
    // canUndo/canRedo reflect the shared module-level stacks; clear first
    const { clearHistory } = useHistory()
    clearHistory()
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })

  it('records an action and enables undo', () => {
    const { record, canUndo, clearHistory } = useHistory()
    clearHistory()
    record({ label: 'Test', undo: async () => {}, redo: async () => {} })
    expect(canUndo.value).toBe(true)
  })

  it('undo moves action to redo stack', async () => {
    const { record, undo, canUndo, canRedo, clearHistory } = useHistory()
    clearHistory()
    let undone = false
    record({
      label: 'Add',
      undo: async () => {
        undone = true
      },
      redo: async () => {}
    })
    await undo()
    expect(undone).toBe(true)
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(true)
  })

  it('redo re-executes the action', async () => {
    const { record, undo, redo, canRedo, clearHistory } = useHistory()
    clearHistory()
    let redone = false
    record({
      label: 'Add',
      undo: async () => {},
      redo: async () => {
        redone = true
      }
    })
    await undo()
    await redo()
    expect(redone).toBe(true)
    expect(canRedo.value).toBe(false)
  })

  it('new record clears redo stack', async () => {
    const { record, undo, canRedo, clearHistory } = useHistory()
    clearHistory()
    record({ label: 'A', undo: async () => {}, redo: async () => {} })
    await undo()
    expect(canRedo.value).toBe(true)
    record({ label: 'B', undo: async () => {}, redo: async () => {} })
    expect(canRedo.value).toBe(false)
  })
})
