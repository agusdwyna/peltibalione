import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PublicDetailShell, { DetailCard, DetailEmpty, DetailRows } from '../components/portal/PublicDetailShell'
import { api, ApiError } from '../lib/api'
import { districtLabel } from '../lib/district'
import type { PublicOfficialDetail } from '../types/portal'
import { genderLabel, officialLevelLabel, officialRoleLabel, officialStatusLabel, tournamentLevelLabel } from '../types/official'

/**
 * Detail wasit untuk publik.
 *
 * Riwayat turnamen ditampilkan LENGKAP — termasuk tahun dan lokasi. Ini
 * berbeda dari prestasi pemain yang sengaja dibatasi tahunnya: wasit adalah
 * orang dewasa, dan rekam jejak turnamen adalah kualifikasi profesionalnya —
 * justru itu yang dicari orang saat menilai seorang wasit.
 *
 * NIK, tanggal lahir, alamat, dan kontak tetap tidak ditampilkan.
 */
export default function PublicOfficialDetailPage() {
  const { code } = useParams<{ code: string }>()
  const [official, setOfficial] = useState<PublicOfficialDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) { setError('Kode wasit tidak valid.'); setLoading(false); return }
    api.public.official(code)
      .then(setOfficial)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Data wasit tidak dapat dimuat.'))
      .finally(() => setLoading(false))
  }, [code])

  return <PublicDetailShell
    eyebrow="Wasit Terverifikasi"
    title={official?.fullName ?? 'Detail Wasit'}
    code={official?.officialCode}
    districtName={official ? districtLabel(official.district.name) : null}
    photoUrl={official?.photoId ? api.files.publicUrl(official.photoId) : null}
    loading={loading}
    error={error}
  >
    {official && <>
      <DetailCard title="Profil kewasitan" description="Data resmi yang tercatat di PELTI Bali.">
        <DetailRows rows={[
          ['Status', officialStatusLabel(official.officialStatus)],
          ['Tingkat', official.level ? officialLevelLabel(official.level) : null],
          ['Peran', official.roles.map(officialRoleLabel).join(', ') || null],
          ['Mulai menjadi wasit', String(official.officiatingSince)],
          ['Pengalaman', official.experienceYears !== null && official.experienceYears !== undefined ? `${official.experienceYears} tahun` : null],
          ['Jumlah turnamen tercatat', official.tournaments.length > 0 ? `${official.tournaments.length} turnamen` : null],
          ['Jenis kelamin', official.gender ? genderLabel(official.gender) : null],
          ['Kabupaten/Kota', districtLabel(official.district.name)],
        ]} />
        {official.acceptingAssignments && <p className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200">
          Menerima penugasan sebagai wasit.
        </p>}
      </DetailCard>

      <DetailCard
        title="Riwayat turnamen"
        description={official.tournaments.length > 0 ? `${official.tournaments.length} turnamen yang pernah ditangani.` : undefined}
      >
        {official.tournaments.length === 0
          ? <DetailEmpty message="Belum ada riwayat turnamen yang tercatat." />
          : <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {official.tournaments.map((item, index) => <li key={`${item.name}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</p>
                {item.location && <p className="mt-0.5 text-sm text-gray-500">{item.location}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-gray-500">
                {item.level && <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700 dark:text-gray-300">{tournamentLevelLabel(item.level)}</span>}
                {item.role && <span>{officialRoleLabel(item.role)}</span>}
                {item.year && <span className="tabular-nums">{item.year}</span>}
              </div>
            </li>)}
          </ul>}
      </DetailCard>

      {official.certificates.length > 0 && <DetailCard title="Lisensi & sertifikasi" description="Kredensial kewasitan yang tercatat. Berkas tidak ditampilkan untuk publik.">
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {official.certificates.map((item, index) => <li key={`${item.name}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</p>
              {item.issuer && <p className="mt-0.5 text-sm text-gray-500">{item.issuer}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
              {item.level && <span>{item.level}</span>}
              {item.year && <span className="tabular-nums">{item.year}</span>}
            </div>
          </li>)}
        </ul>
      </DetailCard>}

      {official.experience && <DetailCard title="Pengalaman" description="Keterangan yang diisi oleh wasit.">
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">{official.experience}</p>
      </DetailCard>}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700/60 dark:bg-gray-800 sm:p-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Kontak wasit tidak ditampilkan</h2>
        <p className="mt-1 text-sm text-gray-500">
          Nomor telepon, email, dan media sosial wasit bersifat pribadi dan tidak dipublikasikan. Untuk penugasan resmi, silakan lewat pengurus PELTI Bali.
        </p>
      </section>
    </>}
  </PublicDetailShell>
}
