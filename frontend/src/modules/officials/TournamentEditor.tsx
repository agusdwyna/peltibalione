import type { Dispatch, SetStateAction } from 'react'
import {
  OFFICIAL_ROLE_OPTIONS,
  TOURNAMENT_LEVEL_OPTIONS,
  type OfficialRole,
  type OfficialTournament,
  type TournamentLevel,
} from '../../types/official'

/**
 * Satu baris riwayat turnamen yang sedang disunting (§7). Jumlah baris di sini
 * adalah angka "Jumlah Turnamen" (§5) — tidak pernah diketik manual.
 */
export type TournamentDraft = {
  /** Kunci stabil untuk React — tidak dikirim ke server. */
  key: string
  /** Terisi bila riwayat ini sudah tersimpan sebagai baris di master. */
  id?: string
  name: string
  year: string
  level: TournamentLevel | ''
  role: OfficialRole | ''
  location: string
}

let draftCounter = 0
function newDraftKey() {
  draftCounter += 1
  return `tournament-${draftCounter}`
}

export function emptyTournamentDraft(): TournamentDraft {
  return { key: newDraftKey(), name: '', year: '', level: '', role: '', location: '' }
}

/** Ubah riwayat tersimpan menjadi draft yang bisa disunting. */
export function draftsFromTournaments(tournaments: OfficialTournament[]): TournamentDraft[] {
  return tournaments.map((tournament) => ({
    key: newDraftKey(),
    id: tournament.id,
    name: tournament.name,
    year: tournament.year == null ? '' : String(tournament.year),
    level: tournament.level ?? '',
    role: tournament.role ?? '',
    location: tournament.location ?? '',
  }))
}

type Props = {
  drafts: TournamentDraft[]
  setDrafts: Dispatch<SetStateAction<TournamentDraft[]>>
}

const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'

export default function TournamentEditor({ drafts, setDrafts }: Props) {
  const patch = (key: string, changes: Partial<TournamentDraft>) => {
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...changes } : draft)))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Satu wasit boleh memiliki banyak riwayat turnamen. Jumlah turnamen dihitung otomatis dari daftar ini.
      </p>

      {drafts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700">
          Belum ada riwayat turnamen yang dicatat.
        </p>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft, index) => (
            <div key={draft.key} className="rounded-lg border border-gray-200 dark:border-gray-700/60">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5 dark:border-gray-700/60">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Turnamen {index + 1}</p>
                <button
                  type="button"
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                  onClick={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}
                >
                  Hapus
                </button>
              </div>
              <div className="grid gap-5 px-4 py-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className={labelClass}>
                    Nama Turnamen <span className="text-red-500">*</span>
                  </span>
                  <input
                    className="form-input w-full"
                    value={draft.name}
                    maxLength={200}
                    required
                    onChange={(event) => patch(draft.key, { name: event.target.value })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Tahun Turnamen</span>
                  <input
                    className="form-input w-full"
                    type="number"
                    min={1950}
                    max={new Date().getFullYear() + 1}
                    value={draft.year}
                    onChange={(event) => patch(draft.key, { year: event.target.value })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Tingkat Turnamen</span>
                  <select
                    className="form-select w-full"
                    value={draft.level}
                    onChange={(event) => patch(draft.key, { level: event.target.value as TournamentLevel | '' })}
                  >
                    <option value="">Belum ditentukan</option>
                    {TOURNAMENT_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Peran Saat Bertugas</span>
                  <select
                    className="form-select w-full"
                    value={draft.role}
                    onChange={(event) => patch(draft.key, { role: event.target.value as OfficialRole | '' })}
                  >
                    <option value="">Belum ditentukan</option>
                    {OFFICIAL_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Lokasi Turnamen</span>
                  <input
                    className="form-input w-full"
                    value={draft.location}
                    maxLength={200}
                    onChange={(event) => patch(draft.key, { location: event.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        onClick={() => setDrafts((current) => [...current, emptyTournamentDraft()])}
      >
        + Tambah Pengalaman Turnamen
      </button>
    </div>
  )
}

/** Ubah draft menjadi payload yang diterima backend. */
export function tournamentDraftsToInput(drafts: TournamentDraft[]) {
  return drafts
    // Baris tanpa nama turnamen tidak membawa informasi apa pun.
    .filter((draft) => draft.name.trim())
    .map((draft) => {
      const year = Number(draft.year)
      return {
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name.trim(),
        ...(draft.year && Number.isFinite(year) ? { year } : {}),
        ...(draft.level ? { level: draft.level } : {}),
        ...(draft.role ? { role: draft.role } : {}),
        ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
      }
    })
}

/** Riwayat tanpa nama turnamen tidak bisa disimpan — beri tahu sebelum submit. */
export function findUnnamedTournament(drafts: TournamentDraft[]) {
  return drafts.some(
    (draft) => !draft.name.trim() && (draft.year.trim() || draft.level || draft.role || draft.location.trim()),
  )
}
