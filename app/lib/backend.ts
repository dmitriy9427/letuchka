// Интерфейс «бэкенда». Приложение работает с ним, а не с Supabase напрямую:
//
//   createLocalBackend()     — данные в localStorage, realtime между вкладками
//                              (BroadcastChannel). Для разработки и демо без ключей.
//   createSupabaseBackend()  — настоящий сервер: Postgres, анонимный вход, realtime.
//
// Компоненты и стор не знают, какой из них подключён. Это паттерн «адаптер»:
// одна форма вызова — разные реализации (подробно — docs/04-backend.md).

import type { Card, Change, ColumnId, Cursor, Participant, Phase, Reaction, RoomSnapshot, User } from './types'

export type RoomEvents = {
  /** Любое изменение данных комнаты (свои действия тоже приходят сюда). */
  onChange: (change: Change) => void
  /** Список участников онлайн. */
  onPresence: (participants: Participant[]) => void
  onCursor: (cursor: Cursor) => void
  onReaction: (reaction: Reaction) => void
}

export type RoomConnection = {
  snapshot: RoomSnapshot
  addCard: (column: ColumnId, text: string) => Promise<void>
  updateCard: (id: string, text: string) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  toggleVote: (cardId: string, on: boolean) => Promise<void>
  setPhase: (phase: Phase) => Promise<void>
  setTimer: (endsAt: number | null) => Promise<void>
  setFocus: (cardId: string | null) => Promise<void>
  /** Эфемерное — не сохраняется: курсор и реакции. */
  sendCursor: (x: number, y: number) => void
  sendReaction: (emoji: string) => void
  leave: () => void
}

export type Backend = {
  kind: 'local' | 'supabase'
  /** Анонимный вход: только имя, без почты и пароля. Повторный вызов — смена имени. */
  signIn: (name: string) => Promise<User>
  /** Кто вошёл в этом браузере (null — ещё никто). */
  currentUser: () => Promise<User | null>
  createRoom: (title: string, user: User) => Promise<string>
  /** null — комнаты не существует. */
  connect: (roomId: string, user: User, events: RoomEvents) => Promise<RoomConnection | null>
}

/** Общие проверки ввода — одинаковые для обоих бэкендов. */
export function cleanCardText(text: string) {
  return text.replace(/\s+$/g, '').replace(/^\s+/g, '').slice(0, 280)
}

export function newCard(roomId: string, column: ColumnId, text: string, user: User, id: string): Card {
  return {
    id,
    roomId,
    column,
    text: cleanCardText(text),
    authorId: user.id,
    authorName: user.name,
    createdAt: Date.now(),
  }
}
