export type NavigationGroup = 'Ringkasan' | 'Master Data' | 'Sistem'
export type NavigationRole = 'CENTRAL_ADMIN' | 'DISTRICT_ADMIN' | 'PLAYER'
export type NavigationItem = {
  label: string
  to: string
  group: NavigationGroup
  icon: 'dashboard' | 'players' | 'forms' | 'verification' | 'users' | 'audit' | 'facilities' | 'coaches' | 'officials'
  roles?: NavigationRole[]
  /**
   * Rute lain yang tetap menyalakan menu ini. Dipakai halaman review yang
   * alamatnya tidak berawalan sama dengan menu induknya.
   */
  alsoMatches?: string[]
}

const adminRoles: NavigationRole[] = ['CENTRAL_ADMIN', 'DISTRICT_ADMIN']

/**
 * Antrean review sengaja tidak dijadikan menu sendiri. Masing-masing halaman
 * master data punya tombol "Review …" di sebelah Kelola Form, lengkap dengan
 * lencana jumlah yang menunggu — sehingga review selalu terbaca sebagai bagian
 * dari data yang sedang dibuka, bukan modul terpisah.
 */
export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/dashboard', group: 'Ringkasan', icon: 'dashboard', roles: adminRoles },
  // Review pendaftaran pemain hidup di /verification, bukan /players/review.
  { label: 'Daftar Pemain', to: '/players', group: 'Master Data', icon: 'players', roles: adminRoles, alsoMatches: ['/verification'] },
  { label: 'Fasilitas Lapangan', to: '/facilities', group: 'Master Data', icon: 'facilities', roles: adminRoles },
  { label: 'Master Pelatih', to: '/coaches', group: 'Master Data', icon: 'coaches', roles: adminRoles },
  { label: 'Master Wasit', to: '/officials', group: 'Master Data', icon: 'officials', roles: adminRoles },
  { label: 'Pengguna', to: '/users', group: 'Sistem', icon: 'users', roles: adminRoles },
  { label: 'Log Audit', to: '/audit-log', group: 'Sistem', icon: 'audit', roles: adminRoles },
]
export const navigationGroups: NavigationGroup[] = ['Ringkasan', 'Master Data', 'Sistem']
