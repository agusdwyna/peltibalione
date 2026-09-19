import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import BackLink from '../components/portal/BackLink'
import { api } from '../lib/api'
import { formatAgeGroup } from '../lib/age-group'
import { districtLabel } from '../lib/district'
import { FORM_ROUTES, type FormKind } from '../lib/form-kind'
import type { PublicDistrictOverview } from '../types/portal'
import { courtTypeLabel } from '../types/facility'
import { specializationLabel } from '../types/coach'
import { officialLevelLabel, officialRoleLabel } from '../types/official'

type Tab = 'players' | 'coaches' | 'facilities' | 'officials'

const TABS: Array<[Tab, string]> = [
  ['players', 'Pemain'],
  ['coaches', 'Pelatih'],
  ['facilities', 'Sarana & Prasarana'],
  ['officials', 'Wasit'],
]

/** Tab yang sedang dibuka menentukan form mana yang ditawarkan. */
const TAB_FORM: Record<Tab, FormKind> = {
  players: 'player',
  coaches: 'coach',
  facilities: 'facility',
  officials: 'official',
}

/** Sebutan ringkas per tab untuk kalimat ringkasan di kepala halaman. */
const COUNT_LABEL: Record<Tab, string> = {
  players: 'pemain resmi terdaftar',
  coaches: 'pelatih terverifikasi',
  facilities: 'lapangan terverifikasi',
  officials: 'wasit terverifikasi',
}

const CTA: Record<FormKind, { action: string; heading: string; open: string; closed: string }> = {
  player: {
    action: 'Daftar sebagai pemain',
    heading: 'Belum terdaftar sebagai pemain?',
    open: 'Lengkapi formulir pendaftaran pemain untuk wilayah ini. Data Anda akan diverifikasi admin PELTI.',
    closed: 'Pendaftaran pemain untuk wilayah ini sedang ditutup.',
  },
  coach: {
    action: 'Daftar sebagai pelatih',
    heading: 'Belum terdaftar sebagai pelatih?',
    open: 'Lengkapi formulir pendataan pelatih untuk wilayah ini. Data Anda akan diverifikasi admin PELTI.',
    closed: 'Pendataan pelatih untuk wilayah ini sedang ditutup.',
  },
  facility: {
    action: 'Daftarkan lapangan',
    heading: 'Punya lapangan yang belum terdata?',
    open: 'Lengkapi formulir pendataan lapangan untuk wilayah ini. Admin PELTI akan menetapkan grade lapangan.',
    closed: 'Pendataan lapangan untuk wilayah ini sedang ditutup.',
  },
  official: {
    action: 'Daftar sebagai wasit',
    heading: 'Belum terdaftar sebagai wasit?',
    open: 'Lengkapi formulir pendataan wasit untuk wilayah ini. Data Anda akan diverifikasi admin PELTI.',
    closed: 'Pendataan wasit untuk wilayah ini sedang ditutup.',
  },
}

/**
 * Ajakan di kaki halaman — sengaja BUKAN tombol daftar.
 *
 * Tombol daftar sudah ada di kepala halaman dan memakai aksi yang sama persis;
 * mengulanginya di bawah hanya memakan ruang tanpa menambah jalan masuk. Yang
 * tidak ada di atas adalah cara memeriksa data yang sudah pernah dikirim, jadi
 * itu yang ditawarkan di sini.
 *
 * Berlaku untuk pemain, pelatih, dan wasit sekaligus — halaman Cek Status
 * memang menelusuri ketiga peran. Lapangan memakai pencarian, karena lapangan
 * tidak punya NIK dan tidak bisa dicari dengan cara yang sama.
 */
const PERSON_CTA = {
  heading: 'Sudah pernah mendaftar?',
  body: 'Periksa status verifikasi pengajuan Anda. Satu NIK dapat terdaftar pada beberapa peran sekaligus — pemain, pelatih, maupun wasit.',
  action: 'Cek status pendaftaran',
}

