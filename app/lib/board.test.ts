import { describe, expect, it } from 'vitest'
import {
  applyChange,
  canEdit,
  canToggleVote,
  colorOf,
  columnCards,
  formatClock,
  initials,
  isHidden,
  roomId,
  timeLeft,
  toMarkdown,
  votesLeft,
} from './board'
import type { Card, Room, RoomSnapshot } from './types'

const room: Room = { id: 'abcdefgh', title: 'Ретро', ownerId: 'ann', phase: 'write', timerEnd: null, focusCardId: null, createdAt: Date.UTC(2026, 9, 6) }
const card = (id: string, column: Card['column'], authorId = 'ann', createdAt = 1): Card => ({
  id,
  roomId: room.id,
  column,
  text: `Карточка ${id}`,
  authorId,
  authorName: authorId === 'ann' ? 'Аня' : 'Макс',
  createdAt,
})
const empty = (): RoomSnapshot => ({ room, cards: [], votes: [] })

describe('applyChange', () => {
  it('добавляет и обновляет карточку по id', () => {
    let s = applyChange(empty(), { type: 'card', card: card('1', 'good') })
    s = applyChange(s, { type: 'card', card: { ...card('1', 'good'), text: 'Новый текст' } })
    expect(s.cards).toHaveLength(1)
    expect(s.cards[0]!.text).toBe('Новый текст')
  })

  it('при удалении карточки убирает и голоса за неё', () => {
    let s = applyChange(empty(), { type: 'card', card: card('1', 'good') })
    s = applyChange(s, { type: 'vote', vote: { cardId: '1', userId: 'max' } })
    s = applyChange(s, { type: 'card-delete', id: '1' })
    expect(s.cards).toEqual([])
    expect(s.votes).toEqual([])
  })

  it('не дублирует голос, пришедший дважды (своё действие + эхо из сети)', () => {
    let s = empty()
    for (let i = 0; i < 2; i++) s = applyChange(s, { type: 'vote', vote: { cardId: '1', userId: 'max' } })
    expect(s.votes).toHaveLength(1)
  })

  it('не меняет исходный объект', () => {
    const before = empty()
    applyChange(before, { type: 'card', card: card('1', 'good') })
    expect(before.cards).toEqual([])
  })
})

describe('голоса', () => {
  const voting = { ...room, phase: 'vote' as const }
  const votes = [
    { cardId: 'a', userId: 'max' },
    { cardId: 'b', userId: 'max' },
    { cardId: 'c', userId: 'max' },
  ]

  it('у каждого 3 голоса', () => {
    expect(votesLeft([], 'max')).toBe(3)
    expect(votesLeft(votes, 'max')).toBe(0)
    expect(votesLeft(votes, 'ann')).toBe(3)
  })

  it('без голосов нельзя голосовать, но можно снять свой', () => {
    expect(canToggleVote(voting, votes, 'd', 'max')).toBe(false)
    expect(canToggleVote(voting, votes, 'a', 'max')).toBe(true)
  })

  it('голосовать можно только на этапе «голосуем»', () => {
    expect(canToggleVote(room, [], 'a', 'max')).toBe(false)
  })
})

describe('карточки', () => {
  it('на этапе «пишем» чужие скрыты, свои видны', () => {
    expect(isHidden(card('1', 'good', 'max'), 'write', 'ann')).toBe(true)
    expect(isHidden(card('1', 'good', 'ann'), 'write', 'ann')).toBe(false)
    expect(isHidden(card('1', 'good', 'max'), 'vote', 'ann')).toBe(false)
  })

  it('править можно только свою и только пока пишем', () => {
    expect(canEdit(card('1', 'good', 'ann'), 'write', 'ann')).toBe(true)
    expect(canEdit(card('1', 'good', 'ann'), 'vote', 'ann')).toBe(false)
    expect(canEdit(card('1', 'good', 'max'), 'write', 'ann')).toBe(false)
  })

  it('на обсуждении сортирует по голосам, при равенстве — по времени', () => {
    const cards = [card('a', 'bad', 'ann', 1), card('b', 'bad', 'ann', 2), card('c', 'bad', 'ann', 3), card('x', 'good')]
    const votes = [
      { cardId: 'c', userId: 'u1' },
      { cardId: 'c', userId: 'u2' },
      { cardId: 'b', userId: 'u1' },
    ]
    expect(columnCards(cards, votes, 'bad', 'discuss').map((c) => c.id)).toEqual(['c', 'b', 'a'])
    expect(columnCards(cards, votes, 'bad', 'write').map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('прочее', () => {
  it('считает и форматирует таймер', () => {
    expect(timeLeft({ ...room, timerEnd: 10_500 }, 1_000)).toBe(10)
    expect(timeLeft({ ...room, timerEnd: 500 }, 1_000)).toBe(0)
    expect(timeLeft(room, 1_000)).toBe(0)
    expect(formatClock(185)).toBe('3:05')
  })

  it('делает id комнаты без похожих символов', () => {
    const id = roomId()
    expect(id).toMatch(/^[a-z2-9]{8}$/)
    expect(id).not.toMatch(/[01ilo]/)
  })

  it('цвет участника постоянный', () => {
    expect(colorOf('user-1')).toBe(colorOf('user-1'))
  })

  it('инициалы берёт только из букв', () => {
    expect(initials('Анна Смирнова')).toBe('АС')
    expect(initials('Аня (вы)')).toBe('АВ')
    expect(initials('  ')).toBe('?')
  })

  it('выгружает итоги в Markdown по голосам', () => {
    const s: RoomSnapshot = {
      room,
      cards: [card('a', 'good', 'ann', 1), card('b', 'good', 'ann', 2)],
      votes: [
        { cardId: 'b', userId: 'u1' },
        { cardId: 'b', userId: 'u2' },
      ],
    }
    const md = toMarkdown(s)
    expect(md).toContain('# Ретро')
    expect(md.indexOf('Карточка b')).toBeLessThan(md.indexOf('Карточка a'))
    expect(md).toContain('— **2** голоса')
    expect(md).toContain('## 💡 Идеи\n\n_Пусто_')
  })
})
