<!--
  Корневой компонент. <NuxtPage> — место, куда Nuxt подставляет страницу из
  app/pages по текущему адресу (как <Outlet/> в React Router).
-->
<template>
  <div class="app">
    <AppHeader />
    <NuxtPage />
    <ToastHost />
  </div>
</template>