const CHECK_STATUS_CTA: Record<FormKind, { heading: string; body: string; action: string }> = {
  player: PERSON_CTA,
  coach: PERSON_CTA,
  official: PERSON_CTA,
  facility: {
    heading: 'Mencari data lapangan?',
    body: 'Cari lapangan tenis terverifikasi beserta grade, jam operasional, jumlah court, dan kontak pengelolanya.',
    action: 'Cari data lapangan',
  },
}

function textMatches(values: Array<string | null | undefined>, query: string) {
  if (!query) return true
  return values.some((value) => (value ?? '').toLowerCase().includes(query))
}

/**
 * Nomor urut kartu dalam dua digit, mis. "01".
 *
 * Dihitung dari posisi di daftar yang sedang tampil, jadi ikut berubah saat
 * difilter — nomor di layar selalu berurutan 01, 02, 03 tanpa lompat, yang
 * membuatnya mudah dirujuk saat dibicarakan.
 */
function ordinal(index: number) {
  return String(index + 1).padStart(2, '0')
}

function experienceSince(year?: number | null) {
  if (!year) return null
  const years = new Date().getFullYear() - year
  if (years < 0) return null
  return years === 0 ? '< 1 tahun' : `${years} tahun`
}

/**
 * Satu baris keterangan di dalam kartu.
 *
 * Tanpa ikon dan tanpa label: setiap baris dibuat mendeskripsikan dirinya
 * sendiri ("KU 14 Putra", "10 tahun pengalaman", "Grade A"), sehingga tidak
 * perlu penanda apa pun untuk dipahami. Kabupaten juga tidak diulang di sini —
 * namanya sudah besar di kepala halaman, dan mengulangnya di tiap kartu hanya
 * menambah baris tanpa menambah informasi.
 */
function CardMeta({ children }: { children: React.ReactNode }) {
  return <p className="truncate text-[13px] text-gray-600 dark:text-gray-400">{children}</p>
}

/**
 * Kartu entitas untuk portal publik.
 *
 * Seluruh kartu dapat diklik lewat stretched-link pada judul (pola yang sama
 * dipakai tombol "Detail" di bawah): area klik jadi besar tanpa perlu
 * membungkus semuanya dengan handler klik, sehingga kartu tetap berupa tautan
 * sungguhan — bisa dibuka di tab baru dan terbaca pembaca layar.
 *
 * Foto sengaja TIDAK ditampilkan di kartu; foto ada di halaman detail. Kartu
 * pemain akan selalu kosong tanpa foto (foto anak tidak dipublikasikan), jadi
 * menampilkan foto di sini hanya akan membuat satu tab terlihat berbeda dari
 * yang lain tanpa alasan yang jelas bagi pengunjung.
 */
function EntityCard({ to, ordinal, name, subtitle, code, detailLabel, children }: {
  to: string
  /** Nomor urut tampil, mis. "01". */
  ordinal: string
  name: string
  subtitle?: string | null
  /** Kode resmi entitas, mis. "PL-BDG-000001". */
  code: string
  /** Keterangan tombol untuk pembaca layar, mis. "Lihat detail pemain Budi". */
  detailLabel: string
  children: React.ReactNode
}) {
  return <article className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white px-6 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500 dark:border-gray-700/60 dark:bg-gray-800 dark:hover:border-violet-500">
    <div className="flex items-start justify-between">
      <span className="text-xl font-medium tracking-tight text-gray-300 tabular-nums dark:text-gray-600">{ordinal}</span>
      {/* Panah miring sebagai penanda "ada halaman lain" — bergerak saat hover. */}
      <span className="text-xl leading-none text-violet-700 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-1 dark:text-violet-400" aria-hidden="true">↗</span>
    </div>

    <div className="mt-8">
      <h3 className="text-[17px] font-semibold uppercase tracking-[-0.01em] text-gray-900 dark:text-gray-100">
        <Link className="after:absolute after:inset-0 after:content-['']" to={to}>{name}</Link>
      </h3>
      {subtitle && <p className="mt-1 truncate text-[14px] text-gray-600 dark:text-gray-400">{subtitle}</p>}
    </div>

    <div className="mt-5 flex-1 space-y-2">{children}</div>

    <div className="my-5 h-px bg-gray-200 dark:bg-gray-700/60" />

    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate font-mono text-[12px] tracking-wide text-gray-500 dark:text-gray-400">{code}</span>
      {/* relative menempatkan tautan ini di atas stretched-link judul, supaya
          tetap bisa diklik sendiri. */}
      <Link className="relative inline-flex shrink-0 items-center gap-2 text-[13px] font-medium text-violet-700 transition-colors hover:text-gray-900 dark:text-violet-400 dark:hover:text-gray-100" to={to} aria-label={detailLabel}>
        Lihat Detail
        <span className="text-[17px] transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span>
      </Link>
    </div>
  </article>
}

