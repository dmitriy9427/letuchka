// Модель данных «Летучки». Одинаковая для локального бэкенда и Supabase —
// поэтому компоненты не знают, откуда пришли данные (см. docs/04-backend.md).

/** Этапы ретро: пишем карточки → голосуем → обсуждаем. */
export type Phase = 'write' | 'vote' | 'discuss'

export type ColumnId = 'good' | 'bad' | 'ideas'

export type Room = {
  id: string
  title: string
  /** Ведущий: только он переключает этапы, таймер и фокус. */
  ownerId: string
  phase: Phase
  /** Когда закончится таймер (мс с 1970 г.), null — таймер не запущен. */
  timerEnd: number | null
  /** Карточка, которую сейчас обсуждают, — подсвечена у всех. */
  focusCardId: string | null
  createdAt: number
}

export type Card = {
  id: string
  roomId: string
  column: ColumnId
  text: string
  authorId: string
  authorName: string
  createdAt: number
}

export type Vote = {
  cardId: string
  userId: string
}

export type User = {
  id: string
  name: string
}

/** Участник онлайн (presence): кто сейчас в комнате. */
export type Participant = User & {
  color: string
}

/** Снимок комнаты при входе. Дальше приходят только изменения. */
export type RoomSnapshot = {
  room: Room
  cards: Card[]
  votes: Vote[]
}

/** Изменения, которые прилетают в реальном времени. */
export type Change =
  | { type: 'room'; room: Room }
  | { type: 'card'; card: Card }
  | { type: 'card-delete'; id: string }
  | { type: 'vote'; vote: Vote }
  | { type: 'vote-delete'; vote: Vote }

export type Cursor = { userId: string; x: number; y: number }

export type Reaction = { userId: string; emoji: string; id: string }
