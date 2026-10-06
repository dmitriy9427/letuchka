<script setup lang="ts">
import { initials } from '~/lib/board'

// defineProps — входные параметры компонента (как props в React), с типами.
defineProps<{ name: string; color: string; size?: number; title?: string }>()
</script>

<template>
  <span class="avatar" :style="{ '--c': color, '--s': `${size ?? 34}px` }" :title="title ?? name">
    {{ initials(name) }}
  </span>
</template>

<style scoped lang="scss">
.avatar {
  display: inline-grid;
  place-items: center;
  width: var(--s);
  height: var(--s);
  border: 2px solid var(--surface);
  border-radius: 50%;
  background: var(--c);
  color: #fff;
  font-size: calc(var(--s) * 0.36);
  font-weight: 800;
  flex: none;
}
</style>
