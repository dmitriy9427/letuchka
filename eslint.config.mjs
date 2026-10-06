// Конфиг ESLint генерирует модуль @nuxt/eslint (знает про авто-импорты Nuxt).
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Однословные имена компонентов (Board, Card) — нормально для приложения.
    'vue/multi-word-component-names': 'off',
  },
})
