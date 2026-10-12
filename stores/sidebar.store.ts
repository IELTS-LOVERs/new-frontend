import { create } from "zustand"

interface SidebarState {
  isCollapsed: boolean
  toggleSidebar: () => void
  setCollapsed: (collapsed: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  toggleSidebar: () =>
    set((state) => {
      const next = !state.isCollapsed
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ieltslovers-sidebar-collapsed", JSON.stringify(next))
        } catch {}
      }
      return { isCollapsed: next }
    }),
  setCollapsed: (collapsed) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ieltslovers-sidebar-collapsed", JSON.stringify(collapsed))
      } catch {}
    }
    set({ isCollapsed: collapsed })
  },
}))
