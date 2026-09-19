import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PublicDetailShell, { DetailCard, DetailEmpty, DetailRows } from '../components/portal/PublicDetailShell'
import { api, ApiError } from '../lib/api'
import { districtLabel } from '../lib/district'
import type { PublicCoachDetail } from '../types/portal'
import { athleteCategoryLabel, coachStatusLabel, genderLabel, specializationLabel } from '../types/coach'

/**
 * Detail pelatih untuk publik.
 *
 * NIK, tanggal lahir, alamat, dan seluruh kontak tidak ditampilkan. Foto profil
 * boleh tampil — pelatih mendaftar sendiri dan fotonya berfungsi sebagai
 * identitas profesional, berbeda dari foto pemain yang dilindungi.
 */
export default function PublicCoachDetailPage() {
  const { code } = useParams<{ code: string }>()
  const [coach, setCoach] = useState<PublicCoachDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) { setError('Kode pelatih tidak valid.'); setLoading(false); return }
    api.public.coach(code)
      .then(setCoach)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Data pelatih tidak dapat dimuat.'))
      .finally(() => setLoading(false))
  }, [code])

  // Spesialisasi "LAINNYA" diganti dengan keterangan yang diisi pelatihnya,
  // karena "Lainnya" sendirian tidak memberi informasi apa pun.
  const specializations = (coach?.specializations ?? [])
    .map((value) => value === 'LAINNYA' && coach?.otherSpecialization ? coach.otherSpecialization : specializationLabel(value))
    .join(', ')

  return <PublicDetailShell
    eyebrow="Pelatih Terverifikasi"
    title={coach?.fullName ?? 'Detail Pelatih'}
    code={coach?.coachCode}
    districtName={coach ? districtLabel(coach.district.name) : null}
    photoUrl={coach?.photoId ? api.files.publicUrl(coach.photoId) : null}
    loading={loading}
    error={error}
  >
    {coach && <>
      <DetailCard title="Profil kepelatihan" description="Data resmi yang tercatat di PELTI Bali.">
        <DetailRows rows={[
          ['Status', coachStatusLabel(coach.coachStatus)],
          ['Mulai melatih', coach.coachingSince ? String(coach.coachingSince) : null],
          ['Pengalaman', coach.experienceYears !== null && coach.experienceYears !== undefined ? `${coach.experienceYears} tahun` : null],
          ['Klub / tempat melatih', coach.clubName],
          ['Spesialisasi', specializations || null],
          ['Kategori atlet', coach.athleteCategories.map(athleteCategoryLabel).join(', ') || null],
          ['Atlet aktif', coach.activeAthletes !== null && coach.activeAthletes !== undefined ? `${coach.activeAthletes} orang` : null],
          ['Jenis kelamin', coach.gender ? genderLabel(coach.gender) : null],
          ['Kabupaten/Kota', districtLabel(coach.district.name)],
        ]} />
        {coach.acceptingNewAthletes && <p className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200">
          Menerima atlet baru untuk dilatih.
        </p>}
      </DetailCard>

      {coach.certificates.length > 0 && <DetailCard title="Lisensi & sertifikasi" description="Kredensial kepelatihan yang tercatat. Berkas tidak ditampilkan untuk publik.">
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {coach.certificates.map((item, index) => <li key={`${item.name}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0">
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

      {coach.experience && <DetailCard title="Pengalaman" description="Keterangan yang diisi oleh pelatih.">
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">{coach.experience}</p>
      </DetailCard>}

      {coach.certificates.length === 0 && !coach.experience && <DetailCard title="Lisensi & pengalaman">
        <DetailEmpty message="Belum ada lisensi atau keterangan pengalaman yang dicatat." />
      </DetailCard>}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700/60 dark:bg-gray-800 sm:p-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Kontak pelatih tidak ditampilkan</h2>
        <p className="mt-1 text-sm text-gray-500">
          Nomor telepon, email, dan media sosial pelatih bersifat pribadi dan tidak dipublikasikan. Untuk menghubungi pelatih, silakan lewat pengurus PELTI Bali.
        </p>
      </section>
    </>}
  </PublicDetailShell>
}
