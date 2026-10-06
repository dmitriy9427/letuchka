// Бэкенд на Supabase: Postgres + анонимный вход + Realtime.
//
// Схема данных и права доступа — supabase/schema.sql.
//
// Как устроено «реальное время»:
//   1. При входе в комнату читаем из базы снимок: комнату, карточки, голоса.
//   2. Любое действие сначала пишется в базу (там его проверяют правила RLS).
//   3. Если база приняла — рассылаем изменение участникам через Broadcast
//      канала комнаты, а у себя применяем сразу.
// База — источник правды, Broadcast — быстрые уведомления. Почему не
// Postgres Changes — в docs/05-supabase.md.
//
// Presence (кто онлайн) и курсоры с реакциями — тоже через канал комнаты,
// в базу они не пишутся.

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { colorOf, roomId as makeRoomId } from './board'
import { cleanCardText, type Backend, type RoomConnection, type RoomEvents } from './backend'
import type { Card, Change, Participant, Room, User, Vote } from './types'

type RoomRow = {
  id: string
  title: string
  owner_id: string
  phase: Room['phase']
  timer_end: string | null
  focus_card_id: string | null
  created_at: string
}
type CardRow = {
  id: string
  room_id: string
  column: Card['column']
  text: string
  author_id: string
  author_name: string
  created_at: string
}
type VoteRow = { card_id: string; room_id: string; user_id: string }

const toRoom = (r: RoomRow): Room => ({
  id: r.id,
  title: r.title,
  ownerId: r.owner_id,
  phase: r.phase,
  timerEnd: r.timer_end ? Date.parse(r.timer_end) : null,
  focusCardId: r.focus_card_id,
  createdAt: Date.parse(r.created_at),
})

const toCard = (r: CardRow): Card => ({
  id: r.id,
  roomId: r.room_id,
  column: r.column,
  text: r.text,
  authorId: r.author_id,
  authorName: r.author_name,
  createdAt: Date.parse(r.created_at),
})

const toVote = (r: VoteRow): Vote => ({ cardId: r.card_id, userId: r.user_id })

type ErrorLike = { message: string; code?: string } | null

/** Ошибка базы → исключение с понятным текстом (его покажет интерфейс). */
function check<T>({ data, error }: { data: T; error: ErrorLike }): T {
  if (!error) return data
  // 42501 — нарушено правило RLS: например, этап уже сменился или голоса кончились.
  if (error.code === '42501') throw new Error('Сейчас это действие недоступно')
  throw new Error(error.message)
}

/** То же для запросов .single(): без ошибки строка точно есть. */
const one = <T>(res: { data: T | null; error: ErrorLike }): T => check(res) as T

