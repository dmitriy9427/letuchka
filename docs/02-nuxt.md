# 02. Nuxt: «Next.js для Vue»

Nuxt для Vue — то же, что Next.js для React: маршруты из файлов, сборка,
настройки, серверный рендер, модули. Если читал главу про Next.js в «Тропе» —
половина знакома.

## Папки (Nuxt 4)

```
app/
  app.vue            корневой компонент (как layout.tsx в Next)
  pages/             маршруты = файлы
    index.vue        → /
    r/[id].vue       → /r/abc12345   ([id] — параметр, как в Next)
  components/        компоненты — импортируются автоматически
  composables/       функции use*() — импортируются автоматически
  stores/            сторы Pinia
  lib/               своя логика — импортируется явно
  assets/styles/     глобальные стили
public/              файлы как есть (favicon)
nuxt.config.ts       настройки
```

## Авто-импорты

В компонентах «Летучки» почти нет `import`: `ref`, `computed`, `watch`,
`useRoute`, `useHead`, компоненты из `components/`, функции из `composables/`,
сторы из `stores/` — Nuxt подставляет сам. Он сканирует папки и генерирует
объявления типов в `.nuxt/`, поэтому TypeScript и подсказки в редакторе
работают.

Логику доски (`app/lib/`) я импортирую **явно**: это обычный TypeScript без
Nuxt, его тестирует Vitest без запуска фреймворка, и сразу видно, откуда что.

Имена компонентов: `components/NoteCard.vue` → `<NoteCard />`. Если положить в
подпапку `components/board/Card.vue` — будет `<BoardCard />`.

## Маршруты и навигация

| Next.js | Nuxt |
| --- | --- |
| `app/r/[id]/page.tsx` | `app/pages/r/[id].vue` |
| `<Link href>` | `<NuxtLink to>` |
| `useRouter().push()` | `useRouter().push()` |
| `useParams()` | `useRoute().params` |
| `layout.tsx` | `app.vue` (и `layouts/`) |
| `metadata` | `useHead({ title })` |

`<NuxtPage />` в `app.vue` — место, куда подставляется страница по адресу.

## nuxt.config.ts

```ts
ssr: false,
```
Приложение целиком работает в браузере (SPA). Все данные — из Supabase по
сети, а свой сервер нам не нужен, сайт лежит на GitHub Pages. С `ssr: true`
(по умолчанию) Nuxt рендерил бы страницы на сервере — для контентных сайтов
это лучше для SEO, но требует Node-сервера или пререндера.

```ts
runtimeConfig: { public: { supabaseUrl: '', supabaseKey: '' } }
```
Настройки, которые можно переопределить переменными окружения:
`NUXT_PUBLIC_SUPABASE_URL` → `supabaseUrl`. Всё внутри `public` попадает в
браузер — **только публичные значения**. В коде: `useRuntimeConfig().public`.

```ts
app: { baseURL: process.env.NUXT_APP_BASE_URL ?? '/' }
```
Подпапка на GitHub Pages (`/letuchka/`). `NuxtLink` и роутер учитывают её сами.

```ts
modules: ['@pinia/nuxt', '@nuxt/eslint']
```
Модули Nuxt — плагины для сборки: подключают Pinia (авто-импорт сторов),
генерируют конфиг ESLint под авто-импорты.

## Сборка

`nuxt generate` → `.output/public`: `index.html`, `200.html`, `404.html` и JS.
При `ssr: false` все HTML одинаковые — пустая оболочка, приложение
рисуется в браузере. `404.html` нужен GitHub Pages: на адрес `/r/abc12345`
файла нет, Pages отдаёт `404.html`, загружается приложение, и роутер Nuxt
открывает нужную комнату.

## Где выполняется код

Даже при `ssr: false` полезно помнить: в `<script setup>` нельзя трогать
`window`, `localStorage`, `document` **на верхнем уровне**, если когда-нибудь
включите SSR — на сервере их нет. Поэтому в проекте такие обращения — в
`onMounted` или в функциях, которые вызываются из него.
