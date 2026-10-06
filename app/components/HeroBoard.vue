<!--
  Иллюстрация на главной: мини-доска, по которой «гуляют» курсоры коллег,
  а стикеры появляются по очереди. Только разметка и CSS-анимации.
-->
<script setup lang="ts">
const NOTES = [
  { text: 'Релиз без ночных деплоев 🎉', col: 0, row: 0, tone: 'good' },
  { text: 'Ревью отвечают за час', col: 0, row: 1, tone: 'good' },
  { text: 'Тесты на CI идут 40 минут', col: 1, row: 0, tone: 'bad' },
  { text: 'Задачи прилетают посреди спринта', col: 1, row: 1, tone: 'bad' },
  { text: 'Кэш для зависимостей в CI', col: 2, row: 0, tone: 'ideas' },
]
const CURSORS = [
  { name: 'Аня', color: '#ff6b8b', path: 'a' },
  { name: 'Макс', color: '#16b3a0', path: 'b' },
]
</script>

<template>
  <div class="mini" aria-hidden="true">
    <div class="mini__cols">
      <div v-for="(title, c) in ['Хорошо', 'Мешало', 'Идеи']" :key="title" class="mini__col">
        <p class="mini__head">{{ title }}</p>
        <template v-for="(n, i) in NOTES" :key="i">
          <p
            v-if="n.col === c"
            class="mini__note"
            :class="`mini__note--${n.tone}`"
            :style="{ '--d': `${0.3 + i * 0.35}s`, '--r': `${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg` }"
          >
            {{ n.text }}
            <span v-if="n.tone !== 'ideas'" class="mini__votes">
              <i v-for="v in 3 - n.row" :key="v" />
            </span>
          </p>
        </template>
      </div>
    </div>
    <span
      v-for="c in CURSORS"
      :key="c.name"
      class="mini__cursor"
      :class="`mini__cursor--${c.path}`"
      :style="{ '--c': c.color }"
    >
      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="currentColor" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" /></svg>
      <b>{{ c.name }}</b>
    </span>
  </div>
</template>

<style scoped lang="scss">
.mini {
  position: relative;
  padding: 18px;
  border-radius: 28px;
  background: var(--surface);
  box-shadow: var(--shadow-lift);
  rotate: 1.5deg;
}

.mini__cols {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.mini__col {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 300px;
  padding: 12px;
  border-radius: 16px;
  background: var(--bg);
}

.mini__head {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--ink-2);
}

.mini__note {
  position: relative;
  padding: 12px 12px 22px;
  border-radius: 6px 6px 14px 6px;
  font-family: var(--hand);
  font-size: 1.15rem;
  line-height: 1.1;
  box-shadow: 0 6px 14px -8px rgb(29 21 52 / 40%);
  rotate: var(--r);
  animation: stick 0.6s var(--d) var(--ease) both;

  &--good {
    background: var(--good);
  }

  &--bad {
    background: var(--bad);
  }

  &--ideas {
    background: var(--ideas);
  }
}

@keyframes stick {
  from {
    opacity: 0;
    scale: 0.6;
    translate: 0 -20px;
  }
}

.mini__votes {
  position: absolute;
  right: 8px;
  bottom: 6px;
  display: flex;
  gap: 3px;

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
}

.mini__cursor {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: flex-start;
  color: var(--c);
  pointer-events: none;

  b {
    margin: 14px 0 0 -4px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--c);
    color: #fff;
    font-size: 0.72rem;
  }

  &--a {
    animation: path-a 9s ease-in-out infinite;
  }

  &--b {
    animation: path-b 11s ease-in-out infinite;
  }
}

@keyframes path-a {
  0%,
  100% {
    translate: 60px 90px;
  }

  30% {
    translate: 220px 160px;
  }

  60% {
    translate: 130px 270px;
  }
}

@keyframes path-b {
  0%,
  100% {
    translate: 380px 230px;
  }

  40% {
    translate: 300px 80px;
  }

  70% {
    translate: 420px 140px;
  }
}
</style>
