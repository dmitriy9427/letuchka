# 5. Таймер и курсоры

[app/components/RoomTimer.vue](../../app/components/RoomTimer.vue), [CursorLayer.vue](../../app/components/CursorLayer.vue),
[composables/useNow.ts](../../app/composables/useNow.ts), [useThrottle.ts](../../app/composables/useThrottle.ts).
Глава — [06. Реальное время в интерфейсе](../06-realtime-ux.md).

## Где на экране

**Таймер** в шапке комнаты: ведущий жмёт «5′» — у всех участников идёт «⏱ 4:59». Время вышло —
таймер мигает, телефон коротко вибрирует.

**Курсоры** коллег поверх доски — цветные стрелки с именами, как в Figma.

## Таймер: одно сообщение на весь отсчёт

```ts
const start = (minutes: number) => board.setTimer(Date.now() + minutes * 60_000)
```

Ведущий отправляет **момент окончания**, а не «осталось 300, 299, 298…». Одно изменение комнаты —
и каждый участник считает остаток сам:

```ts
const now = useNow(250)
const left = computed(() => (board.room ? timeLeft(board.room, now.value) : 0))
const running = computed(() => left.value > 0)
```

```ts
// useNow.ts
export function useNow(ms = 500) {
  const now = ref(Date.now())
  let timer
  onMounted(() => (timer = setInterval(() => (now.value = Date.now()), ms)))
  onUnmounted(() => clearInterval(timer))
  return now
}
```

**Composable** — функция с `ref` и хуками жизненного цикла, которую можно вызвать в любом
компоненте (как свой хук в React). `onMounted`/`onUnmounted` — как `useEffect(…, [])` и его
очистка.

Раз в 250 мс, а не раз в секунду: иначе из-за несовпадения фаз секунды на экране иногда
«перескакивали» бы через одну.

> Часы участников могут немного расходиться. Для ретро это не важно; для аукциона нужно было бы
> поправлять на разницу с часами сервера.

### Звонок по окончании

```ts
const ringing = ref(false)
watch(running, (is, was) => {
  if (was && !is && board.room?.timerEnd) {
    ringing.value = true
    navigator.vibrate?.(200)
    setTimeout(() => (ringing.value = false), 3000)
  }
})
```

`watch` вызывается при изменении `running` и получает новое и старое значение. «Было `true`, стало
`false`» — таймер **дошёл до конца** (а не остановлен заранее: тогда `timerEnd` — `null`).
`navigator.vibrate?.` — `?.`, потому что на iPhone и в настольных браузерах вибрации нет.

```vue
<span v-if="running || ringing" class="timer__clock" role="timer" aria-live="off">⏱ {{ formatClock(left) }}</span>
```

`role="timer"` + `aria-live="off"` — скринридер знает, что это таймер, но не зачитывает каждую
секунду.

## Курсоры: мало сообщений, правильные координаты

```ts
const send = throttle((x: number, y: number) => board.sendCursor(x, y), 50)

function onMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || !root.value) return
  const rect = root.value.getBoundingClientRect()
  send((event.clientX - rect.left) / rect.width, event.clientY - rect.top)
}
```

- **Не чаще 20 раз в секунду.** `pointermove` срабатывает до 120 раз в секунду — столько сообщений
  на каждого участника по сети не нужно.
- **По горизонтали — доля ширины доски (0…1)**, по вертикали — пиксели от верха доски. У коллег
  другая ширина экрана, колонки растягиваются — доля попадает в то же место колонки. По вертикали
  колонки растут одинаково, пиксели честны.
- Только мышь — на тач-экране «курсора» нет.

```ts
export function throttle(fn, ms) {
  let last = 0, pending = null, timer
  return (...args) => {
    const now = Date.now()
    if (now - last >= ms) { last = now; fn(...args) }
    else {
      pending = args
      clearTimeout(timer)
      timer = setTimeout(() => { last = Date.now(); if (pending) fn(...pending); pending = null }, ms - (now - last))
    }
  }
}
```

`throttle` — «не чаще раза в `ms`, но **последний вызов не теряется**». Остановили мышь — финальное
положение всё равно уйдёт, курсор коллеги не застрянет на полпути.

### Показ чужих курсоров

```ts
const now = useNow(1000)
const visible = computed(() =>
  Object.values(board.cursors)
    .filter((c) => now.value - c.at < 8000)
    .map((c) => ({ ...c, name: board.participants.find((p) => p.id === c.userId)?.name ?? '', color: colorOf(c.userId) }))
    .filter((c) => c.name),
)
```

```vue
<span v-for="c in visible" :key="c.userId" class="cursor"
  :style="{ '--c': c.color, transform: `translate(${c.x * width}px, ${c.y}px)` }" aria-hidden="true">
```

- Курсор, не двигавшийся 8 секунд, прячется — человек отошёл.
- Курсор без участника в списке онлайн — тоже: человек ушёл.
- `x * width` — доля обратно в пиксели **своей** ширины доски (`ResizeObserver` следит за ней).
- `transform`, а не `left/top` — двигать дёшево, без пересчёта раскладки.
- `aria-hidden` — для скринридера курсоры коллег — шум.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| слать «осталось N» каждую секунду | 300 сообщений на таймер и расхождение у участников |
| `useNow(1000)` для таймера | секунды иногда перескакивают |
| курсор в пикселях экрана | у коллеги с другим монитором стрелка над другой карточкой |
| `throttle`, теряющий последний вызов | курсор коллеги застывает не там, где остановилась мышь |

## Проверьте себя

1. Ведущий остановил таймер раньше времени (■). Будет ли «звонок»?
2. Сколько сообщений о курсоре уйдёт за 3 секунды непрерывного движения мыши?

<details>
<summary>Ответы</summary>

1. Нет: `setTimer(null)` делает `timerEnd` пустым, и условие `board.room?.timerEnd` в `watch` ложно.
2. Около 60: не чаще раза в 50 мс.
</details>
