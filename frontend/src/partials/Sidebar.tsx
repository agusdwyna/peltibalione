import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { navigationGroups, navigationItems, type NavigationItem } from '../config/navigation'
import { useAuthStore } from '../stores/auth.store'
import { useWorkspaceStore } from '../stores/workspace.store'
import { Link } from 'react-router-dom'

type SidebarProps = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  variant?: string
}

const iconPaths: Record<NavigationItem['icon'], string> = {
  dashboard: 'M5.936.278A7.983 7.983 0 0 1 8 0a8 8 0 1 1-8 8c0-.722.104-1.413.278-2.064a1 1 0 1 1 1.932.516A5.99 5.99 0 0 0 2 8a6 6 0 1 0 6-6c-.53 0-1.045.076-1.548.21A1 1 0 1 1 5.936.278Z',
  players: 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 7a5 5 0 0 1 10 0H3Zm10-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-.3 2c1.9.4 3.3 2.1 3.3 4h-2a5.8 5.8 0 0 0-1.3-3.7Z',
  forms: 'M3 1h8l3 3v11H3V1Zm2 2v10h7V5h-2V3H5Zm1 4h5v1H6V7Zm0 3h5v1H6v-1Z',
  verification: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm3.2 5.7-3.8 4a1 1 0 0 1-1.5 0L4.8 9.6l1.4-1.4 1.2 1.1 3.1-3.2 1.4 1.4Z',
  users: 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 7a5 5 0 0 1 10 0H3Zm10-8h3v2h-3V7Zm0 3h3v2h-3v-2Z',
  audit: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm1 3v4.6l3 1.7-1 1.7-4-2.3V4h2Z',
}

function SidebarIcon({ item, active }: { item: NavigationItem; active: boolean }) {
  return <svg className={`shrink-0 fill-current ${active ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500'}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d={iconPaths[item.icon]} /></svg>
}

function Sidebar({ sidebarOpen, setSidebarOpen, variant = 'default' }: SidebarProps) {
  const { pathname } = useLocation()
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isAllRegions = useWorkspaceStore((state) => state.isAllRegions)
  const userRoles = user?.roles.map((role) => role.role) ?? []
  const visibleItems = navigationItems.filter((item) => !item.roles || item.roles.some((role) => userRoles.includes(role)))
  const trigger = useRef<HTMLButtonElement>(null)
  const sidebar = useRef<HTMLDivElement>(null)
  const storedSidebarExpanded = localStorage.getItem('sidebar-expanded')
  const [sidebarExpanded, setSidebarExpanded] = useState(storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true')

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return
      if (!sidebarOpen || sidebar.current.contains(target as Node) || trigger.current.contains(target as Node)) return
      setSidebarOpen(false)
    }
    document.addEventListener('click', clickHandler)
    return () => document.removeEventListener('click', clickHandler)
  }, [sidebarOpen, setSidebarOpen])

  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (sidebarOpen && key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', keyHandler)
    return () => document.removeEventListener('keydown', keyHandler)
  }, [sidebarOpen, setSidebarOpen])

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', String(sidebarExpanded))
    document.body.classList.toggle('sidebar-expanded', sidebarExpanded)
  }, [sidebarExpanded])

  return (
    <div className="min-w-fit">
      <div className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden="true" />
      <div id="sidebar" ref={sidebar} className={`flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 2xl:w-64! shrink-0 bg-white dark:bg-gray-800 p-4 transition-all duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'} ${variant === 'v2' ? 'border-r border-gray-200 dark:border-gray-700/60' : 'rounded-r-2xl shadow-xs'}`}>
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          <button ref={trigger} className="lg:hidden text-gray-500 hover:text-gray-400" onClick={() => setSidebarOpen(!sidebarOpen)} aria-controls="sidebar" aria-expanded={sidebarOpen}><span className="sr-only">Close sidebar</span><svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" /></svg></button>
          <NavLink end to="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}><svg className="fill-violet-500" aria-label="PELTI Bali One" xmlns="http://www.w3.org/2000/svg" width={32} height={32}><path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" /></svg><span className="hidden lg:block lg:sidebar-expanded:block 2xl:block text-sm font-semibold text-gray-800 dark:text-gray-100">PELTI Bali One</span></NavLink>
        </div>

        <div className="space-y-8">
          {(workspace || isAllRegions) && <div className="mb-7 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700/60 dark:bg-gray-800"><p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Workspace</p><p className="mt-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{isAllRegions ? 'Semua Wilayah' : workspace?.name}</p><Link className="mt-1 inline-block text-xs font-medium text-violet-600 hover:text-violet-700" to="/">Switch workspace</Link></div>}
          {navigationGroups.map((group) => {
            const items = visibleItems.filter((item) => item.group === group)
            return <div key={group}><h3 className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3"><span className="hidden lg:block lg:sidebar-expanded:hidden 2xl:hidden text-center w-6" aria-hidden="true">•••</span><span className="lg:hidden lg:sidebar-expanded:block 2xl:block">{group}</span></h3><ul className="mt-3">{items.map((item) => { const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to); return <li key={item.to} className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 bg-linear-to-r ${active ? 'from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' : ''}`}><NavLink end={item.to === '/'} to={item.to} onClick={() => setSidebarOpen(false)} className={`block truncate transition duration-150 ${active ? 'text-gray-800 dark:text-gray-100' : 'text-gray-800 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white'}`}><div className="flex items-center"><SidebarIcon item={item} active={active} /><span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">{item.label}</span></div></NavLink></li> })}</ul></div>
          })}
        </div>

        <div className="pt-3 hidden lg:inline-flex 2xl:hidden justify-end mt-auto"><div className="w-12 pl-4 pr-3 py-2"><button className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400" onClick={() => setSidebarExpanded(!sidebarExpanded)}><span className="sr-only">Expand / collapse sidebar</span><svg className="shrink-0 fill-current text-gray-400 dark:text-gray-500 sidebar-expanded:rotate-180" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M15 16a1 1 0 0 1-1-1V1a1 1 0 1 1 2 0v14a1 1 0 0 1-1 1ZM8.586 7H1a1 1 0 1 0 0 2h7.586l-2.793 2.793a1 1 0 1 0 1.414 1.414l4.5-4.5A.997.997 0 0 0 12 8.01M11.924 7.617a.997.997 0 0 0-.217-.324l-4.5-4.5a1 1 0 0 0-1.414 1.414L8.586 7M12 7.99a.996.996 0 0 0-.076-.373Z" /></svg></button></div></div>
      </div>
    </div>
  )
}

export default Sidebar
