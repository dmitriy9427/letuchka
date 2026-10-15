# 4. Карточка

[app/components/NoteCard.vue](../../app/components/NoteCard.vue) — в одном файле почти весь Vue,
который нужен в работе.

## Где на экране

Стикер на доске: текст, автор («Вы» для своих), ✎ и ✕ у своих карточек на этапе «Пишем», кнопка
голоса с числом на этапе «Голосуем». Карточки коллег на этапе «Пишем» — точками. Чуть повёрнута,
как настоящий стикер.

## Пропсы

| Проп | Тип | Зачем |
| --- | --- | --- |
| `card` | `Card` | что показывать |

Остальное карточка берёт из стора — этап, голоса, кто я.

## Код по частям

### `<script setup>`

```ts
const props = defineProps<{ card: Card }>()
const board = useBoard()
```

`defineProps` с типом — пропсы и их TypeScript-тип одной строкой. Импортировать не нужно: это
макрос компилятора Vue.

```ts
const hidden = computed(() => isHidden(props.card, board.phase, board.userId))
const mine = computed(() => props.card.authorId === board.userId)
const editable = computed(() => canEdit(props.card, board.phase, board.userId))
const votes = computed(() => (board.state ? votesFor(board.state.votes, props.card.id) : 0))
const voted = computed(() => !!board.state && votedBy(board.state.votes, props.card.id, board.userId))
const focused = computed(() => board.room?.focusCardId === props.card.id)
```

Каждое производное значение — `computed`. Vue сам знает, от чего оно зависит, и пересчитывает,
только когда нужно. Правила — функции из `lib/board.ts`.

```ts
const tilt = computed(() => ((props.card.id.charCodeAt(0) + props.card.id.charCodeAt(1)) % 5) - 2)
```

Наклон от −2° до 2° **из id**, а не случайный: у каждой карточки свой, но одинаковый при каждой
перерисовке и у всех участников.

### Редактирование

```ts
const editing = ref(false)
const draft = ref('')
const input = ref<HTMLTextAreaElement | null>(null)

async function startEdit() {
  draft.value = props.card.text
  editing.value = true
  await nextTick()
  input.value?.focus()
}
```

- `ref` — реактивное значение; в скрипте `.value`, в шаблоне — без.
- `input` — `ref` на DOM-элемент: в шаблоне `<textarea ref="input">`, и Vue положит туда элемент.
- **`nextTick`** — Vue обновляет DOM не сразу после `editing.value = true`, а пачкой в конце тика.
  До `nextTick` `<textarea>` ещё нет — фокусировать нечего.

```ts
async function save() {
  editing.value = false
  const text = draft.value.trim()
  if (!text) return board.deleteCard(props.card.id)
  if (text !== props.card.text) await board.updateCard(props.card.id, text)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void save() }
  if (event.key === 'Escape') editing.value = false
}
```

- Стёрли весь текст — карточка удаляется (как в стикерах на доске).
- Текст не изменился — запроса нет.
- Enter — сохранить, Shift+Enter — новая строка, Escape — отменить.

### `<template>`

```vue
<article
  class="note"
  :class="{ 'is-hidden': hidden, 'is-mine': mine, 'is-focused': focused, 'is-voted': voted }"
  :style="{ '--tilt': `${tilt}deg` }"
>
```

- `:class` объектом — «класс включён, если значение истинно». Как `clsx` в React, только встроено.
- `:style` — CSS-переменная `--tilt`, поворот рисует CSS.

```vue
<template v-if="hidden">
  <p class="note__text" aria-hidden="true">{{ card.text.replace(/\S/g, '•') }}</p>
  <p class="visually-hidden">Карточка {{ card.authorName }} — откроется на этапе голосования</p>
</template>
<textarea v-else-if="editing" ref="input" v-model="draft" class="note__edit" maxlength="280"
  aria-label="Текст карточки" @blur="save" @keydown="onKey" />
<p v-else class="note__text">{{ card.text }}</p>
```

- **`v-if` / `v-else-if` / `v-else`** — три состояния карточки. `<template v-if>` — группа без
  лишней обёртки (как `<>…</>` в React).
- Скрытая карточка: точки вместо букв — видна длина, но не смысл; для скринридера — понятная фраза.
- **`v-model="draft"`** — двусторонняя связь: ввод меняет `draft`, изменение `draft` меняет поле.
  В React это `value={draft} onChange={(e) => setDraft(e.target.value)}`.
- `@blur="save"` — ушли из поля — сохранили. `@` — то же, что `v-on:`.
- `{{ }}` экранирует HTML: текст карточки — от людей, и `<script>` в нём останется текстом.

```vue
<button v-if="board.phase === 'vote'" type="button" class="vote" :aria-pressed="voted" …>
```

`aria-pressed` — кнопка-переключатель: «голос отдан / нет».

### `<style scoped>`

Стили карточки действуют **только** на этот компонент: Vue добавит элементам уникальный атрибут и
допишет его к селекторам. Как CSS-модули, но с обычными именами классов.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| `focus()` без `nextTick` | при нажатии ✎ курсор не встаёт в поле |
| случайный наклон | при каждой перерисовке карточки «дрожат» |
| `v-html` для текста карточки | XSS: участник вставит `<img onerror=…>` |
| `v-show` вместо `v-if` для поля | `<textarea>` есть всегда (скрыто) — лишний элемент на каждую карточку |

## Проверьте себя

1. Как сделать, чтобы своя карточка подсвечивалась рамкой?
2. Чем `v-if` отличается от `v-show`?

<details>
<summary>Ответы</summary>

1. Класс `is-mine` уже ставится (`:class`). Достаточно CSS: `.note.is-mine { outline: 2px solid var(--accent) }`.
2. `v-if` создаёт и удаляет элемент; `v-show` оставляет его в DOM и переключает `display: none`.
   Для редко показываемого — `v-if`, для частых переключений — `v-show`.
</details>
