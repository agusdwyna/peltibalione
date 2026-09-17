import type { ReactNode } from 'react'
import AuthenticatedImage from '../../components/ui/AuthenticatedImage'
import CertificateFileLink from '../../components/certificates/CertificateFileLink'
import {
  ageFrom,
  athleteCategoryLabel,
  coachStatusLabel,
  formatDate,
  formatExperience,
  genderLabel,
  joinLabels,
  specializationLabel,
  type CoachCertificate,
} from '../../types/coach'

type CoachLike = {
  fullName: string
  nik: string
  gender: string
  birthDate: string
  address: string
  coachStatus: string
  coachingSince?: number | null
  clubName?: string | null
  athleteCategories?: string[]
  activeAthletes?: number | null
  specializations?: string[]
  otherSpecialization?: string | null
  whatsapp: string
  email?: string | null
  instagram?: string | null
  acceptingNewAthletes?: boolean
  experience?: string | null
  photoId?: string | null
  certificates?: CoachCertificate[]
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

/** Tampilan read-only bagian §5–§9 — dipakai halaman review pengajuan. */
export default function CoachSpecs({ coach }: { coach: CoachLike }) {
  const certificates = coach.certificates ?? []
  const age = ageFrom(coach.birthDate)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-5 pb-1">
        {coach.photoId ? (
          <AuthenticatedImage
            fileId={coach.photoId}
            alt={`Foto ${coach.fullName}`}
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
              ['Nama lengkap', coach.fullName],
              // NIK data internal (§18) — hanya tampil di panel admin.
              ['NIK', <span className="font-mono text-xs">{coach.nik}</span>],
              ['Jenis kelamin', genderLabel(coach.gender)],
              ['Tanggal lahir', `${formatDate(coach.birthDate)}${age != null ? ` · ${age} tahun` : ''}`],
              ['Alamat lengkap', coach.address],
            ]}
          />
        </div>
      </div>

      <Block title="Informasi Kepelatihan">
        <Grid
          rows={[
            ['Status pelatih', coachStatusLabel(coach.coachStatus)],
            ['Mulai melatih', coach.coachingSince ? `${coach.coachingSince}` : null],
            ['Pengalaman', formatExperience(coach.coachingSince)],
            ['Tempat / club melatih', coach.clubName],
            ['Kategori atlet', joinLabels(coach.athleteCategories, athleteCategoryLabel)],
            ['Jumlah atlet aktif', coach.activeAthletes == null ? null : `${coach.activeAthletes} atlet`],
            ['Spesialisasi', joinLabels(coach.specializations, specializationLabel)],
            ['Spesialisasi lainnya', coach.otherSpecialization],
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

      <Block title="Kontak Pelatih">
        <Grid
          rows={[
            ['No. HP / WhatsApp', coach.whatsapp],
            ['Email', coach.email],
            ['Instagram', coach.instagram],
            ['Menerima atlet baru', coach.acceptingNewAthletes ? 'Ya' : 'Tidak'],
          ]}
        />
      </Block>

      <Block title="Pengalaman / Prestasi">
        <p className="whitespace-pre-line text-sm text-gray-800 dark:text-gray-100">{coach.experience || '—'}</p>
      </Block>
    </div>
  )
}
