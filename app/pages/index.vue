<script setup lang="ts">
// Файл pages/index.vue → адрес «/». Маршруты в Nuxt — это файлы, как в Next.js.
const session = useSession()
const toasts = useToasts()
const router = useRouter()

// ref — реактивное значение (как useState). В шаблоне .value писать не нужно.
const name = ref('')
const title = ref('')
const busy = ref(false)

// onMounted — после появления компонента на странице (как useEffect(..., [])).
onMounted(async () => {
  await session.load()
  name.value = session.user?.name ?? ''
})

async function create() {
  if (!name.value.trim()) return
  busy.value = true
  try {
    const user = await session.signIn(name.value)
    const id = await useBackend().createRoom(title.value || `Ретро ${new Date().toLocaleDateString('ru-RU')}`, user)
    await router.push(`/r/${id}`)
  } catch (error) {
    toasts.show(error instanceof Error ? error.message : 'Не получилось создать комнату', 'error')
  } finally {
    busy.value = false
  }
}

const STEPS = [
  { emoji: '🔗', title: 'Создайте комнату', text: 'Без регистрации: только ваше имя. Ссылку отправьте команде.' },
  { emoji: '✍️', title: 'Пишите вслепую', text: 'Пока все пишут, чужие карточки скрыты — никто ни на кого не равняется.' },
  { emoji: '🗳', title: 'Голосуйте и обсуждайте', text: 'По 3 голоса на человека, дальше — от самых важных карточек.' },
]
</script>

<template>
  <main>
    <section class="hero">
      <div class="hero__copy">
        <p class="eyebrow">Ретроспектива для команды</p>
        <h1 class="hero__title">Ретро, на&nbsp;которое <em>хочется</em> прийти</h1>
        <p class="hero__lead">
          Карточки, голосование, таймер и курсоры коллег — в реальном времени. Работает в браузере, регистрация не нужна.
        </p>

        <!-- @submit.prevent — обработчик отправки + event.preventDefault() одной записью. -->
        <form class="create" @submit.prevent="create">
          <div>
            <label class="label" for="name">Ваше имя</label>
            <!-- v-model — двусторонняя связь поля и переменной (value + onInput в React). -->
            <input id="name" v-model="name" class="field" maxlength="40" placeholder="Например, Аня" required autocomplete="given-name" >
          </div>
          <div>
            <label class="label" for="title">Название встречи</label>
            <input id="title" v-model="title" class="field" maxlength="80" placeholder="Ретро спринта 42" >
          </div>
          <button class="btn btn--accent create__submit" type="submit" :disabled="busy || !name.trim()">
            {{ busy ? 'Создаём…' : 'Создать комнату' }}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </div>

      <HeroBoard class="hero__art" />
    </section>

    <section class="steps" aria-labelledby="steps-title">
      <h2 id="steps-title" class="steps__title">Как это работает</h2>
      <ol class="steps__list">
        <!-- v-for — цикл по списку (как .map в JSX); :key обязателен, как key в React. -->
        <li v-for="(step, i) in STEPS" :key="step.title" class="step" :style="{ '--i': i }">
          <span class="step__emoji" aria-hidden="true">{{ step.emoji }}</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.text }}</p>
        </li>
      </ol>
    </section>

    <footer class="footer">
      Летучка — пет-проект <a href="https://dmitriy9427.github.io/resume/">Дмитрия Рябова</a> на Nuxt и Supabase.
    </footer>
  </main>
</template>

<style scoped lang="scss">
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(24px, 5vw, 72px);
  min-height: calc(100svh - 64px);
  padding: 24px var(--gutter) 64px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    min-height: auto;
  }
}

.hero__copy {
  display: grid;
  gap: 20px;
  max-width: 560px;
}

.eyebrow {
  width: fit-content;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 800;
  box-shadow: var(--shadow);
}

.hero__title {
  font-size: clamp(2.4rem, 5.6vw, 4.4rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.035em;
  text-wrap: balance;

  em {
    position: relative;
    font-style: normal;
    color: var(--accent);

    // Подчёркивание «маркером».
    &::after {
      content: '';
      position: absolute;
      z-index: -1;
      right: -4px;
      bottom: 0.06em;
      left: -4px;
      height: 0.32em;
      border-radius: 6px;
      background: var(--good);
      transform-origin: left;
      animation: marker 0.9s 0.4s var(--ease) both;
    }
  }
}

@keyframes marker {
  from {
    transform: scaleX(0);
  }
}

.hero__lead {
  max-width: 470px;
  color: var(--ink-2);
  font-size: 1.08rem;
}

.create {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 20px;
  border-radius: calc(var(--radius) + 6px);
  background: var(--surface);
  box-shadow: var(--shadow-lift);

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
}

.create__submit {
  grid-column: 1 / -1;
  min-height: 50px;
  font-size: 1rem;

  span {
    transition: translate 0.3s var(--ease);
  }

  &:hover span {
    translate: 4px 0;
  }
}

.steps {
  display: grid;
  gap: 28px;
  padding: 72px var(--gutter);
}

.steps__title {
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.steps__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
}

.step {
  display: grid;
  gap: 8px;
  padding: 24px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  transition: translate 0.35s var(--ease), box-shadow 0.35s var(--ease);

  &:hover {
    translate: 0 -4px;
    box-shadow: var(--shadow-lift);
  }

  h3 {
    font-size: 1.15rem;
  }

  p {
    color: var(--ink-2);
  }
}

.step__emoji {
  font-size: 1.8rem;
}

.footer {
  padding: 32px var(--gutter) 48px;
  color: var(--muted);
  font-size: 0.88rem;
}
</style>
