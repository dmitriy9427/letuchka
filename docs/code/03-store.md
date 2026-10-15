# 3. Стор комнаты

[app/stores/board.ts](../../app/stores/board.ts). Глава — [03. Pinia](../03-pinia.md).

## Где на экране

Всё, что на странице комнаты: доска, участники, курсоры, реакции, таймер, этап. Компоненты берут
данные и действия из стора `useBoard()`.

## Что делает

- Подключается к комнате через бэкенд и держит её снимок.
- Применяет **все** изменения — свои и коллег — одной функцией `applyChange`.
- Даёт вычисляемые значения: этап, «я ведущий?», «сколько голосов осталось».
- Оборачивает действия: ошибка — уведомление, а не сломанный экран.
- Хранит эфемерное: участников онлайн, курсоры, реакции.

## Setup-стор

```ts
export const useBoard = defineStore('board', () => {
  const state = ref<RoomSnapshot | null>(null)
  const status = ref<Status>('idle')
  …
  return { state, status, room, phase, join, addCard, … }
})
```

Setup-стор — это **функция**, похожая на `<script setup>` компонента: внутри `ref`, `computed`,
обычные функции; всё, что вернули, доступно снаружи. `ref` — состояние, `computed` — геттеры,
функции — действия.

```ts
const room = computed(() => state.value?.room ?? null)
const phase = computed<Phase>(() => room.value?.phase ?? 'write')
const isOwner = computed(() => !!room.value && ownerCheck(room.value, userId.value))
const myVotesLeft = computed(() => (state.value ? votesLeft(state.value.votes, userId.value) : 0))
```

`computed` пересчитывается, только когда меняется то, что он читает (как `useMemo`, но список
зависимостей Vue собирает сам). Логика — чистые функции из `lib/board.ts`.

## Подключение: одна дорога изменений

```ts
async function join(roomId: string) {
  leave()
  if (!session.user) return
  status.value = 'loading'
  try {
    connection = await useBackend().connect(roomId, session.user, {
      onChange: (change) => {
        if (state.value) state.value = applyChange(state.value, change)
      },
      onPresence: (list) => (participants.value = list),
      onCursor: (cursor) => {
        if (cursor.userId !== userId.value) cursors.value[cursor.userId] = { ...cursor, at: Date.now() }
      },
      onReaction: (reaction) => {
        reactions.value.push(reaction)
        setTimeout(() => (reactions.value = reactions.value.filter((r) => r.id !== reaction.id)), 2600)
      },
    })
    if (!connection) { status.value = 'not-found'; return }
    state.value = connection.snapshot
    status.value = 'ready'
  } catch (error) {
    status.value = 'error'
  }
}
```

- `leave()` в начале — переход из одной комнаты в другую не оставляет старое подключение.
- **`onChange` — единственное место, где меняется доска.** Своя карточка и карточка коллеги
  проходят один путь: бэкенд → `onChange` → `applyChange`. Экраны участников не могут разойтись
  из-за того, что «своё» применили иначе.
- `state.value = applyChange(…)` — замена объекта целиком: Vue видит новое значение.
- Свой курсор не показываем; у чужого запоминаем время — `CursorLayer` спрячет «уснувший».
- Реакция живёт 2,6 с — столько длится её анимация, — потом удаляется из списка.
- `status` — пять состояний экрана: `idle`, `loading`, `ready`, `not-found`, `error`. Страница
  показывает для каждого своё.

## Действия: ошибка — уведомление

```ts
async function run(action: (c: RoomConnection) => Promise<void>) {
  if (!connection) return
  try {
    await action(connection)
  } catch (error) {
    toasts.show(error instanceof Error ? error.message : 'Не получилось', 'error')
  }
}

const addCard = (column: ColumnId, text: string) => run((c) => c.addCard(column, text))
```

Все действия идут через `run`: база отказала («Сейчас это действие недоступно») — человек видит
уведомление, а компонент продолжает работать.

```ts
function toggleVote(cardId: string) {
  if (!state.value || !room.value) return
  if (!canToggleVote(room.value, state.value.votes, cardId, userId.value)) {
    toasts.show('Голоса закончились — снимите голос с другой карточки')
    return
  }
  const on = !votedBy(state.value.votes, cardId, userId.value)
  return run((c) => c.toggleVote(cardId, on))
}
```

Проверка **до** запроса — быстрый понятный ответ без сети. Та же проверка в базе — защита от
обхода интерфейса.

## Компонент берёт стор

```vue
<script setup lang="ts">
const board = useBoard()                 // авто-импорт Nuxt, без import
</script>
<template>
  <p>Осталось голосов: {{ board.myVotesLeft }}</p>
  <button @click="board.setPhase('vote')">К голосованию</button>
</template>
```

**Не деструктурируйте**: `const { myVotesLeft } = useBoard()` — получите число на момент вызова, и
оно не будет обновляться. Нужны отдельные переменные — `storeToRefs(board)`.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| своё действие применять в действии, а чужое — в `onChange` | двойное применение и расхождение экранов |
| без `leave()` в `join` | два подключения, изменения приходят дважды |
| без `run` | отказ базы — необработанное исключение в консоли и «зависшая» кнопка |
| деструктуризация стора | счётчик голосов «застыл» |

## Проверьте себя

1. Почему в `onChange` проверка `if (state.value)`?
2. Где проверяется, что голосовать можно только на этапе голосования, — в сторе или в базе?

<details>
<summary>Ответы</summary>

1. Изменение может прийти, когда комната уже закрыта (`leave` обнулил `state`), — применять не к
   чему.
2. В обоих: в сторе (`canToggleVote`) — для быстрого ответа, в базе (RLS) — для защиты.
</details>
