export type NavigationGroup = 'Ringkasan' | 'Portal Pemain' | 'Sistem'
export type NavigationRole = 'CENTRAL_ADMIN' | 'DISTRICT_ADMIN' | 'PLAYER'
export type NavigationItem = { label: string; to: string; group: NavigationGroup; icon: 'dashboard' | 'players' | 'forms' | 'verification' | 'users' | 'audit'; roles?: NavigationRole[] }

const adminRoles: NavigationRole[] = ['CENTRAL_ADMIN', 'DISTRICT_ADMIN']
export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/dashboard', group: 'Ringkasan', icon: 'dashboard', roles: adminRoles },
  { label: 'Daftar Pemain', to: '/players', group: 'Portal Pemain', icon: 'players', roles: adminRoles },
  { label: 'Review Pendaftaran', to: '/verification', group: 'Portal Pemain', icon: 'verification', roles: adminRoles },
  { label: 'Pengguna', to: '/users', group: 'Sistem', icon: 'users', roles: adminRoles },
  { label: 'Log Audit', to: '/audit-log', group: 'Sistem', icon: 'audit', roles: adminRoles },
]
export const navigationGroups: NavigationGroup[] = ['Ringkasan', 'Portal Pemain', 'Sistem']
