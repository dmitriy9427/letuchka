// Вызывать функцию не чаще раза в `ms` мс; последний вызов не теряется.
// Для курсора: mousemove срабатывает до 120 раз в секунду, а по сети
// достаточно 20.
export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = 0
  let pending: A | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    const now = Date.now()
    if (now - last >= ms) {
      last = now
      fn(...args)
    } else {
      pending = args
      clearTimeout(timer)
      timer = setTimeout(() => {
        last = Date.now()
        if (pending) fn(...pending)
        pending = null
      }, ms - (now - last))
    }
  }
}
