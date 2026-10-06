<script setup lang="ts">
import { columnCards, type COLUMNS } from '~/lib/board'

const props = defineProps<{ column: (typeof COLUMNS)[number] }>()
const board = useBoard()

const cards = computed(() =>
  board.state ? columnCards(board.state.cards, board.state.votes, props.column.id, board.phase) : [],
)

const draft = ref('')
async function add() {
  const text = draft.value.trim()
  if (!text) return
  draft.value = ''
  await board.addCard(props.column.id, text)
}

/** Enter — добавить, Shift+Enter — перенос строки. */
function onKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void add()
  }
}
</script>

<template>
  <section class="column" :data-column="column.id" :aria-label="column.title">
    <header class="column__head">
      <span class="column__emoji" aria-hidden="true">{{ column.emoji }}</span>
      <h2>{{ column.title }}</h2>
      <span class="column__count">{{ cards.length }}</span>
    </header>

    <form v-if="board.phase === 'write'" class="add" @submit.prevent="add">
      <label class="visually-hidden" :for="`add-${column.id}`">Новая карточка: {{ column.title }}</label>
      <textarea
        :id="`add-${column.id}`"
        v-model="draft"
        class="add__input"
        rows="2"
        maxlength="280"
        :placeholder="column.hint"
        @keydown="onKey"
      />
      <button class="add__btn" type="submit" :disabled="!draft.trim()" aria-label="Добавить карточку">+</button>
    </form>

    <TransitionGroup tag="ul" name="note" class="column__list">
      <li v-for="card in cards" :key="card.id">
        <NoteCard :card="card" />
      </li>
    </TransitionGroup>

    <p v-if="!cards.length" class="column__empty">
      {{ board.phase === 'write' ? 'Пока пусто — напишите первую карточку' : 'Здесь ничего нет' }}
    </p>
  </section>
</template>

<style scoped lang="scss">
.column {
  --tone: var(--good);

  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: rgb(255 255 255 / 55%);
  backdrop-filter: blur(6px);
  box-shadow: inset 0 0 0 1px var(--line);

  &[data-column='bad'] {
    --tone: var(--bad);
  }

  &[data-column='ideas'] {
    --tone: var(--ideas);
  }
}

.column__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;

  h2 {
    font-size: 1rem;
    font-weight: 800;
  }
}

.column__emoji {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--tone);
}

.column__count {
  margin-left: auto;
  min-width: 26px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink-2);
  font-size: 0.8rem;
  font-weight: 800;
  text-align: center;
}

.add {
  position: relative;
}

.add__input {
  width: 100%;
  min-height: 70px;
  padding: 12px 52px 12px 14px;
  border: 2px dashed var(--line-strong);
  border-radius: 14px;
  background: var(--surface);
  font-family: var(--hand);
  font-size: 1.25rem;
  line-height: 1.15;
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    border-style: solid;
    border-color: var(--accent);
    outline: none;
  }
}

.add__btn {
  position: absolute;
  right: 10px;
  bottom: 12px;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 1.3rem;
  line-height: 1;
  transition: scale 0.2s var(--ease), opacity 0.2s;

  &:disabled {
    opacity: 0.35;
  }

  &:hover:not(:disabled) {
    scale: 1.1;
  }
}

.column__list {
  display: grid;
  gap: 12px;
}

.column__empty {
  padding: 18px;
  color: var(--muted);
  font-size: 0.9rem;
  text-align: center;
}

// Анимации TransitionGroup: появление, исчезновение и сдвиг соседей (*-move — FLIP).
.note-enter-active {
  transition: all 0.45s var(--ease);
}

.note-leave-active {
  position: absolute;
  transition: all 0.3s var(--ease);
}

.note-enter-from {
  opacity: 0;
  scale: 0.7;
  translate: 0 -16px;
}

.note-leave-to {
  opacity: 0;
  scale: 0.8;
}

.note-move {
  transition: transform 0.5s var(--ease);
}
</style>
