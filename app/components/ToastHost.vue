<script setup lang="ts">
const toasts = useToasts()
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <!-- TransitionGroup анимирует появление и исчезновение элементов списка. -->
    <TransitionGroup name="toast">
      <p v-for="t in toasts.list" :key="t.id" class="toast" :data-tone="t.tone">{{ t.text }}</p>
    </TransitionGroup>
  </div>
</template>

<style scoped lang="scss">
.toasts {
  position: fixed;
  z-index: 100;
  bottom: max(20px, env(safe-area-inset-bottom));
  left: 50%;
  display: grid;
  justify-items: center;
  gap: 8px;
  translate: -50% 0;
  pointer-events: none;
}

.toast {
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: var(--shadow-lift);

  &[data-tone='error'] {
    background: #d63a5c;
  }
}

// Классы, которые ставит TransitionGroup: *-enter-from → *-enter-active → …
.toast-enter-active,
.toast-leave-active {
  transition: all 0.35s var(--ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  translate: 0 12px;
}
</style>
