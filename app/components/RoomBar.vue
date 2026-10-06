<script setup lang="ts">
import { PHASES, toMarkdown } from '~/lib/board'

const board = useBoard()
const toasts = useToasts()

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text)
    toasts.show(done)
  } catch {
    toasts.show('Браузер не дал скопировать — выделите адрес вручную', 'error')
  }
}

const shareLink = () => copy(location.href, 'Ссылка скопирована — отправьте её команде')
const exportMd = () => board.state && copy(toMarkdown(board.state), 'Итоги в Markdown скопированы')
</script>

<template>
  <div class="bar">
    <div class="bar__title">
      <h1>{{ board.room?.title }}</h1>
      <button type="button" class="btn btn--sm" aria-label="Пригласить: скопировать ссылку" @click="shareLink">
        🔗<span class="bar__label"> Пригласить</span>
      </button>
    </div>

    <nav class="phases" aria-label="Этапы ретро">
      <button
        v-for="(p, i) in PHASES"
        :key="p.id"
        type="button"
        class="phase"
        :aria-current="board.phase === p.id ? 'step' : undefined"
        :disabled="!board.isOwner"
        :title="board.isOwner ? `Перейти к этапу «${p.title}»` : 'Этапы переключает ведущий'"
        @click="board.setPhase(p.id)"
      >
        <span class="phase__num">{{ i + 1 }}</span>
        {{ p.title }}
      </button>
    </nav>

    <div class="bar__side">
      <RoomTimer />
      <ul class="people" :aria-label="`Онлайн: ${board.participants.length}`">
        <li v-for="p in board.participants.slice(0, 5)" :key="p.id">
          <UserAvatar :name="p.name" :title="p.id === board.userId ? `${p.name} (вы)` : p.name" :color="p.color" />
        </li>
        <li v-if="board.participants.length > 5" class="people__more">+{{ board.participants.length - 5 }}</li>
      </ul>
      <button v-if="board.phase === 'discuss'" type="button" class="btn btn--sm" @click="exportMd">⬇ Итоги</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.bar {
  position: sticky;
  z-index: 20;
  top: 8px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px 20px;
  padding: 10px 12px 10px 18px;
  border-radius: 22px;
  background: rgb(255 255 255 / 85%);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow);

  @media (max-width: 1100px) {
    grid-template-columns: 1fr auto;

    .phases {
      grid-column: 1 / -1;
      grid-row: 2;
      justify-self: start;
    }
  }

  // Телефон: три строки — название, этапы на всю ширину, таймер и участники.
  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
    padding: 10px;

    .phases {
      grid-row: auto;
      justify-self: stretch;
    }

    .phase {
      flex: 1;
      justify-content: center;
      padding: 0 6px;
      font-size: 0.8rem;
    }

    .phase__num {
      display: none;
    }

    .bar__side {
      justify-content: space-between;
    }
  }
}

.bar__label {
  @media (max-width: 640px) {
    display: none;
  }
}

.bar__title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;

  h1 {
    overflow: hidden;
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.phases {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: var(--bg);
}

.phase {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px 0 6px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  font-size: 0.88rem;
  font-weight: 700;
  transition:
    background-color 0.3s,
    color 0.3s;

  &:disabled {
    cursor: default;
  }

  &[aria-current='step'] {
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow);

    .phase__num {
      background: var(--accent);
      color: #fff;
    }
  }
}

.phase__num {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-2);
  font-size: 0.75rem;
  transition: background-color 0.3s;
}

.bar__side {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.people {
  display: flex;

  li + li {
    margin-left: -8px;
  }
}

.people__more {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 2px solid var(--surface);
  border-radius: 50%;
  background: var(--bg-2);
  font-size: 0.75rem;
  font-weight: 800;
}
</style>
