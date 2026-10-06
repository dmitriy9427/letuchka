<script setup lang="ts">
import { COLUMNS, PHASES } from '~/lib/board'

const board = useBoard()
const phaseInfo = computed(() => PHASES.find((p) => p.id === board.phase)!)
</script>

<template>
  <div class="room">
    <RoomBar />
    <!-- Transition — плавная смена подсказки при переключении этапа (key меняется). -->
    <Transition name="hint" mode="out-in">
      <p :key="board.phase" class="hint" :data-phase="board.phase">
        <b>{{ phaseInfo.title }}.</b> {{ phaseInfo.hint }}
        <span v-if="board.phase === 'vote'" class="hint__votes">
          Осталось голосов:
          <i v-for="n in 3" :key="n" :class="{ 'is-on': n <= board.myVotesLeft }" />
        </span>
      </p>
    </Transition>
    <CursorLayer>
      <div class="columns">
        <BoardColumn v-for="column in COLUMNS" :key="column.id" :column="column" />
      </div>
    </CursorLayer>
    <Reactions />
  </div>
</template>

<style scoped lang="scss">
.room {
  display: grid;
  gap: 14px;
  padding: 0 var(--gutter) 120px;
}

.hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  width: fit-content;
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink-2);
  font-size: 0.9rem;
  box-shadow: var(--shadow);

  b {
    color: var(--ink);
  }
}

.hint__votes {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;

  i {
    width: 10px;
    height: 10px;
    border: 2px solid var(--accent);
    border-radius: 50%;
    transition: background-color 0.3s;

    &.is-on {
      background: var(--accent);
    }
  }
}

.hint-enter-active,
.hint-leave-active {
  transition: all 0.3s var(--ease);
}

.hint-enter-from {
  opacity: 0;
  translate: 0 -6px;
}

.hint-leave-to {
  opacity: 0;
  translate: 0 6px;
}

.columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}
</style>
