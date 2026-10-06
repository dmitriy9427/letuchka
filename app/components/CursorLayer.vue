<script setup lang="ts">
// Курсоры коллег поверх доски. Координаты передаём в «координатах доски»:
// x — доля ширины (0…1), у всех разная ширина экрана; y — пиксели от верха
// доски (колонки растут вниз одинаково). Отправка — не чаще 20 раз в секунду.
import { colorOf } from '~/lib/board'

const board = useBoard()
const root = ref<HTMLElement | null>(null)
const width = ref(1)
const now = useNow(1000)

const send = throttle((x: number, y: number) => board.sendCursor(x, y), 50)

function onMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || !root.value) return
  const rect = root.value.getBoundingClientRect()
  send((event.clientX - rect.left) / rect.width, event.clientY - rect.top)
}

// Ширину доски держим в ref, чтобы пересчитывать позиции чужих курсоров при ресайзе.
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => (width.value = entry!.contentRect.width))
  observer.observe(root.value!)
})
onUnmounted(() => observer?.disconnect())

// Курсор, который не двигался 8 секунд, прячем — человек отошёл или ушёл.
const visible = computed(() =>
  Object.values(board.cursors)
    .filter((c) => now.value - c.at < 8000)
    .map((c) => ({
      ...c,
      name: board.participants.find((p) => p.id === c.userId)?.name ?? '',
      color: colorOf(c.userId),
    }))
    .filter((c) => c.name),
)
</script>

<template>
  <div ref="root" class="layer" @pointermove="onMove">
    <slot />
    <span
      v-for="c in visible"
      :key="c.userId"
      class="cursor"
      :style="{ '--c': c.color, transform: `translate(${c.x * width}px, ${c.y}px)` }"
      aria-hidden="true"
    >
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path d="M3 2l7 19 2.5-7.5L20 11z" fill="currentColor" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" />
      </svg>
      <b>{{ c.name }}</b>
    </span>
  </div>
</template>

<style scoped lang="scss">
.layer {
  position: relative;
}

.cursor {
  position: absolute;
  z-index: 30;
  top: 0;
  left: 0;
  display: flex;
  align-items: flex-start;
  color: var(--c);
  pointer-events: none;
  // Обновления приходят ~20 раз в секунду — transition сглаживает рывки между ними.
  transition: transform 0.12s linear;

  b {
    margin: 16px 0 0 -4px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--c);
    color: #fff;
    font-size: 0.72rem;
    white-space: nowrap;
  }
}
</style>
