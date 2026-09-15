import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Transition from '../utils/Transition'
import UserAvatar from '../images/user-avatar-32.png'
import { useAuthStore } from '../stores/auth.store'
import { useWorkspaceStore } from '../stores/workspace.store'

type DropdownProfileProps = { align?: 'left' | 'right' }

export default function DropdownProfile({ align }: DropdownProfileProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const dropdown = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isCentral = user?.roles.some((role) => role.role === 'CENTRAL_ADMIN') ?? false
  const roleLabel = user?.roles[0]?.role.replace('_', ' ') ?? 'Administrator'

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdown.current || !trigger.current) return
      if (!dropdownOpen || dropdown.current.contains(target as Node) || trigger.current.contains(target as Node)) return
      setDropdownOpen(false)
    }
    document.addEventListener('click', clickHandler)
    return () => document.removeEventListener('click', clickHandler)
  }, [dropdownOpen])

  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => { if (dropdownOpen && key === 'Escape') setDropdownOpen(false) }
    document.addEventListener('keydown', keyHandler)
    return () => document.removeEventListener('keydown', keyHandler)
  }, [dropdownOpen])

  const handleLogout = async () => {
    setDropdownOpen(false)
    await logout()
    navigate('/signin', { replace: true })
  }

  return <div className="relative inline-flex">
    <button ref={trigger} className="inline-flex items-center justify-center group" aria-haspopup="true" onClick={() => setDropdownOpen(!dropdownOpen)} aria-expanded={dropdownOpen}>
      <img className="h-8 w-8 rounded-full" src={UserAvatar} width="32" height="32" alt="User avatar" />
      <div className="flex items-center truncate"><span className="ml-2 truncate text-sm font-medium text-gray-600 group-hover:text-gray-800 dark:text-gray-100 dark:group-hover:text-white">{user?.name ?? 'PELTI Admin'}</span><svg className="ml-1 h-3 w-3 shrink-0 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 12 12"><path d="M5.9 11.4L.5 6l1.4-1.4 4-4L11.3 6z" /></svg></div>
    </button>
    <Transition className={`origin-top-right z-10 absolute top-full min-w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-700/60 dark:bg-gray-800 mt-1 ${align === 'right' ? 'right-0' : 'left-0'}`} show={dropdownOpen} enter="transition ease-out duration-200 transform" enterStart="opacity-0 -translate-y-2" enterEnd="opacity-100 translate-y-0" leave="transition ease-out duration-200" leaveStart="opacity-100" leaveEnd="opacity-0">
      <div ref={dropdown}>
        <div className="mb-1 border-b border-gray-200 px-3 pb-2 pt-0.5 dark:border-gray-700/60"><div className="font-medium text-gray-800 dark:text-gray-100">{user?.name ?? 'PELTI Admin'}</div><div className="text-xs italic text-gray-500 dark:text-gray-400">{roleLabel}</div>{workspace && <div className="mt-1 truncate text-xs text-gray-400">{workspace.code} · {workspace.name}</div>}</div>
        <ul>
          {isCentral && <li><Link className="flex items-center px-3 py-1 text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" to="/workspaces" onClick={() => setDropdownOpen(false)}>Switch workspace</Link></li>}
          <li><Link className="flex items-center px-3 py-1 text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" to="/settings" onClick={() => setDropdownOpen(false)}>Settings</Link></li>
          <li><button className="flex w-full items-center px-3 py-1 text-left text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" onClick={handleLogout}>Sign Out</button></li>
        </ul>
      </div>
    </Transition>
  </div>
}
