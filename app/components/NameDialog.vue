<script setup lang="ts">
// defineEmits — события, которые компонент отдаёт родителю (как колбэк-проп onSubmit в React).
const emit = defineEmits<{ submit: [name: string] }>()
const name = ref('')
const dialog = ref<HTMLDialogElement | null>(null)

// Ссылка на DOM-элемент: ref с тем же именем, что атрибут ref в шаблоне.
onMounted(() => dialog.value?.showModal())
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="name-title" @cancel.prevent>
    <form class="dialog__body" @submit.prevent="name.trim() && emit('submit', name)">
      <p class="dialog__emoji" aria-hidden="true">👋</p>
      <h2 id="name-title">Как вас подписать?</h2>
      <p>Имя увидят участники ретро рядом с вашими карточками и курсором.</p>
      <input v-model="name" class="field" maxlength="40" placeholder="Ваше имя" autofocus required autocomplete="given-name" >
      <button class="btn btn--accent" type="submit" :disabled="!name.trim()">Войти в комнату</button>
    </form>
  </dialog>
</template>

<style scoped lang="scss">
.dialog {
  width: min(400px, calc(100% - 32px));
  padding: 0;
  border: 0;
  border-radius: 24px;
  box-shadow: var(--shadow-lift);

  &::backdrop {
    background: rgb(29 21 52 / 35%);
    backdrop-filter: blur(4px);
  }

  &[open] {
    animation: pop 0.4s var(--ease);
  }
}

@keyframes pop {
  from {
    opacity: 0;
    scale: 0.95;
    translate: 0 10px;
  }
}

.dialog__body {
  display: grid;
  gap: 12px;
  padding: 28px;
  text-align: center;

  h2 {
    font-size: 1.4rem;
    letter-spacing: -0.02em;
  }

  p {
    color: var(--ink-2);
  }
}

.dialog__emoji {
  font-size: 2.4rem;
}
</style>
