<script setup lang="ts">
// Реакции: эмодзи взлетают у всех участников. Ничего не сохраняется —
// это эфемерное сообщение через канал комнаты.
const board = useBoard()
const EMOJI = ['👍', '🎉', '😂', '🔥', '🤔', '❤️']

// Случайная горизонталь для каждой реакции — по её id, чтобы у всех одинаково.
const left = (id: string) => 10 + (parseInt(id.replace(/\D/g, '').slice(0, 4) || '0', 10) % 80)
</script>

<template>
  <div class="reactions">
    <div class="reactions__bar" role="group" aria-label="Реакции">
      <button v-for="e in EMOJI" :key="e" type="button" :aria-label="`Реакция ${e}`" @click="board.sendReaction(e)">
        {{ e }}
      </button>
    </div>
    <div class="reactions__sky" aria-hidden="true">
      <span v-for="r in board.reactions" :key="r.id" class="fly" :style="{ left: `${left(r.id)}%` }">{{ r.emoji }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.reactions__bar {
  position: fixed;
  z-index: 40;
  bottom: max(18px, env(safe-area-inset-bottom));
  left: 50%;
  display: flex;
  gap: 2px;
  padding: 6px;
  border-radius: 999px;
  background: rgb(255 255 255 / 90%);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-lift);
  translate: -50% 0;

  button {
    width: 42px;
    height: 42px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    font-size: 1.35rem;
    transition: scale 0.2s var(--ease), background-color 0.2s;

    &:hover {
      scale: 1.25;
      background: var(--bg);
    }

    &:active {
      scale: 0.9;
    }
  }
}

.reactions__sky {
  position: fixed;
  z-index: 35;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.fly {
  position: absolute;
  bottom: 70px;
  font-size: 2.4rem;
  animation: fly 2.6s var(--ease) forwards;
}

@keyframes fly {
  0% {
    opacity: 0;
    scale: 0.4;
    translate: 0 0;
  }

  15% {
    opacity: 1;
    scale: 1.2;
  }

  50% {
    translate: 18px -35vh;
  }

  100% {
    opacity: 0;
    scale: 1;
    translate: -12px -70vh;
  }
}
</style>
