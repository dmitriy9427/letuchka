// Состояние открытой комнаты: данные, участники, курсоры, реакции и действия.
//
// Данные меняются только одним путём: действие → бэкенд → изменение (Change)
// → applyChange() → новое состояние. Свои действия и действия коллег
// проходят через одну и ту же функцию — поэтому экраны не расходятся.

import { defineStore } from 'pinia'
import { applyChange, canToggleVote, isOwner as ownerCheck, votedBy, votesLeft } from '~/lib/board'
import type { RoomConnection } from '~/lib/backend'
import type { ColumnId, Cursor, Participant, Phase, Reaction, RoomSnapshot } from '~/lib/types'
import { useSession } from './session'
import { useToasts } from './toasts'

type Status = 'idle' | 'loading' | 'ready' | 'not-found' | 'error'

export const useBoard = defineStore('board', () => {
  const state = ref<RoomSnapshot | null>(null)
  const status = ref<Status>('idle')
  const participants = ref<Participant[]>([])
  // Курсоры коллег: { id участника: координаты }. Обычный объект, а не Map:
  // Vue отслеживает изменения его ключей так же, как у ref на примитив.
  const cursors = ref<Record<string, Cursor & { at: number }>>({})
  const reactions = ref<Reaction[]>([])
  let connection: RoomConnection | null = null

  const session = useSession()
  const toasts = useToasts()
  const userId = computed(() => session.user?.id ?? '')

  // computed — вычисляемое значение: пересчитывается, только когда меняются
  // данные, от которых оно зависит (аналог useMemo без списка зависимостей).
  const room = computed(() => state.value?.room ?? null)
  const phase = computed<Phase>(() => room.value?.phase ?? 'write')
  const isOwner = computed(() => !!room.value && ownerCheck(room.value, userId.value))
  const myVotesLeft = computed(() => (state.value ? votesLeft(state.value.votes, userId.value) : 0))

  async function join(roomId: string) {
    leave()
    if (!session.user) return
    status.value = 'loading'
    try {
      connection = await useBackend().connect(roomId, session.user, {
        onChange: (change) => {
          if (state.value) state.value = applyChange(state.value, change)
        },
        onPresence: (list) => (participants.value = list),
        onCursor: (cursor) => {
          if (cursor.userId !== userId.value) cursors.value[cursor.userId] = { ...cursor, at: Date.now() }
        },
        onReaction: (reaction) => {
          reactions.value.push(reaction)
          setTimeout(() => (reactions.value = reactions.value.filter((r) => r.id !== reaction.id)), 2600)
        },
      })
      if (!connection) {
        status.value = 'not-found'
        return
      }
      state.value = connection.snapshot
      status.value = 'ready'
    } catch (error) {
      console.error(error)
      status.value = 'error'
    }
  }

  function leave() {
    connection?.leave()
    connection = null
    state.value = null
    participants.value = []
    cursors.value = {}
    status.value = 'idle'
  }

  /** Обёртка над действием: ошибку показываем уведомлением, а не роняем интерфейс. */
  async function run(action: (c: RoomConnection) => Promise<void>) {
    if (!connection) return
    try {
      await action(connection)
    } catch (error) {
      toasts.show(error instanceof Error ? error.message : 'Не получилось', 'error')
    }
  }

  const addCard = (column: ColumnId, text: string) => run((c) => c.addCard(column, text))
  const updateCard = (id: string, text: string) => run((c) => c.updateCard(id, text))
  const deleteCard = (id: string) => run((c) => c.deleteCard(id))

  function toggleVote(cardId: string) {
    if (!state.value || !room.value) return
    if (!canToggleVote(room.value, state.value.votes, cardId, userId.value)) {
      toasts.show('Голоса закончились — снимите голос с другой карточки')
      return
    }
    const on = !votedBy(state.value.votes, cardId, userId.value)
    return run((c) => c.toggleVote(cardId, on))
  }

  const setPhase = (next: Phase) => run((c) => c.setPhase(next))
  const setTimer = (endsAt: number | null) => run((c) => c.setTimer(endsAt))
  const setFocus = (cardId: string | null) => run((c) => c.setFocus(cardId))
  const sendCursor = (x: number, y: number) => connection?.sendCursor(x, y)
  const sendReaction = (emoji: string) => connection?.sendReaction(emoji)

  return {
    state,
    status,
    participants,
    cursors,
    reactions,
    room,
    phase,
    isOwner,
    myVotesLeft,
    userId,
    join,
    leave,
    addCard,
    updateCard,
    deleteCard,
    toggleVote,
    setPhase,
    setTimer,
    setFocus,
    sendCursor,
    sendReaction,
  }
})
