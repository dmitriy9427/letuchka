// Локальный бэкенд: всё хранится в localStorage этого браузера, а «реальное
// время» — между вкладками через BroadcastChannel. Сервер не нужен.
//
// Зачем: разрабатывать и показывать проект без аккаунта в Supabase и без сети.
// Откройте комнату в двух вкладках — увидите карточки, голоса и курсоры
// «коллеги». На другое устройство так не передать — для этого Supabase.

import { applyChange, colorOf, roomId as makeRoomId } from './board'
import { newCard, type Backend, type RoomConnection, type RoomEvents } from './backend'
import type { Change, Participant, Room, RoomSnapshot, User } from './types'

// Пользователь — в sessionStorage: у каждой вкладки свой. Так вторая вкладка
// становится вторым участником (со своим именем и голосами), а комнаты —
// в localStorage, общем для всех вкладок.
const USER_KEY = 'letuchka:user'
const roomKey = (id: string) => `letuchka:room:${id}`

/** Сообщения между вкладками. */
type Message =
  | { kind: 'change'; change: Change }
  | { kind: 'hello'; user: Participant }
  | { kind: 'bye'; userId: string }
  | { kind: 'cursor'; userId: string; x: number; y: number }
  | { kind: 'reaction'; userId: string; emoji: string; id: string }

/** Участник считается ушедшим, если не подавал признаков жизни столько миллисекунд. */
const PRESENCE_TTL = 6000
const HEARTBEAT = 2000

const uid = () => crypto.randomUUID()

function read(id: string): RoomSnapshot | null {
  try {
    const raw = localStorage.getItem(roomKey(id))
    return raw ? (JSON.parse(raw) as RoomSnapshot) : null
  } catch {
    return null
  }
}

function write(state: RoomSnapshot) {
  localStorage.setItem(roomKey(state.room.id), JSON.stringify(state))
}

export function createLocalBackend(): Backend {
  return {
    kind: 'local',

    async signIn(name) {
      const prev = await this.currentUser()
      const user: User = { id: prev?.id ?? uid(), name: name.trim().slice(0, 40) }
      sessionStorage.setItem(USER_KEY, JSON.stringify(user))
      return user
    },

    async currentUser() {
      try {
        const raw = sessionStorage.getItem(USER_KEY)
        return raw ? (JSON.parse(raw) as User) : null
      } catch {
        return null
      }
    },

    async createRoom(title, user) {
      const id = makeRoomId()
      const room: Room = {
        id,
        title: title.trim().slice(0, 80) || 'Ретро',
        ownerId: user.id,
        phase: 'write',
        timerEnd: null,
        focusCardId: null,
        createdAt: Date.now(),
      }
      write({ room, cards: [], votes: [] })
      return id
    },

    async connect(id, user, events: RoomEvents): Promise<RoomConnection | null> {
      const initial = read(id)
      if (!initial) return null
      const channel = new BroadcastChannel(`letuchka:${id}`)
      const me: Participant = { ...user, color: colorOf(user.id) }
      const seen = new Map<string, { participant: Participant; at: number }>([
        [me.id, { participant: me, at: Infinity }],
      ])
      const publishPresence = () => events.onPresence([...seen.values()].map((s) => s.participant))

      /** Изменить данные: записать, применить у себя и разослать другим вкладкам. */
      const commit = (change: Change) => {
        const state = read(id)
        if (!state) return
        write(applyChange(state, change))
        events.onChange(change)
        channel.postMessage({ kind: 'change', change } satisfies Message)
      }

      channel.onmessage = ({ data }: MessageEvent<Message>) => {
        if (data.kind === 'change') events.onChange(data.change)
        else if (data.kind === 'hello') {
          const isNew = !seen.has(data.user.id)
          seen.set(data.user.id, { participant: data.user, at: Date.now() })
          publishPresence()
          // Новичку отвечаем сразу — иначе он узнал бы о нас только через HEARTBEAT.
          if (isNew) channel.postMessage({ kind: 'hello', user: me } satisfies Message)
        } else if (data.kind === 'bye') {
          seen.delete(data.userId)
          publishPresence()
        } else if (data.kind === 'cursor') events.onCursor(data)
        else if (data.kind === 'reaction') events.onReaction(data)
      }

      // «Я здесь» раз в 2 секунды; кто молчит дольше 6 секунд — ушёл (закрыл вкладку без bye).
      const heartbeat = setInterval(() => {
        channel.postMessage({ kind: 'hello', user: me } satisfies Message)
        const now = Date.now()
        let changed = false
        for (const [key, value] of seen) {
          if (now - value.at > PRESENCE_TTL) {
            seen.delete(key)
            changed = true
          }
        }
        if (changed) publishPresence()
      }, HEARTBEAT)
      channel.postMessage({ kind: 'hello', user: me } satisfies Message)
      publishPresence()

      const bye = () => channel.postMessage({ kind: 'bye', userId: me.id } satisfies Message)
      window.addEventListener('pagehide', bye)

      const room = () => read(id)!.room

      return {
        snapshot: initial,
        addCard: async (column, text) => commit({ type: 'card', card: newCard(id, column, text, user, uid()) }),
        updateCard: async (cardId, text) => {
          const card = read(id)?.cards.find((c) => c.id === cardId)
          if (card) commit({ type: 'card', card: { ...card, text: text.trim().slice(0, 280) } })
        },
        deleteCard: async (cardId) => commit({ type: 'card-delete', id: cardId }),
        toggleVote: async (cardId, on) =>
          commit({ type: on ? 'vote' : 'vote-delete', vote: { cardId, userId: user.id } }),
        setPhase: async (phase) => commit({ type: 'room', room: { ...room(), phase, focusCardId: null } }),
        setTimer: async (timerEnd) => commit({ type: 'room', room: { ...room(), timerEnd } }),
        setFocus: async (focusCardId) => commit({ type: 'room', room: { ...room(), focusCardId } }),
        sendCursor: (x, y) => channel.postMessage({ kind: 'cursor', userId: me.id, x, y } satisfies Message),
        sendReaction: (emoji) => {
          const reaction = { userId: me.id, emoji, id: uid() }
          events.onReaction(reaction)
          channel.postMessage({ kind: 'reaction', ...reaction } satisfies Message)
        },
        leave: () => {
          bye()
          clearInterval(heartbeat)
          window.removeEventListener('pagehide', bye)
          channel.close()
        },
      }
    },
  }
}
