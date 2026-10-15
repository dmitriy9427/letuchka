# 01. Vue для тех, кто знает React

Хорошая новость: идеи те же — компоненты, пропсы, состояние, эффекты. Разница
в записи и в том, **как Vue узнаёт об изменениях**. Эта глава — словарик
«React → Vue» на примерах из «Летучки».

## Компонент: один файл, три части

React: компонент — функция, разметка — JSX, стили — где-то рядом.
Vue: **Single File Component** (`.vue`) — три блока в одном файле:

```vue
<script setup lang="ts">
const count = ref(0)
</script>

<template>
  <button @click="count++">Нажали {{ count }} раз</button>
</template>

<style scoped>
button { color: purple; }
</style>
```

- `<script setup>` выполняется **один раз** при создании компонента — не на
  каждый рендер, как функция-компонент в React. Поэтому не нужны `useCallback`
  и `useMemo` «чтобы функция не пересоздавалась».
- `<template>` — HTML с директивами. Всё, что объявлено в `<script setup>`,
  доступно в шаблоне.
- `<style scoped>` — стили только для этого компонента (Vue добавляет
  атрибут `data-v-xxxx` элементам и селекторам).

Пример из проекта: `app/components/NoteCard.vue`.

## Состояние: ref вместо useState

```ts
// React
const [name, setName] = useState('')
setName('Аня')

// Vue
const name = ref('')
name.value = 'Аня'      // в <script> — через .value
```

В шаблоне `.value` не пишется: `{{ name }}`. Сеттера нет — просто
присваиваете. Vue сам отслеживает, кто читал `name`, и перерисует ровно эти
места.

**Как это работает.** `ref` — объект с геттером и сеттером `value`. Когда
шаблон или `computed` читает `.value`, Vue запоминает зависимость; когда кто-то
пишет — уведомляет зависимых. Это называется **реактивность на прокси**, и
поэтому в Vue нет «массивов зависимостей» — Vue знает их сам.

Для объектов есть `reactive({...})` (без `.value`), но в проекте везде `ref`
— одно правило проще.

## computed вместо useMemo

```ts
// React
const left = useMemo(() => votesLeft(votes, userId), [votes, userId])

// Vue
const left = computed(() => votesLeft(votes.value, userId.value))
```

Зависимости Vue находит сам. Значение кешируется и пересчитывается, только
когда изменились данные, которые читались внутри. В шаблоне — `{{ left }}`.

Пример: `NoteCard.vue` — `hidden`, `votes`, `voted`, `focused` — всё `computed`.

## watch и хуки жизненного цикла вместо useEffect

| React | Vue |
| --- | --- |
| `useEffect(() => {...}, [])` | `onMounted(() => {...})` |
| возврат функции очистки | `onUnmounted(() => {...})` |
| `useEffect(() => {...}, [id])` | `watch(id, (newId) => {...})` |
| `useLayoutEffect` + ждём DOM | `await nextTick()` |

```ts
// app/pages/r/[id].vue — сменился id в адресе → переподключаемся
watch(roomId, (id) => session.user && board.join(id))
onUnmounted(() => board.leave())
```

`nextTick()` — «дождаться, пока Vue обновит DOM». В `NoteCard.vue`: включили
режим редактирования → `await nextTick()` → textarea уже в DOM → `focus()`.

## Шаблон: директивы вместо JSX

| JSX | Vue-шаблон |
| --- | --- |
| `{cond && <p/>}` | `<p v-if="cond">` |
| `{cond ? <A/> : <B/>}` | `<A v-if="cond"/><B v-else/>` |
| `{list.map(x => <li key={x.id}>)}` | `<li v-for="x in list" :key="x.id">` |
| `className={...}` | `:class="{ 'is-active': active }"` |
| `style={{ color }}` | `:style="{ color }"` |
| `value={v} onChange={e => setV(e.target.value)}` | `v-model="v"` |
| `onClick={() => f(x)}` | `@click="f(x)"` |
| `onSubmit={e => { e.preventDefault(); … }}` | `@submit.prevent="…"` |
| `{text}` | `{{ text }}` |

