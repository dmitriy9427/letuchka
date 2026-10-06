# 03. Pinia: состояние приложения

Pinia — официальный стор Vue. Ближайший аналог в React — **Zustand**: хук без
провайдера, сторы маленькие и независимые.

## Setup-стор

Стор пишется так же, как `<script setup>` компонента:

```ts
// app/stores/session.ts
export const useSession = defineStore('session', () => {
  const user = ref<User | null>(null)          // состояние
  const loaded = ref(false)

  async function signIn(name: string) {         // действие
    user.value = await useBackend().signIn(name)
  }

  return { user, loaded, signIn }                // что видно снаружи
})
```

В компоненте: `const session = useSession()` → `session.user`, `session.signIn('Аня')`.
`.value` снаружи писать не нужно — Pinia разворачивает ref'ы.

Есть и «options»-синтаксис (`state`, `getters`, `actions` объектами) — он
встречается в старых проектах. Setup-стор современнее и единообразнее с
компонентами.

## Сторы «Летучки»

| Стор | Что хранит |
| --- | --- |
| `session` | кто вошёл в этом браузере |
| `board` | открытая комната: данные, участники, курсоры, реакции, действия |
| `toasts` | уведомления |

## Как меняются данные доски

Главное правило `stores/board.ts`: **данные меняются только одним путём**.

```
клик «Голос»
  → board.toggleVote(cardId)            проверка: этап, остались ли голоса
  → connection.toggleVote(cardId, on)   бэкенд: записать (в Supabase — с проверкой RLS)
  → onChange({ type: 'vote', … })       изменение
  → applyChange(state, change)          чистая функция → новое состояние
  → Vue перерисовывает то, что зависело от state.votes
```

Действия коллег приходят по сети и проходят через **ту же** `applyChange`.
Поэтому у всех участников одинаковая картина, а логику проверяют тесты
(`board.test.ts`) без Vue и без сети.

`applyChange` возвращает **новый объект**, а не меняет старый. Для Vue это
не обязательно (он отследит и мутацию), но так проще думать и тестировать — та
же привычка, что из React.

## Ошибки действий

Все действия идут через обёртку `run()`: если бэкенд отказал (например, ведущий
уже сменил этап, а вы ещё голосуете), стор показывает уведомление, а не роняет
интерфейс.

## Частая ошибка: деструктуризация

```ts
const { user } = useSession()        // ✗ user больше не обновится
const session = useSession()         // ✓ session.user — реактивно
const { user } = storeToRefs(useSession())  // ✓ user — ref
```
