# 1. Логика доски

[app/lib/board.ts](../../app/lib/board.ts) — чистые функции, без Vue и без сети. Тесты — `board.test.ts`.

## Где на экране

Везде на доске: три колонки, этапы «Пишем → Голосуем → Обсуждаем», счётчик «осталось 2 голоса»,
порядок карточек (на обсуждении — от самых популярных), карточки коллег точками на этапе «Пишем».

## Что делает

| Функция | Ответ на вопрос |
| --- | --- |
| `applyChange(state, change)` | каким станет состояние после изменения |
| `votesFor`, `votedBy`, `votesLeft` | сколько голосов у карточки / голосовал ли я / сколько осталось |
| `canToggleVote` | можно ли сейчас проголосовать или снять голос |
| `columnCards` | какие карточки в колонке и в каком порядке |
| `isHidden` | показывать ли текст карточки |
| `timeLeft`, `formatClock` | сколько осталось таймеру и как это написать |

## Данные

```ts
type RoomSnapshot = { room: Room; cards: Card[]; votes: Vote[] }

type Change =
  | { type: 'room'; room: Room }                 // этап, таймер, фокус
  | { type: 'card'; card: Card }                 // создать или изменить
  | { type: 'card-delete'; id: string }
  | { type: 'vote'; vote: Vote }
  | { type: 'vote-delete'; vote: Vote }
```

**Изменение — объект-описание**, а не «действие на экране». Его можно применить у себя, переслать
коллегам, проверить тестом.

## Код по частям

### `applyChange` — единственная дорога изменений

```ts
export function applyChange(state: RoomSnapshot, change: Change): RoomSnapshot {
  switch (change.type) {
    case 'room':
      return { ...state, room: change.room }
    case 'card': {
      const exists = state.cards.some((c) => c.id === change.card.id)
      const cards = exists
        ? state.cards.map((c) => (c.id === change.card.id ? change.card : c))
        : [...state.cards, change.card]
      return { ...state, cards }
    }
    case 'card-delete':
      return {
        ...state,
        cards: state.cards.filter((c) => c.id !== change.id),
        votes: state.votes.filter((v) => v.cardId !== change.id),
      }
    case 'vote':
      return state.votes.some((v) => sameVote(v, change.vote)) ? state : { ...state, votes: [...state.votes, change.vote] }
    case 'vote-delete':
      return { ...state, votes: state.votes.filter((v) => !sameVote(v, change.vote)) }
  }
}
```

- **Новый объект — старый не трогаем.** `{ ...state, cards }` — копия с новым списком. Vue заметит
  замену, а тесты могут сравнивать «до» и «после».
- **`card` и создаёт, и изменяет**: есть такой `id` — заменить, нет — добавить. Отправителю не нужно
  знать, видел ли получатель карточку раньше.
- **Удаление карточки удаляет её голоса** — иначе голос «сгорел» бы у участника: он отдан, а
  карточки нет.
- **Повторный голос ничего не меняет** (`some(sameVote) ? state`). Одно и то же изменение,
  пришедшее дважды (от базы и от рассылки), безопасно. Это **идемпотентность**.
- TypeScript проверяет `switch`: добавите новый тип изменения — функция без ветки для него не
  скомпилируется (если включена проверка полноты).

### Голоса

```ts
export const VOTES_PER_USER = 3

export const votesLeft = (votes: Vote[], userId: string) =>
  VOTES_PER_USER - votes.filter((v) => v.userId === userId).length

export function canToggleVote(room: Room, votes: Vote[], cardId: string, userId: string) {
  if (room.phase !== 'vote') return false
  return votedBy(votes, cardId, userId) || votesLeft(votes, userId) > 0
}
```

Снять голос можно всегда (на этапе голосования), поставить — пока остались. Голоса не хранятся
счётчиком у человека — **считаются** из списка: нельзя рассинхронизироваться.

### Порядок карточек

```ts
export function columnCards(cards: Card[], votes: Vote[], column: ColumnId, phase: Phase) {
  const list = cards.filter((c) => c.column === column)
  if (phase === 'discuss') {
    return list.sort((a, b) => votesFor(votes, b.id) - votesFor(votes, a.id) || a.createdAt - b.createdAt)
  }
  return list.sort((a, b) => a.createdAt - b.createdAt)
}
```

На обсуждении — от популярных; при равенстве — кто раньше написал (`||` срабатывает, когда разница
голосов 0). На остальных этапах — по времени: карточки не прыгают, пока их пишут.

`filter` создаёт новый массив, поэтому `sort` (который меняет массив на месте) не портит исходный.

### Скрытые карточки

```ts
export const isHidden = (card: Card, phase: Phase, userId: string) => phase === 'write' && card.authorId !== userId
```

На этапе «Пишем» чужие карточки скрыты, чтобы не влиять друг на друга. Свои — видны.

### Таймер

```ts
export function timeLeft(room: Room, now: number) {
  return room.timerEnd ? Math.max(0, Math.ceil((room.timerEnd - now) / 1000)) : 0
}
```

Комната хранит **момент окончания**, а не «осталось». `now` — параметр: тест проверяет «до конца
90 секунд» без ожидания.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| `state.cards.push(card)` вместо копии | Vue может не заметить изменения; тесты «до/после» врут |
| не удалять голоса удалённой карточки | у участника «пропадает» голос |
| `vote` без проверки дубля | рассылка + ответ базы → голос посчитан дважды |
| хранить «осталось секунд» в комнате | рассылка каждую секунду и расхождение у участников |

## Проверьте себя

1. Как изменится состояние, если `applyChange` получит `{ type: 'vote', vote }`, который уже есть?
2. Карточки A (2 голоса, 10:00) и B (2 голоса, 09:58). Кто первый на обсуждении?

<details>
<summary>Ответы</summary>

1. Никак — вернётся тот же объект `state`.
2. B: голосов поровну, B написана раньше.
</details>
