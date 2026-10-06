<script setup lang="ts">
import { formatClock, timeLeft } from '~/lib/board'

const board = useBoard()
const now = useNow(250)
const left = computed(() => (board.room ? timeLeft(board.room, now.value) : 0))
const running = computed(() => left.value > 0)

// Время вышло — коротко «звеним» вибрацией (на телефоне) и миганием.
const ringing = ref(false)
watch(running, (is, was) => {
  if (was && !is && board.room?.timerEnd) {
    ringing.value = true
    navigator.vibrate?.(200)
    setTimeout(() => (ringing.value = false), 3000)
  }
})

const start = (minutes: number) => board.setTimer(Date.now() + minutes * 60_000)
</script>

<template>
  <div class="timer" :class="{ 'is-running': running, 'is-ringing': ringing }">
    <span v-if="running || ringing" class="timer__clock" role="timer" aria-live="off">⏱ {{ formatClock(left) }}</span>
    <template v-if="board.isOwner">
      <template v-if="!running">
        <button v-for="m in [3, 5, 10]" :key="m" type="button" class="timer__btn" :aria-label="`Таймер на ${m} минут`" @click="start(m)">
          {{ m }}′
        </button>
      </template>
      <button v-else type="button" class="timer__btn" aria-label="Остановить таймер" @click="board.setTimer(null)">■</button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.timer {
  display: flex;
  align-items: center;
  gap: 4px;
}

.timer__clock {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-weight: 800;
  font-variant-numeric: tabular-nums;

  .is-ringing & {
    background: var(--accent-2);
    animation: ring 0.5s ease-in-out 6;
  }
}

@keyframes ring {
  50% {
    scale: 1.1;
  }
}

.timer__btn {
  min-width: 34px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface);
  font-size: 0.8rem;
  font-weight: 800;

  &:hover {
    border-color: var(--ink);
  }
}
</style>
