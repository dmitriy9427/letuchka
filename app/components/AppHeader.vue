<script setup lang="ts">
// <script setup> — короткая запись компонента Vue 3: всё, что объявлено здесь,
// сразу доступно в шаблоне. Импорт компонентов и composables делает Nuxt.
const backend = useBackend()
const isLocal = backend.kind === 'local'
</script>

<template>
  <header class="header">
    <NuxtLink to="/" class="brand" aria-label="Летучка — на главную">
      <span class="brand__mark" aria-hidden="true">
        <i /><i /><i />
      </span>
      Летучка
    </NuxtLink>
    <p v-if="isLocal" class="mode" title="Нет ключей Supabase: данные живут в этом браузере, коллеги — это другие вкладки">
      <span aria-hidden="true">●</span> Демо-режим: между вкладками
    </p>
    <a class="header__link" href="https://github.com/dmitriy9427/letuchka" target="_blank" rel="noreferrer">GitHub</a>
  </header>
</template>

<style scoped lang="scss">
// scoped — стили только для этого компонента: Vue добавляет элементам
// атрибут data-v-xxxx и дописывает его к селекторам.
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 64px;
  padding: 0 var(--gutter);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.brand__mark {
  position: relative;
  width: 30px;
  height: 30px;

  i {
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgb(29 21 52 / 15%);
    transition: rotate 0.4s var(--ease), translate 0.4s var(--ease);

    &:nth-child(1) {
      top: 0;
      left: 0;
      background: var(--good);
      rotate: -8deg;
    }

    &:nth-child(2) {
      top: 10px;
      left: 11px;
      background: var(--bad);
      rotate: 6deg;
    }

    &:nth-child(3) {
      top: 2px;
      left: 14px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
    }
  }

  .brand:hover & i:nth-child(1) {
    rotate: -18deg;
    translate: -2px -2px;
  }

  .brand:hover & i:nth-child(2) {
    rotate: 14deg;
    translate: 2px 2px;
  }
}

.mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgb(255 159 67 / 16%);
  color: #a05a12;
  font-size: 0.8rem;
  font-weight: 700;

  span {
    font-size: 0.6rem;
  }

  @media (max-width: 640px) {
    display: none;
  }
}

.header__link {
  margin-left: auto;
  color: var(--ink-2);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;

  &:hover {
    color: var(--ink);
  }
}
</style>
