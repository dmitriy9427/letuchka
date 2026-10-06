// Чистая логика доски: применение изменений, голоса, сортировка, экспорт.
// Без Vue и без сети — поэтому проверяется обычными тестами (board.test.ts).

import type { Card, Change, ColumnId, Phase, Room, RoomSnapshot, Vote } from './types'

export const COLUMNS: { id: ColumnId; title: string; hint: string; emoji: string }[] = [
  { id: 'good', title: 'Что было хорошо', hint: 'Что сработало и стоит повторить', emoji: '☀️' },
  { id: 'bad', title: 'Что мешало', hint: 'Где буксовали и что раздражало', emoji: '🌧' },
  { id: 'ideas', title: 'Идеи', hint: 'Что попробуем в следующий раз', emoji: '💡' },
]

export const PHASES: { id: Phase; title: string; hint: string }[] = [
  { id: 'write', title: 'Пишем', hint: 'Карточки коллег скрыты, чтобы не влиять друг на друга' },
  { id: 'vote', title: 'Голосуем', hint: 'У каждого 3 голоса — отдайте их самым важным карточкам' },
  { id: 'discuss', title: 'Обсуждаем', hint: 'Идём по карточкам от самых популярных' },
]

/** Сколько голосов у каждого участника. */
export const VOTES_PER_USER = 3
export const MAX_CARD_LENGTH = 280

/** Применить изменение к снимку (новый объект — старый не трогаем). */
export function applyChange(state: RoomSnapshot, change: Change): RoomSnapshot {
  switch (change.type) {
    case 'room':
      return { ...state, room: change.room }
    case 'card': {
      const exists = state.cards.some((c) => c.id === change.card.id)
      const cards = exists
        ? state.cards.map((c) => (c.id === change.card.id ? change.card : c))
        : [...state.cards, change.card]
      return { ...state, cards }
    }
    case 'card-delete':
      return {
        ...state,
        cards: state.cards.filter((c) => c.id !== change.id),
        // Голоса за удалённую карточку тоже убираем — иначе они «сгорели» бы у участников.
        votes: state.votes.filter((v) => v.cardId !== change.id),
      }
    case 'vote':
      return state.votes.some((v) => sameVote(v, change.vote))
        ? state
        : { ...state, votes: [...state.votes, change.vote] }
    case 'vote-delete':
      return { ...state, votes: state.votes.filter((v) => !sameVote(v, change.vote)) }
  }
}

const sameVote = (a: Vote, b: Vote) => a.cardId === b.cardId && a.userId === b.userId

export const votesFor = (votes: Vote[], cardId: string) => votes.filter((v) => v.cardId === cardId).length

export const votedBy = (votes: Vote[], cardId: string, userId: string) =>
  votes.some((v) => v.cardId === cardId && v.userId === userId)

export const votesLeft = (votes: Vote[], userId: string) =>
  VOTES_PER_USER - votes.filter((v) => v.userId === userId).length

/** Можно ли сейчас проголосовать за карточку (или снять голос). */
export function canToggleVote(room: Room, votes: Vote[], cardId: string, userId: string) {
  if (room.phase !== 'vote') return false
  return votedBy(votes, cardId, userId) || votesLeft(votes, userId) > 0
}

/**
 * Карточки колонки в нужном порядке. На этапе обсуждения — по голосам
 * (при равенстве — кто раньше написал), иначе — по времени создания.
 */
export function columnCards(cards: Card[], votes: Vote[], column: ColumnId, phase: Phase) {
  const list = cards.filter((c) => c.column === column)
  if (phase === 'discuss') {
    return list.sort((a, b) => votesFor(votes, b.id) - votesFor(votes, a.id) || a.createdAt - b.createdAt)
  }
  return list.sort((a, b) => a.createdAt - b.createdAt)
}

/** На этапе «пишем» чужие карточки скрыты. */
export const isHidden = (card: Card, phase: Phase, userId: string) => phase === 'write' && card.authorId !== userId

export const isOwner = (room: Room, userId: string) => room.ownerId === userId

/** Можно ли править карточку: только автор и только пока пишем. */
export const canEdit = (card: Card, phase: Phase, userId: string) => phase === 'write' && card.authorId === userId

/** Секунд до конца таймера (0 — вышло или не запущен). */
export function timeLeft(room: Room, now: number) {
  return room.timerEnd ? Math.max(0, Math.ceil((room.timerEnd - now) / 1000)) : 0
}

export function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Итоги ретро в Markdown — вставить в Notion, Confluence или чат. */
export function toMarkdown(state: RoomSnapshot, date = new Date(state.room.createdAt)) {
  const day = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  const lines = [`# ${state.room.title}`, '', `_Ретро от ${day}_`, '']
  for (const column of COLUMNS) {
    const cards = columnCards(state.cards, state.votes, column.id, 'discuss')
    lines.push(`## ${column.emoji} ${column.title}`, '')
    if (!cards.length) lines.push('_Пусто_')
    for (const card of cards) {
      const n = votesFor(state.votes, card.id)
      const text = card.text.replace(/\s*\n\s*/g, ' ')
      lines.push(`- ${text}${n ? ` — **${n}** ${plural(n, 'голос', 'голоса', 'голосов')}` : ''}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}

export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

/** Короткий id комнаты для ссылки: 8 символов без похожих (0/O, 1/l). */
export function roomId(random = Math.random) {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => abc.charAt(Math.floor(random() * abc.length))).join('')
}

const PALETTE = ['#7c5cff', '#ff6b8b', '#16b3a0', '#ff9f43', '#3d8bfd', '#e05bd0', '#2fb55d', '#f2c230']

/** Цвет участника — по его id: у одного человека всегда один цвет на всех экранах. */
export function colorOf(userId: string) {
  let h = 0
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]!
}

/** Инициалы для аватарки: «Анна Смирнова» → «АС». */
export const initials = (name: string) =>
  name
    // Только слова из букв: «Аня (вы)» → «А», а не «А(».
    .split(/[^\p{L}]+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?'
