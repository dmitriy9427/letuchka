# 2. Бэкенд-адаптер

[app/lib/backend.ts](../../app/lib/backend.ts) — интерфейс,
[localBackend.ts](../../app/lib/localBackend.ts) и [supabaseBackend.ts](../../app/lib/supabaseBackend.ts) —
реализации, [composables/useBackend.ts](../../app/composables/useBackend.ts) — выбор.
Главы — [04](../04-backend.md), [05](../05-supabase.md).

## Где на экране

Нигде — и в каждом действии. Без ключей Supabase демо работает между вкладками одного браузера; с
ключами — между любыми устройствами. Интерфейс в обоих случаях одинаковый.

## Интерфейс

```ts
export type Backend = {
  kind: 'local' | 'supabase'
  signIn: (name: string) => Promise<User>
  currentUser: () => Promise<User | null>
  createRoom: (title: string, user: User) => Promise<string>
  connect: (roomId: string, user: User, events: RoomEvents) => Promise<RoomConnection | null>
}

export type RoomConnection = {
  snapshot: RoomSnapshot
  addCard, updateCard, deleteCard, toggleVote, setPhase, setTimer, setFocus   // → Promise
  sendCursor: (x: number, y: number) => void       // эфемерное — не сохраняется
  sendReaction: (emoji: string) => void
  leave: () => void
}

export type RoomEvents = {
  onChange: (change: Change) => void               // любое изменение, свои тоже
  onPresence: (participants: Participant[]) => void
  onCursor: (cursor: Cursor) => void
  onReaction: (reaction: Reaction) => void
}
```

Стор говорит: «подключи меня к комнате и сообщай об изменениях через эти колбэки». Кто и как
доставляет — не его дело. Это паттерн **адаптер**.

Два вида данных:

| | Сохраняется | Примеры |
| --- | --- | --- |
| **данные комнаты** | да (база или `localStorage`) | карточки, голоса, этап, таймер |
| **эфемерное** | нет, только рассылка | курсоры, реакции, кто онлайн |

```ts
// useBackend.ts
const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
backend = supabaseUrl && supabaseKey ? createSupabaseBackend(…) : createLocalBackend()
```

Выбор — один раз, по наличию ключей.

## Локальная реализация

```ts
const USER_KEY = 'letuchka:user'                     // в sessionStorage — своё у каждой вкладки
const roomKey = (id: string) => `letuchka:room:${id}` // в localStorage — общее для вкладок
```

Пользователь в `sessionStorage`, комнаты в `localStorage` — вторая вкладка становится **вторым
участником** с общей доской.

```ts
const channel = new BroadcastChannel(`letuchka:${id}`)

const commit = (change: Change) => {
  const state = read(id)
  if (!state) return
  write(applyChange(state, change))                                 // 1. сохранить
  events.onChange(change)                                           // 2. применить у себя
  channel.postMessage({ kind: 'change', change } satisfies Message) // 3. рассказать другим вкладкам
}

channel.onmessage = ({ data }) => {
  if (data.kind === 'change') events.onChange(data.change)
  …
}
```

**BroadcastChannel** — встроенная в браузер «рация» между вкладками одного сайта: все, кто открыл
канал с тем же именем, получают сообщения. Своё сообщение отправитель **не** получает — поэтому
`events.onChange` у себя вызывается явно.

`satisfies Message` — TypeScript проверяет форму сообщения, не меняя тип выражения.

### Кто онлайн: heartbeat

```ts
const heartbeat = setInterval(() => {
  channel.postMessage({ kind: 'hello', user: me })
  for (const [key, value] of seen) if (now - value.at > PRESENCE_TTL) { seen.delete(key); changed = true }
  if (changed) publishPresence()
}, HEARTBEAT)

window.addEventListener('pagehide', bye)
```

- Раз в 2 с — «я здесь». Кто молчит дольше 6 с — ушёл.
- `bye` при закрытии вкладки (`pagehide`) — быстрый уход. Но он приходит не всегда (вкладку убила
  система), поэтому heartbeat обязателен.
- Новичку отвечаем сразу (`if (isNew) postMessage(hello)`) — иначе он узнал бы о нас только через
  2 секунды.

## Supabase-реализация

```ts
const [roomRes, cardsRes, votesRes] = await Promise.all([
  db.from('rooms').select('*').eq('id', id).maybeSingle<RoomRow>(),
  db.from('cards').select('*').eq('room_id', id).order('created_at').returns<CardRow[]>(),
  db.from('votes').select('*').eq('room_id', id).returns<VoteRow[]>(),
])
```

Снимок комнаты — три запроса **параллельно**. `maybeSingle` — «одна строка или ничего» (комнаты нет
→ `null` → экран «не найдено»).

```ts
async addCard(column, text) {
  const row = one(await db.from('cards').insert({ room_id: id, column, text: cleanCardText(text), author_name: user.name }).select().single<CardRow>())
  publish({ type: 'card', card: toCard(row) })
},
```

**Сначала база, потом рассылка.** Действие пишется в Postgres, где его проверяют правила RLS
(«этап — пишем?», «автор — я?»). Приняли — применяем у себя и рассылаем остальным через
**Broadcast** канала комнаты:

```ts
const publish = (change: Change) => {
  if (change.type === 'room') room = change.room
  events.onChange(change)
  void channel.send({ type: 'broadcast', event: 'change', payload: change })
}
```

База — источник правды, Broadcast — быстрое уведомление. В изменении — строка **из базы**
(`select().single()`), с id и временем, которые выдала база.

```ts
function check<T>({ data, error }) {
  if (!error) return data
  if (error.code === '42501') throw new Error('Сейчас это действие недоступно')
  throw new Error(error.message)
}
```

Код `42501` — нарушено правило RLS (этап сменился, голоса кончились). Вместо технического текста —
понятная фраза; стор покажет её уведомлением.

```ts
const toCard = (r: CardRow): Card => ({ id: r.id, roomId: r.room_id, column: r.column, … createdAt: Date.parse(r.created_at) })
```

Таблицы в Postgres принято называть `snake_case`, в TypeScript — `camelCase`. Переводчики `toRoom`,
`toCard`, `toVote` держат эту разницу в одном месте.

### Presence

```ts
const channel = db.channel(`room:${id}`, { config: { broadcast: { self: false }, presence: { key: user.id } } })
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState<Participant>()
  events.onPresence(Object.values(state).map((list) => list[0]).filter(…))
})
…
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') { void channel.track({ id: user.id, name: user.name, color: … }); resolve() }
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve()
})
```

- `presence.key: user.id` — один человек в двух вкладках — одна запись (со списком вкладок).
- `self: false` — свои Broadcast-сообщения не возвращаются (у себя мы уже применили).
- Нет связи с Realtime — комната всё равно откроется, просто без живых обновлений.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| компоненты зовут Supabase напрямую | без ключей проект не запустить |
| рассылать до записи в базу | коллеги увидят карточку, которую база потом отвергнет |
| без heartbeat | закрытые «жёстко» вкладки висят онлайн вечно |
| `self: true` в Broadcast | своё изменение применяется дважды (у `vote` — защищено, у других типов — лишняя работа) |

## Проверьте себя

1. Почему пользователь в `sessionStorage`, а не в `localStorage`?
2. Где в Supabase-реализации проверяется «не больше трёх голосов»?

<details>
<summary>Ответы</summary>

1. Чтобы каждая вкладка была отдельным участником в локальном режиме.
2. Нигде в TypeScript — в политике RLS `votes create` в базе. Реализация лишь превращает отказ в
   понятное сообщение.
</details>
