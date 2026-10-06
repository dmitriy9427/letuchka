// Кто вошёл в этом браузере. Setup-стор Pinia: внутри — те же ref и computed,
// что в компонентах, а return перечисляет, что видно снаружи.

import { defineStore } from 'pinia'
import type { User } from '~/lib/types'

export const useSession = defineStore('session', () => {
  const user = ref<User | null>(null)
  const loaded = ref(false)

  async function load() {
    if (loaded.value) return
    user.value = await useBackend().currentUser()
    loaded.value = true
  }

  async function signIn(name: string) {
    user.value = await useBackend().signIn(name)
    loaded.value = true
    return user.value
  }

  return { user, loaded, load, signIn }
})
