import { afterEach, describe, expect, it } from 'vitest'
import { applyChange } from './board'
import type { RoomConnection, RoomEvents } from './backend'
import { createLocalBackend } from './localBackend'
import type { RoomSnapshot, User } from './types'

const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms))
const open: RoomConnection[] = []
afterEach(() => open.splice(0).forEach((c) => c.leave()))

/** Подключиться и держать у себя состояние так же, как это делает стор. */
async function join(id: string, user: User) {
  const backend = createLocalBackend()
  const view: { state: RoomSnapshot | null; people: string[] } = { state: null, people: [] }
  const events: RoomEvents = {
    onChange: (c) => view.state && (view.state = applyChange(view.state, c)),
    onPresence: (list) => (view.people = list.map((p) => p.name).sort()),
    onCursor: () => {},
    onReaction: () => {},
  }
  const conn = (await backend.connect(id, user, events))!
  view.state = conn.snapshot
  open.push(conn)
  return { conn, view }
}

describe('локальный бэкенд', () => {
  const ann: User = { id: 'ann', name: 'Аня' }
  const max: User = { id: 'max', name: 'Макс' }

  it('несуществующая комната — null', async () => {
    expect(await createLocalBackend().connect('nope0000', ann, {} as RoomEvents)).toBeNull()
  })

  it('два участника видят изменения друг друга и друг друга онлайн', async () => {
    const id = await createLocalBackend().createRoom('Ретро', ann)
    const a = await join(id, ann)
    const m = await join(id, max)
    await wait()
    expect(a.view.people).toEqual(['Аня', 'Макс'])

    await m.conn.addCard('good', 'Быстрые ревью')
    await wait()
    expect(a.view.state!.cards.map((c) => c.text)).toEqual(['Быстрые ревью'])

    await a.conn.setPhase('vote')
    await wait()
    expect(m.view.state!.room.phase).toBe('vote')

    const cardId = a.view.state!.cards[0]!.id
    await a.conn.toggleVote(cardId, true)
    await wait()
    expect(m.view.state!.votes).toEqual([{ cardId, userId: 'ann' }])
  })

  it('новый участник получает уже сохранённые данные', async () => {
    const id = await createLocalBackend().createRoom('Ретро', ann)
    const a = await join(id, ann)
    await a.conn.addCard('ideas', 'Кэш в CI')
    const m = await join(id, max)
    expect(m.view.state!.cards).toHaveLength(1)
  })
})