/** Grid kartu. Makin rapat kolomnya seiring lebar layar agar kartu tidak melebar. */
function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

/** Keadaan kosong yang membedakan "belum ada data" dari "tidak cocok filter". */
function EmptyState({ filtered, message }: { filtered: boolean; message: string }) {
  return <div className="rounded-xl border border-dashed border-gray-200 px-6 py-16 text-center dark:border-gray-700/60">
    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{filtered ? 'Tidak ada hasil yang cocok' : 'Belum ada data'}</p>
    <p className="mt-1 text-sm text-gray-400">{filtered ? 'Coba ubah kata kunci atau filter.' : message}</p>
  </div>
}

/**
 * Ikon per kategori. Semuanya digambar dengan dasar yang sama — lingkaran
 * untuk kepala figur — supaya keempatnya terbaca sebagai satu keluarga.
 */
function TabIcon({ tab }: { tab: Tab }) {
  const common = { className: 'h-4 w-4 shrink-0', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

  if (tab === 'players') return <svg {...common}>
    <circle cx="12" cy="7.5" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>

  if (tab === 'coaches') return <svg {...common}>
    <circle cx="9" cy="7.5" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M17 4.5v6M20 7.5h-6" />
  </svg>

  if (tab === 'facilities') return <svg {...common}>
    <path d="M3 9h18M3 15h18M9 4v16M15 4v16" />
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
  </svg>

  return <svg {...common}>
    <circle cx="12" cy="6.5" r="2.5" />
    <path d="M12 9v6M8 20l4-5 4 5" />
  </svg>
}

export default function PublicDistrictOverviewPage() {
  const { districtId } = useParams<{ districtId: string }>()
  const navigate = useNavigate()
  const [overview, setOverview] = useState<PublicDistrictOverview | null>(null)
  const [tab, setTab] = useState<Tab>('players')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!districtId) return
    api.districts.overview(districtId).then(setOverview).catch(() => setError('Overview kabupaten/kota tidak dapat dimuat.'))
  }, [districtId])

  const search = query.trim().toLowerCase()

  const players = useMemo(() => (overview?.players ?? []).filter((player) =>
    textMatches([player.fullName, player.playerCode, player.clubName], search)
    && (!filter || player.ageGroup === filter)), [overview, search, filter])

  const coaches = useMemo(() => (overview?.coaches ?? []).filter((coach) =>
    textMatches([coach.fullName, coach.coachCode, coach.clubName], search)
    && (!filter || (coach.specializations ?? []).includes(filter))), [overview, search, filter])

  const facilities = useMemo(() => (overview?.facilities ?? []).filter((facility) =>
    textMatches([facility.name, facility.facilityCode, facility.address], search)
    && (!filter || facility.courtType === filter)), [overview, search, filter])

  const officials = useMemo(() => (overview?.officials ?? []).filter((official) =>
    textMatches([official.fullName, official.officialCode], search)
    && (!filter || (official.roles ?? []).includes(filter))), [overview, search, filter])

  /**
   * Tombol "Daftar" selalu tampil. Bila form-nya belum dibuka, halaman form
   * sendiri yang menjelaskan keadaannya dengan pesan yang sopan — jadi
   * pengunjung tidak diarahkan ke halaman yang tidak berhubungan.
   */
  const openForm = (kind: FormKind, token: string | null) => {
    const state = { districtName: overview?.district.name ?? null }
    navigate(token ? `${FORM_ROUTES[kind]}/${token}` : FORM_ROUTES[kind], { state })
  }

  /** Pindah tab selalu mengembalikan filter ke keadaan awal. */
  const changeTab = (key: Tab) => { setTab(key); setQuery(''); setFilter('') }

  if (error) {
    return <main className="min-h-screen bg-gray-50 px-4 py-16 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700/60 dark:bg-gray-800">
        <p className="text-sm text-red-600">{error}</p>
        <BackLink className="mt-4" to="/" label="Kembali ke peta Bali" />
      </div>
    </main>
  }

  if (!overview) {
    return <main className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500 dark:bg-gray-900">Memuat overview…</main>
  }

  const totals: Record<Tab, number> = {
    players: overview.players.length,
    coaches: overview.coaches?.length ?? 0,
    facilities: overview.facilities?.length ?? 0,
    officials: overview.officials?.length ?? 0,
  }
  const visible = { players: players.length, coaches: coaches.length, facilities: facilities.length, officials: officials.length }

  const activeKind = TAB_FORM[tab]
  const activeToken = (overview.registrationForms?.[activeKind] ?? null) as string | null
  const cta = CTA[activeKind]
  const footerCta = CHECK_STATUS_CTA[activeKind]

  // Pilihan filter diambil dari data yang benar-benar ada, bukan daftar tetap —
  // supaya tidak ada opsi yang selalu menghasilkan nol baris.
  const filterOptions: Array<{ value: string; label: string }> = tab === 'players'
    ? [...new Set(overview.players.map((player) => player.ageGroup).filter(Boolean) as string[])]
      .sort().map((code) => ({ value: code, label: code }))
    : tab === 'coaches'
      ? [...new Set((overview.coaches ?? []).flatMap((coach) => coach.specializations ?? []))]
        .sort().map((value) => ({ value, label: specializationLabel(value) }))
      : tab === 'facilities'
        ? [...new Set((overview.facilities ?? []).map((facility) => facility.courtType).filter(Boolean) as string[])]
          .sort().map((value) => ({ value, label: courtTypeLabel(value) }))
        : [...new Set((overview.officials ?? []).flatMap((official) => official.roles ?? []))]
          .sort().map((value) => ({ value, label: officialRoleLabel(value) }))

  const filterLabel: Record<Tab, string> = {
    players: 'Kelompok umur',
    coaches: 'Spesialisasi',
    facilities: 'Jenis lapangan',
    officials: 'Peran',
  }

  const isFiltered = Boolean(search || filter)

  return <main className="min-h-screen bg-gray-50 pb-16 dark:bg-gray-900">
    {/* ── Kepala halaman ───────────────────────────────────────── */}
    <header className="border-b border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink to="/" label="Kembali ke peta Bali" />

        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Data Resmi PELTI</p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-[-0.02em] text-gray-900 dark:text-gray-100">
              {districtLabel(overview.district.name)}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {totals[tab].toLocaleString('id-ID')} {COUNT_LABEL[tab]}
            </p>
          </div>

          <button
            type="button"
            className="btn bg-gray-900 px-5 text-sm text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            onClick={() => openForm(activeKind, activeToken)}
          >
            {cta.action}
          </button>
        </div>
      </div>
    </header>

    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* ── Kategori data ──────────────────────────────────────────
          Segmented control: satu kontrol berisi empat pilihan, bukan empat
          tab halaman. Semua kategori membaca satu himpunan data yang sama,
          jadi bentuk ini lebih jujur daripada garis bawah navigasi. */}
      <nav
        className="mt-8 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-100/70 p-1 dark:border-gray-700/60 dark:bg-gray-800/60"
        aria-label="Kategori data publik"
      >
        {TABS.map(([key, label]) => {
          const active = tab === key
          return <button
            key={key}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition sm:px-4 ${active
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
              : 'text-gray-500 hover:bg-white/70 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/40 dark:hover:text-gray-200'}`}
            onClick={() => changeTab(key)}
            aria-current={active ? 'true' : undefined}
          >
            <TabIcon tab={key} />
            {label}
            {/* Angka dipisah garis tipis, tanpa latar: terbaca sebagai jumlah
                di belakang label, bukan label kedua yang bersaing dengannya. */}
            <span aria-hidden className={`h-4 w-px ${active ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-300/70 dark:bg-gray-700'}`} />
            <span className={`min-w-[1.25rem] text-right text-sm font-semibold tabular-nums ${active
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-gray-400 dark:text-gray-500'}`}>
              {totals[key]}
            </span>
          </button>
        })}
      </nav>

      {/* ── Pencarian & filter ─────────────────────────────────────
          Hanya tampil bila tab ini punya baris. Menampilkan kotak cari dan
          "0 baris" di atas tabel kosong hanya menyesatkan — tidak ada yang
          bisa dicari, dan dropdown-nya pun tak punya pilihan. */}
      {totals[tab] > 0 && <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <label className="sr-only" htmlFor="overview-search">Cari data</label>
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="overview-search"
            className="form-input w-full pl-9"
            type="search"
            placeholder={tab === 'facilities' ? 'Cari nama atau alamat' : 'Cari nama atau kode'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {filterOptions.length > 0 && <select
          className="form-select w-full sm:max-w-[220px]"
          aria-label={filterLabel[tab]}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="">Semua {filterLabel[tab].toLowerCase()}</option>
          {filterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>}

        <p className="text-xs text-gray-500 sm:ml-auto" aria-live="polite">
          {isFiltered
            ? <>Menampilkan <strong className="font-semibold text-gray-700 tabular-nums dark:text-gray-300">{visible[tab]}</strong> dari <span className="tabular-nums">{totals[tab]}</span> baris</>
            : <><strong className="font-semibold text-gray-700 tabular-nums dark:text-gray-300">{totals[tab]}</strong> baris</>}
        </p>
      </div>}

      <div className="mt-4">
        {/* ── Pemain ────────────────────────────────────────────── */}
        {tab === 'players' && (players.length === 0
          ? <EmptyState filtered={isFiltered} message="Pemain resmi wilayah ini akan tampil di sini." />
          : <CardGrid>{players.map((player, index) => <EntityCard
            key={player.playerCode}
            to={`/pemain/${player.playerCode}`}
            ordinal={ordinal(index)}
            name={player.fullName}
            subtitle={player.clubName}
            code={player.playerCode}
            detailLabel={`Lihat detail pemain ${player.fullName}`}
          >
            <CardMeta>{formatAgeGroup(player.ageGroup, (player.gender ?? null) as 'PUTRA' | 'PUTRI' | null)}</CardMeta>
            <CardMeta>{player.pnpRank ? `Peringkat PNP #${player.pnpRank}${player.pnpPeriod ? ` · ${player.pnpPeriod}` : ''}` : 'Peringkat PNP belum ada'}</CardMeta>
            <CardMeta>{player.status === 'ACTIVE' ? 'Aktif bermain' : player.status === 'INACTIVE' ? 'Tidak aktif' : 'Terverifikasi'}</CardMeta>
          </EntityCard>)}</CardGrid>)}

        {/* ── Pelatih ───────────────────────────────────────────── */}
        {/* Status verifikasi tidak ditampilkan: seluruh kartu di sini sudah
            terverifikasi, jadi keterangannya akan sama semua. */}
        {tab === 'coaches' && (coaches.length === 0
          ? <EmptyState filtered={isFiltered} message="Pelatih terverifikasi wilayah ini akan tampil di sini." />
          : <CardGrid>{coaches.map((coach, index) => <EntityCard
            key={coach.coachCode}
            to={`/pelatih/${coach.coachCode}`}
            ordinal={ordinal(index)}
            name={coach.fullName}
            subtitle={coach.clubName ?? 'Tempat melatih belum diisi'}
            code={coach.coachCode}
            detailLabel={`Lihat detail pelatih ${coach.fullName}`}
          >
            <CardMeta>
              {(coach.specializations?.length ?? 0) > 0
                ? `Spesialisasi ${coach.specializations!.map(specializationLabel).join(', ')}`
                : 'Spesialisasi belum diisi'}
            </CardMeta>
            <CardMeta>
              {coach.coachingSince
                ? `Melatih sejak ${coach.coachingSince} · ${experienceSince(coach.coachingSince)}`
                : 'Pengalaman belum diisi'}
            </CardMeta>
          </EntityCard>)}</CardGrid>)}

        {/* ── Sarana & Prasarana ────────────────────────────────── */}
        {tab === 'facilities' && (facilities.length === 0
          ? <EmptyState filtered={isFiltered} message="Lapangan terverifikasi wilayah ini akan tampil di sini." />
          : <CardGrid>{facilities.map((facility, index) => <EntityCard
            key={facility.facilityCode}
            to={`/lapangan/${facility.facilityCode}`}
            ordinal={ordinal(index)}
            name={facility.name}
            subtitle={facility.address}
            code={facility.facilityCode}
            detailLabel={`Lihat detail lapangan ${facility.name}`}
          >
            <CardMeta>
              {facility.courtCount
                ? `${facility.courtCount} court${facility.courtType ? ` · ${courtTypeLabel(facility.courtType)}` : ''}`
                : 'Jumlah court belum diisi'}
            </CardMeta>
            <CardMeta>
              {facility.openTime && facility.closeTime ? `Buka ${facility.openTime}–${facility.closeTime}` : 'Jam operasional belum diisi'}
            </CardMeta>
            <CardMeta>{facility.grade ? `Grade ${facility.grade}` : 'Grade belum ditetapkan'}</CardMeta>
          </EntityCard>)}</CardGrid>)}

        {/* ── Wasit ─────────────────────────────────────────────── */}
        {/* Sama seperti pelatih: status akan seragam, jadi diganti peran. */}
        {tab === 'officials' && (officials.length === 0
          ? <EmptyState filtered={isFiltered} message="Wasit terverifikasi wilayah ini akan tampil di sini." />
          : <CardGrid>{officials.map((official, index) => <EntityCard
            key={official.officialCode}
            to={`/wasit/${official.officialCode}`}
            ordinal={ordinal(index)}
            name={official.fullName}
            subtitle={official.level ? `Tingkat ${officialLevelLabel(official.level)}` : 'Tingkat belum diisi'}
            code={official.officialCode}
            detailLabel={`Lihat detail wasit ${official.fullName}`}
          >
            <CardMeta>
              {(official.roles?.length ?? 0) > 0
                ? `Peran ${official.roles!.map(officialRoleLabel).join(', ')}`
                : 'Peran belum diisi'}
            </CardMeta>
            <CardMeta>
              {official.officiatingSince
                ? `Menwasiti sejak ${official.officiatingSince} · ${experienceSince(official.officiatingSince)}`
                : 'Pengalaman belum diisi'}
            </CardMeta>
          </EntityCard>)}</CardGrid>)}
      </div>

      {/* ── Kaki halaman ───────────────────────────────────────────
          Tidak ada tombol daftar di sini: tombol itu sudah ada di kepala
          halaman dengan aksi yang sama. Yang ditawarkan di sini adalah hal
          yang belum ada di atas — memeriksa data yang sudah terkirim. */}
      <section className="mt-10 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700/60 dark:bg-gray-800 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{footerCta.heading}</h2>
            <p className="mt-1 text-sm text-gray-500">{footerCta.body}</p>
          </div>
          <Link className="btn border border-gray-200 bg-white px-5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700" to="/check-status">
            {footerCta.action}
          </Link>
        </div>
      </section>
    </div>
  </main>
}
