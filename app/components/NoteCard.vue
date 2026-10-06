<script setup lang="ts">
import { canEdit, colorOf, isHidden, plural, votedBy, votesFor } from '~/lib/board'
import type { Card } from '~/lib/types'

const props = defineProps<{ card: Card }>()
const board = useBoard()

const hidden = computed(() => isHidden(props.card, board.phase, board.userId))
const mine = computed(() => props.card.authorId === board.userId)
const editable = computed(() => canEdit(props.card, board.phase, board.userId))
const votes = computed(() => (board.state ? votesFor(board.state.votes, props.card.id) : 0))
const voted = computed(() => !!board.state && votedBy(board.state.votes, props.card.id, board.userId))
const focused = computed(() => board.room?.focusCardId === props.card.id)
// Чуть повёрнут, как настоящий стикер; угол постоянный — зависит от id.
const tilt = computed(() => ((props.card.id.charCodeAt(0) + props.card.id.charCodeAt(1)) % 5) - 2)

const editing = ref(false)
const draft = ref('')
const input = ref<HTMLTextAreaElement | null>(null)

async function startEdit() {
  draft.value = props.card.text
  editing.value = true
  // nextTick — дождаться, пока Vue обновит DOM (textarea появится), потом фокус.
  await nextTick()
  input.value?.focus()
}

async function save() {
  editing.value = false
  const text = draft.value.trim()
  if (!text) return board.deleteCard(props.card.id)
  if (text !== props.card.text) await board.updateCard(props.card.id, text)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void save()
  }
  if (event.key === 'Escape') editing.value = false
}
</script>

<template>
  <article
    class="note"
    :class="{ 'is-hidden': hidden, 'is-mine': mine, 'is-focused': focused, 'is-voted': voted }"
    :style="{ '--tilt': `${tilt}deg` }"
  >
    <template v-if="hidden">
      <p class="note__text" aria-hidden="true">{{ card.text.replace(/\S/g, '•') }}</p>
      <p class="visually-hidden">Карточка {{ card.authorName }} — откроется на этапе голосования</p>
    </template>
    <textarea
      v-else-if="editing"
      ref="input"
      v-model="draft"
      class="note__edit"
      maxlength="280"
      rows="3"
      aria-label="Текст карточки"
      @blur="save"
      @keydown="onKey"
    />
    <p v-else class="note__text">{{ card.text }}</p>

    <footer class="note__foot">
      <span class="note__author" :style="{ '--c': colorOf(card.authorId) }">{{ mine ? 'Вы' : card.authorName }}</span>

      <div v-if="editable && !editing" class="note__tools">
        <button type="button" aria-label="Изменить" @click="startEdit">✎</button>
        <button type="button" aria-label="Удалить" @click="board.deleteCard(card.id)">✕</button>
      </div>

      <button
        v-if="board.phase === 'vote'"
        type="button"
        class="vote"
        :aria-pressed="voted"
        :aria-label="voted ? 'Снять голос' : 'Проголосовать'"
        @click="board.toggleVote(card.id)"
      >
        <span aria-hidden="true">{{ voted ? '●' : '○' }}</span>
        {{ voted ? 'Мой голос' : 'Голос' }}
      </button>

      <template v-if="board.phase === 'discuss'">
        <span v-if="votes" class="badge">{{ votes }} {{ plural(votes, 'голос', 'голоса', 'голосов') }}</span>
        <button
          v-if="board.isOwner"
          type="button"
          class="focus-btn"
          :aria-pressed="focused"
          @click="board.setFocus(focused ? null : card.id)"
        >
          {{ focused ? 'Обсудили' : 'Обсуждаем' }}
        </button>
      </template>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.note {
  position: relative;
  display: grid;
  gap: 10px;
  padding: 14px 14px 10px;
  border-radius: 6px 6px 18px 6px;
  background: var(--tone);
  box-shadow: 0 8px 18px -12px rgb(29 21 52 / 55%);
  rotate: var(--tilt);
  transition:
    rotate 0.3s var(--ease),
    translate 0.3s var(--ease),
    box-shadow 0.3s var(--ease),
    opacity 0.3s;

  &:hover {
    rotate: 0deg;
    translate: 0 -2px;
    box-shadow: var(--shadow-lift);
  }

  &.is-hidden {
    opacity: 0.75;

    .note__text {
      color: transparent;
      text-shadow: 0 0 8px rgb(29 21 52 / 45%);
      user-select: none;
    }
  }

  // Карточку, которую обсуждают, видно издалека: подъём и пульсирующая рамка.
  &.is-focused {
    z-index: 2;
    rotate: 0deg;
    scale: 1.04;
    box-shadow:
      0 0 0 3px var(--accent),
      var(--shadow-lift);
    animation: pulse 1.6s ease-in-out infinite;
  }
}

@keyframes pulse {
  50% {
    box-shadow:
      0 0 0 7px rgb(124 92 255 / 25%),
      var(--shadow-lift);
  }
}

.note__text {
  font-family: var(--hand);
  font-size: 1.35rem;
  line-height: 1.15;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.note__edit {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: var(--hand);
  font-size: 1.35rem;
  line-height: 1.15;
  resize: none;
  outline: none;
}

.note__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 30px;
}

.note__author {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
  color: var(--ink-2);
  font-size: 0.75rem;
  font-weight: 700;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
  }
}

.note__tools {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;

  .note:hover &,
  .note:focus-within & {
    opacity: 1;
  }

  @media (hover: none) {
    opacity: 1;
  }

  button {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 8px;
    background: rgb(255 255 255 / 55%);
    font-size: 0.85rem;

    &:hover {
      background: #fff;
    }
  }
}

.vote,
.focus-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 1.5px solid rgb(29 21 52 / 18%);
  border-radius: 999px;
  background: rgb(255 255 255 / 60%);
  font-size: 0.78rem;
  font-weight: 800;
  transition:
    background-color 0.2s,
    color 0.2s,
    scale 0.2s var(--ease);

  &:active {
    scale: 0.94;
  }

  &[aria-pressed='true'] {
    border-color: transparent;
    background: var(--accent);
    color: #fff;
  }
}

.badge {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
}
</style>