- `:` (сокращение `v-bind:`) — «значение атрибута — выражение JS».
  Без двоеточия — просто строка.
- `@` (сокращение `v-on:`) — обработчик события. **Модификаторы**:
  `.prevent`, `.stop`, `.enter`… — `@keydown.enter="send"`.
- `v-model` — двусторонняя связь: поле показывает переменную и записывает в неё
  ввод. Аналог пары `value` + `onChange`.
- `v-show` — как `v-if`, но элемент остаётся в DOM и прячется `display: none`.

## Пропсы и события

```ts
// NoteCard.vue — входные данные с типами
const props = defineProps<{ card: Card }>()

// NameDialog.vue — событие наружу (в React это был бы проп-колбэк onSubmit)
const emit = defineEmits<{ submit: [name: string] }>()
emit('submit', name.value)
```

Родитель: `<NameDialog @submit="enter" />`. Данные идут вниз пропсами, наверх —
событиями. Пропсы, как и в React, **не меняют** внутри компонента.

## Слоты вместо children

```vue
<!-- CursorLayer.vue -->
<div class="layer"><slot /> …курсоры… </div>

<!-- RoomView.vue -->
<CursorLayer>
  <div class="columns">…</div>   ← попадёт на место <slot />
</CursorLayer>
```

`<slot />` = `{props.children}`. Бывают именованные слоты
(`<template #header>`) — как несколько «children»-пропсов.

## Ссылки на DOM

```vue
<script setup>
const dialog = ref<HTMLDialogElement | null>(null)   // как useRef
onMounted(() => dialog.value?.showModal())
</script>
<template><dialog ref="dialog">…</dialog></template>
```

Атрибут `ref="dialog"` в шаблоне + переменная с тем же именем.

## Анимации списков из коробки

`<Transition>` и `<TransitionGroup>` — встроенные компоненты Vue. Они ставят
классы `*-enter-from`, `*-enter-active`, `*-leave-to` в нужные моменты, а
анимацию пишете в CSS. `TransitionGroup` ещё и плавно двигает соседей, когда
элемент вставили или убрали (класс `*-move`, техника FLIP).

В «Летучке»: появление карточек и пересортировка по голосам
(`BoardColumn.vue`), подсказка этапа (`RoomView.vue`), уведомления
(`ToastHost.vue`). В React для этого нужна библиотека (Framer Motion).

## Частые ошибки новичка

1. **Забыть `.value` в `<script>`.** `if (name)` всегда истинно — это объект
   ref. Нужно `if (name.value)`.
2. **Деструктурировать реактивный объект:** `const { user } = useSession()`
   «отрывает» значение от реактивности — оно больше не обновится. Читайте
   `session.user` или используйте `storeToRefs()`.
3. **Мутировать пропсы.** Как и в React — нельзя. Отправьте событие наверх.
4. **Ждать, что DOM обновился сразу после присваивания.** Vue копит изменения
   и обновляет DOM пачкой в микрозадаче — используйте `await nextTick()`.

## Попробуйте сами

1. Перепишите на Vue: `const [count, setCount] = useState(0); const double = useMemo(() => count * 2, [count])`.
2. В шаблоне `NoteCard.vue` найдите, как скрытая карточка показывает точки вместо текста. Почему
   текст для скринридера — отдельной строкой?
3. Почему после `editing.value = true` нужен `await nextTick()` перед `input.value?.focus()`?

<details>
<summary>Ответы</summary>

1. ```ts
   const count = ref(0)
   const double = computed(() => count.value * 2)
   ```
   В шаблоне — `{{ count }}` и `{{ double }}` без `.value`.
2. `card.text.replace(/\S/g, '•')` — каждый непробельный символ заменён точкой; строка
   `aria-hidden`. Скринридеру — понятная фраза «Карточка Анны — откроется на этапе голосования»
   вместо «точка точка точка».
3. Vue обновляет DOM не сразу, а пачкой. До `nextTick` `<textarea>` ещё нет в DOM — фокусировать
   нечего.
</details>
