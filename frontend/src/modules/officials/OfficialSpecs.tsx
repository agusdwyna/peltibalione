import type { ReactNode } from 'react'
import AuthenticatedImage from '../../components/ui/AuthenticatedImage'
import CertificateFileLink from '../../components/certificates/CertificateFileLink'
import {
  ageFrom,
  formatDate,
  formatExperience,
  genderLabel,
  joinLabels,
  officialLevelLabel,
  officialRoleLabel,
  officialStatusLabel,
  tournamentLevelLabel,
  type OfficialCertificate,
  type OfficialTournament,
} from '../../types/official'

type OfficialLike = {
  fullName: string
  nik: string
  gender: string
  birthDate: string
  address: string
  officialStatus: string
  officiatingSince: number
  roles?: string[]
  level?: string | null
  whatsapp: string
  email?: string | null
  instagram?: string | null
  acceptingAssignments?: boolean
  experience?: string | null
  photoId?: string | null
  certificates?: OfficialCertificate[]
  tournaments?: OfficialTournament[]
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-5 dark:border-gray-700/60">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Grid({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-gray-500">{label}</dt>
          <dd className="mt-1 text-sm text-gray-800 dark:text-gray-100">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Satu baris riwayat turnamen — dipakai halaman review maupun detail master. */
export function TournamentRow({ tournament }: { tournament: OfficialTournament }) {
  const meta = [
    tournament.role ? officialRoleLabel(tournament.role) : null,
    tournament.level ? tournamentLevelLabel(tournament.level) : null,
    tournament.location,
  ].filter(Boolean)
  return (
    <li className="rounded-lg border border-gray-200 p-4 dark:border-gray-700/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{tournament.name}</p>
        {tournament.year != null && <span className="shrink-0 text-xs text-gray-400">{tournament.year}</span>}
      </div>
      <p className="mt-1 text-xs text-gray-500">{meta.join(' · ') || '—'}</p>
    </li>
  )
}

/** Tampilan read-only bagian §4–§9 — dipakai halaman review pengajuan. */
export default function OfficialSpecs({ official }: { official: OfficialLike }) {
  const certificates = official.certificates ?? []
  const tournaments = official.tournaments ?? []
  const age = ageFrom(official.birthDate)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-5 pb-1">
        {official.photoId ? (
          <AuthenticatedImage
            fileId={official.photoId}
            alt={`Foto ${official.fullName}`}
            className="h-28 w-28 shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 dark:border-gray-700">
            Belum ada foto
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Grid
            rows={[
              ['Nama lengkap', official.fullName],
              // NIK data internal (§17) — hanya tampil di panel admin.
              ['NIK', <span className="font-mono text-xs">{official.nik}</span>],
              ['Jenis kelamin', genderLabel(official.gender)],
              ['Tanggal lahir', `${formatDate(official.birthDate)}${age != null ? ` · ${age} tahun` : ''}`],
              ['Alamat lengkap', official.address],
            ]}
          />
        </div>
      </div>

      <Block title="Informasi Kewasitan">
        <Grid
          rows={[
            ['Status wasit', officialStatusLabel(official.officialStatus)],
            ['Menjadi wasit sejak', String(official.officiatingSince)],
            ['Pengalaman', formatExperience(official.officiatingSince)],
            ['Peran wasit', joinLabels(official.roles, officialRoleLabel)],
            ['Tingkat wasit', official.level ? officialLevelLabel(official.level) : null],
            // §5 — dihitung dari daftar riwayat, bukan diinput.
            ['Jumlah turnamen', `${tournaments.length} turnamen`],
          ]}
        />
      </Block>

      <Block title={`Lisensi & Sertifikasi (${certificates.length})`}>
        {certificates.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada lisensi atau sertifikat yang dicatat.</p>
        ) : (
          <ul className="space-y-3">
            {certificates.map((certificate) => (
              <li key={certificate.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{certificate.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {[certificate.level, certificate.issuer, certificate.year].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <CertificateFileLink file={certificate.file} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title={`Riwayat Turnamen (${tournaments.length})`}>
        {tournaments.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada riwayat turnamen yang dicatat.</p>
        ) : (
          <ul className="space-y-3">
            {tournaments.map((tournament) => (
              <TournamentRow key={tournament.id} tournament={tournament} />
            ))}
          </ul>
        )}
      </Block>

      <Block title="Kontak Wasit">
        <Grid
          rows={[
            ['No. HP / WhatsApp', official.whatsapp],
            ['Email', official.email],
            ['Instagram', official.instagram],
            ['Menerima penugasan', official.acceptingAssignments ? 'Ya' : 'Tidak'],
          ]}
        />
      </Block>

      <Block title="Pengalaman / Catatan Kewasitan">
        <p className="whitespace-pre-line text-sm text-gray-800 dark:text-gray-100">{official.experience || '—'}</p>
      </Block>
    </div>
  )
}
