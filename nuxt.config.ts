// Настройки Nuxt. Подробно о каждом пункте — docs/02-nuxt.md.
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',

  // Приложение целиком работает в браузере (SPA): все данные приходят из
  // Supabase по сети, а сервера у нас нет — сайт лежит на GitHub Pages.
  // `nuxt generate` соберёт статические файлы в .output/public.
  ssr: false,

  modules: ['@pinia/nuxt', '@nuxt/eslint'],

  css: ['@fontsource-variable/manrope', '@fontsource/caveat/cyrillic-500.css', '@fontsource/caveat/latin-500.css', '~/assets/styles/main.scss'],

  app: {
    // На GitHub Pages сайт живёт в подпапке /letuchka/ — её передаёт сборка в Actions.
    baseURL: process.env.NUXT_APP_BASE_URL ?? '/',
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'Летучка — онлайн-ретро для команды',
      meta: [
        { name: 'description', content: 'Ретроспектива в реальном времени: карточки, голосование, таймер и курсоры коллег. Без регистрации.' },
        { name: 'theme-color', content: '#f3f0ff' },
        { property: 'og:title', content: 'Летучка — онлайн-ретро для команды' },
        { property: 'og:description', content: 'Карточки, голосование и курсоры коллег в реальном времени.' },
        { property: 'og:image', content: 'https://dmitriy9427.github.io/letuchka/og.jpg' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: `${process.env.NUXT_APP_BASE_URL ?? '/'}favicon.svg` }],
    },
  },

  // Публичные настройки — доступны в браузере через useRuntimeConfig().public.
  // Значения подставляются из переменных окружения NUXT_PUBLIC_SUPABASE_URL
  // и NUXT_PUBLIC_SUPABASE_KEY (файл .env или секреты GitHub Actions).
  // Пусто — приложение работает на локальном «бэкенде» между вкладками.
  runtimeConfig: {
    public: {
      supabaseUrl: '',
      supabaseKey: '',
    },
  },

  typescript: { strict: true },
  eslint: { config: { stylistic: false } },
})
