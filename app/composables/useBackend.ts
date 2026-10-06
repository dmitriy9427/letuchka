// Какой бэкенд использовать — решают публичные настройки (nuxt.config → runtimeConfig).
// Есть ключи Supabase → настоящий сервер, нет → локальный режим между вкладками.
//
// Файл лежит в composables/ — Nuxt импортирует его сам: в любом компоненте
// можно просто написать useBackend() без import (это «авто-импорт» Nuxt).

import type { Backend } from '~/lib/backend'
import { createLocalBackend } from '~/lib/localBackend'
import { createSupabaseBackend } from '~/lib/supabaseBackend'

let backend: Backend | null = null

export function useBackend(): Backend {
  if (backend) return backend
  const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
  backend =
    supabaseUrl && supabaseKey ? createSupabaseBackend(String(supabaseUrl), String(supabaseKey)) : createLocalBackend()
  return backend
}
