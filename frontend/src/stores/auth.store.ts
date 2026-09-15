import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, ApiError } from '../lib/api'
import type { AuthUser } from '../types/auth'
import { useWorkspaceStore } from './workspace.store'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthState = {
  token: string | null
  user: AuthUser | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  bootstrap: () => Promise<void>
  logout: () => Promise<void>
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      status: 'loading',
      login: async (email, password) => {
        const result = await api.auth.login(email, password)
        set({ token: result.token, user: result.user, status: 'authenticated' })
      },
      bootstrap: async () => {
        const token = get().token
        if (!token) {
          set({ status: 'unauthenticated', user: null })
          return
        }
        try {
          const user = await api.auth.me(token)
          set({ user, status: 'authenticated' })
        } catch (error) {
          if (error instanceof ApiError && error.status !== 401) {
            set({ status: 'unauthenticated', user: null, token: null })
            useWorkspaceStore.getState().clearWorkspace()
            return
          }
          get().clearSession()
        }
      },
      logout: async () => {
        const token = get().token
        try {
          if (token) await api.auth.logout(token)
        } finally {
          get().clearSession()
        }
      },
      clearSession: () => {
        set({ token: null, user: null, status: 'unauthenticated' })
        useWorkspaceStore.getState().clearWorkspace()
      },
    }),
    { name: 'pelti-auth', partialize: (state) => ({ token: state.token, user: state.user }) },
  ),
)
