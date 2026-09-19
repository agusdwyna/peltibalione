import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PublicDetailShell, { DetailCard, DetailEmpty, DetailRows } from '../components/portal/PublicDetailShell'
import { api, ApiError } from '../lib/api'
import { formatAgeGroup } from '../lib/age-group'
import { districtLabel } from '../lib/district'
import { ACHIEVEMENT_CATEGORY_LABELS, ACHIEVEMENT_RESULT_LABELS, type PublicPlayerDetail } from '../types/portal'

/**
 * Detail pemain untuk publik.
 *
 * Yang sengaja TIDAK ditampilkan: NIK, tanggal lahir, alamat, kontak, dan foto
 * diri. Pemain KU 8–18 adalah anak-anak — server memang tidak pernah mengirim
 * field itu, dan halaman ini tidak boleh mulai menampilkannya.
 *
 * Prestasi ditampilkan dengan TAHUN saja, bukan tanggal. Tanggal pertandingan
 * yang lengkap mempublikasikan pola pergerakan seorang anak; tahunnya sudah
 * cukup memberi konteks.
 */
export default function PublicPlayerDetailPage() {
  const { code } = useParams<{ code: string }>()
  const [player, setPlayer] = useState<PublicPlayerDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) { setError('Kode pemain tidak valid.'); setLoading(false); return }
    api.public.player(code)
      .then(setPlayer)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Data pemain tidak dapat dimuat.'))
      .finally(() => setLoading(false))
  }, [code])

  const backTo = '/'
  const latestRank = player?.pnpRankings?.[0]

  return <PublicDetailShell
    eyebrow="Pemain Terverifikasi"
    title={player?.fullName ?? 'Detail Pemain'}
    code={player?.playerCode}
    districtName={player ? districtLabel(player.district.name) : null}
    backTo={backTo}
    loading={loading}
    error={error}
  >
    {player && <>
      <DetailCard title="Profil" description="Data resmi yang tercatat di PELTI Bali.">
        <DetailRows rows={[
          ['Kelompok umur', formatAgeGroup(player.ageGroup, (player.gender ?? null) as 'PUTRA' | 'PUTRI' | null)],
          ['Umur', player.age !== null && player.age !== undefined ? `${player.age} tahun` : null],
          ['Jenis kelamin', player.gender === 'PUTRA' ? 'Laki-laki' : player.gender === 'PUTRI' ? 'Perempuan' : null],
          ['Klub', player.clubName],
          ['Kabupaten/Kota', districtLabel(player.district.name)],
          ['Peringkat PNP', latestRank ? `#${latestRank.rank} · ${latestRank.period}` : null],
        ]} />
      </DetailCard>

      <DetailCard
        title="Riwayat prestasi"
        description={player.achievements.length > 0 ? `${player.achievements.length} catatan prestasi dan kegiatan.` : undefined}
      >
        {player.achievements.length === 0
          ? <DetailEmpty message="Belum ada riwayat prestasi yang tercatat." />
          : <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {player.achievements.map((item, index) => <li key={`${item.title}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.title}</p>
                {item.eventName && <p className="mt-0.5 text-sm text-gray-500">{item.eventName}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                {item.category && <span>{ACHIEVEMENT_CATEGORY_LABELS[item.category] ?? item.category}</span>}
                {item.result && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 font-medium text-violet-700 dark:text-violet-400">{ACHIEVEMENT_RESULT_LABELS[item.result] ?? item.result}</span>}
                {/* Tahun saja — tanggal persis sengaja tidak ditampilkan. */}
                {item.year && <span className="tabular-nums">{item.year}</span>}
              </div>
            </li>)}
          </ul>}
      </DetailCard>

      {player.certificates.length > 0 && <DetailCard title="Sertifikat" description="Kredensial yang tercatat. Berkas tidak ditampilkan untuk publik.">
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {player.certificates.map((item, index) => <li key={`${item.title}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.title}</p>
              {item.issuer && <p className="mt-0.5 text-sm text-gray-500">{item.issuer}</p>}
            </div>
            {item.year && <span className="shrink-0 text-xs tabular-nums text-gray-500">{item.year}</span>}
          </li>)}
        </ul>
      </DetailCard>}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700/60 dark:bg-gray-800 sm:p-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Data pribadi dilindungi</h2>
        <p className="mt-1 text-sm text-gray-500">
          NIK, tanggal lahir, alamat, dan kontak pemain tidak ditampilkan di portal publik. Untuk keperluan resmi, hubungi pengurus PELTI Bali.
        </p>
        <Link className="mt-4 inline-block text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400" to="/check-status">Cek status pendaftaran →</Link>
      </section>
    </>}
  </PublicDetailShell>
}
