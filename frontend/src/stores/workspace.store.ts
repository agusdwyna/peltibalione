import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { District } from '../types/auth'

type WorkspaceState = {
  selectedWorkspace: District | null
  isAllRegions: boolean
  selectWorkspace: (workspace: District) => void
  selectAllRegions: () => void
  clearWorkspace: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspace: null,
      isAllRegions: false,
      selectWorkspace: (selectedWorkspace) => set({ selectedWorkspace, isAllRegions: false }),
      selectAllRegions: () => set({ selectedWorkspace: null, isAllRegions: true }),
      clearWorkspace: () => set({ selectedWorkspace: null, isAllRegions: false }),
    }),
    { name: 'pelti-workspace' },
  ),
)
