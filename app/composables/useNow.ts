// Текущее время, которое само обновляется раз в `ms` миллисекунд, — для таймера.
// onMounted/onUnmounted — хуки жизненного цикла Vue (как useEffect с [] и его очисткой).
export function useNow(ms = 500) {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => (timer = setInterval(() => (now.value = Date.now()), ms)))
  onUnmounted(() => clearInterval(timer))
  return now
}
