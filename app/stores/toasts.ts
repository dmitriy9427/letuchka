import { defineStore } from 'pinia'

// Короткие уведомления внизу экрана.
export const useToasts = defineStore('toasts', () => {
  const list = ref<{ id: number; text: string; tone: 'info' | 'error' }[]>([])
  let counter = 0

  function show(text: string, tone: 'info' | 'error' = 'info', ms = 3000) {
    const id = ++counter
    list.value.push({ id, text, tone })
    setTimeout(() => (list.value = list.value.filter((t) => t.id !== id)), ms)
  }

  return { list, show }
})
