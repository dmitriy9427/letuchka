<script setup lang="ts">
// Файл pages/r/[id].vue → адреса /r/abc12345: [id] — параметр маршрута.
const route = useRoute()
const session = useSession()
const board = useBoard()
const roomId = computed(() => String(route.params.id))

onMounted(async () => {
  await session.load()
  if (session.user) await board.join(roomId.value)
})

// watch — реакция на изменение значения (как useEffect с зависимостью).
// Перешли из одной комнаты в другую — переподключаемся.
watch(roomId, (id) => session.user && board.join(id))
onUnmounted(() => board.leave())

async function enter(name: string) {
  await session.signIn(name)
  await board.join(roomId.value)
}

// Заголовок вкладки — название комнаты.
useHead({ title: () => (board.room ? `${board.room.title} · Летучка` : 'Летучка') })
</script>

<template>
  <main class="room-page">
    <NameDialog v-if="session.loaded && !session.user" @submit="enter" />
    <RoomView v-else-if="board.status === 'ready'" />
    <div v-else-if="board.status === 'not-found'" class="state">
      <p class="state__emoji" aria-hidden="true">🕳</p>
      <h1>Комната не найдена</h1>
      <p>Проверьте ссылку. В демо-режиме комнаты живут только в браузере, где их создали.</p>
      <NuxtLink class="btn btn--accent" to="/">Создать новую</NuxtLink>
    </div>
    <div v-else-if="board.status === 'error'" class="state">
      <p class="state__emoji" aria-hidden="true">📡</p>
      <h1>Нет связи с сервером</h1>
      <p>Проверьте интернет и обновите страницу.</p>
    </div>
    <div v-else class="state" aria-busy="true">
      <p class="state__spinner" aria-label="Загрузка" />
    </div>
  </main>
</template>

<style scoped lang="scss">
.state {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 12px;
  min-height: 60svh;
  padding: 0 var(--gutter);
  text-align: center;

  h1 {
    font-size: 1.8rem;
    letter-spacing: -0.02em;
  }

  p {
    max-width: 420px;
    color: var(--ink-2);
  }
}

.state__emoji {
  font-size: 3rem;
}

.state__spinner {
  width: 36px;
  height: 36px;
  border: 4px solid var(--bg-2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}
</style>