export function createSupabaseBackend(url: string, key: string): Backend {
  const db: SupabaseClient = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 30 } },
  })

  const userOf = (u: { id: string; user_metadata?: { name?: string } } | null | undefined): User | null =>
    u ? { id: u.id, name: u.user_metadata?.name ?? 'Гость' } : null

  return {
    kind: 'supabase',

    async signIn(name) {
      const clean = name.trim().slice(0, 40)
      const { data } = await db.auth.getSession()
      // Уже вошли — меняем только имя, иначе — анонимный вход.
      const res = data.session
        ? await db.auth.updateUser({ data: { name: clean } })
        : await db.auth.signInAnonymously({ options: { data: { name: clean } } })
      if (res.error || !res.data.user) throw new Error(res.error?.message ?? 'Не удалось войти')
      return userOf(res.data.user)!
    },

    async currentUser() {
      const { data } = await db.auth.getSession()
      return userOf(data.session?.user)
    },

    async createRoom(title, user) {
      const id = makeRoomId()
      check(await db.from('rooms').insert({ id, title: title.trim().slice(0, 80) || 'Ретро', owner_id: user.id }))
      return id
    },

    async connect(id, user, events: RoomEvents): Promise<RoomConnection | null> {
      const [roomRes, cardsRes, votesRes] = await Promise.all([
        db.from('rooms').select('*').eq('id', id).maybeSingle<RoomRow>(),
        db.from('cards').select('*').eq('room_id', id).order('created_at').returns<CardRow[]>(),
        db.from('votes').select('*').eq('room_id', id).returns<VoteRow[]>(),
      ])
      const roomRow = check(roomRes)
      if (!roomRow) return null
      let room = toRoom(roomRow)

      const channel: RealtimeChannel = db.channel(`room:${id}`, {
        config: { broadcast: { self: false }, presence: { key: user.id } },
      })

      /** Изменение принято базой → применяем у себя и рассылаем остальным. */
      const publish = (change: Change) => {
        if (change.type === 'room') room = change.room
        events.onChange(change)
        void channel.send({ type: 'broadcast', event: 'change', payload: change })
      }

      channel
        .on('broadcast', { event: 'change' }, ({ payload }) => {
          const change = payload as Change
          if (change.type === 'room') room = change.room
          events.onChange(change)
        })
        .on('broadcast', { event: 'cursor' }, ({ payload }) => events.onCursor(payload))
        .on('broadcast', { event: 'reaction' }, ({ payload }) => events.onReaction(payload))
        .on('presence', { event: 'sync' }, () => {
          // presenceState: { [ключ]: [метаданные каждой вкладки] } — берём по одной записи на человека.
          const state = channel.presenceState<Participant>()
          events.onPresence(Object.values(state).map((list) => list[0]).filter((p): p is NonNullable<typeof p> => !!p))
        })

      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void channel.track({ id: user.id, name: user.name, color: colorOf(user.id) } satisfies Participant)
            resolve()
          }
          // Нет связи с Realtime — комната всё равно откроется, просто без живых обновлений.
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve()
        })
      })

      const updateRoom = async (patch: Partial<RoomRow>) => {
        const row = one(await db.from('rooms').update(patch).eq('id', id).select().single<RoomRow>())
        publish({ type: 'room', room: toRoom(row) })
      }

      return {
        snapshot: {
          room,
          cards: (check(cardsRes) ?? []).map(toCard),
          votes: (check(votesRes) ?? []).map(toVote),
        },

        async addCard(column, text) {
          const row = one(
            await db
              .from('cards')
              .insert({ room_id: id, column, text: cleanCardText(text), author_name: user.name })
              .select()
              .single<CardRow>(),
          )
          publish({ type: 'card', card: toCard(row) })
        },

        async updateCard(cardId, text) {
          const row = one(
            await db.from('cards').update({ text: cleanCardText(text) }).eq('id', cardId).select().single<CardRow>(),
          )
          publish({ type: 'card', card: toCard(row) })
        },

        async deleteCard(cardId) {
          check(await db.from('cards').delete().eq('id', cardId))
          publish({ type: 'card-delete', id: cardId })
        },

        async toggleVote(cardId, on) {
          if (on) check(await db.from('votes').insert({ card_id: cardId, room_id: id }))
          else check(await db.from('votes').delete().eq('card_id', cardId).eq('user_id', user.id))
          publish({ type: on ? 'vote' : 'vote-delete', vote: { cardId, userId: user.id } })
        },

        setPhase: (phase) => updateRoom({ phase, focus_card_id: null }),
        setTimer: (endsAt) => updateRoom({ timer_end: endsAt ? new Date(endsAt).toISOString() : null }),
        setFocus: (cardId) => updateRoom({ focus_card_id: cardId }),

        sendCursor: (x, y) =>
          void channel.send({ type: 'broadcast', event: 'cursor', payload: { userId: user.id, x, y } }),
        sendReaction: (emoji) => {
          const reaction = { userId: user.id, emoji, id: crypto.randomUUID() }
          events.onReaction(reaction)
          void channel.send({ type: 'broadcast', event: 'reaction', payload: reaction })
        },
        leave: () => {
          void channel.untrack()
          void db.removeChannel(channel)
        },
      }
    },
  }
}
