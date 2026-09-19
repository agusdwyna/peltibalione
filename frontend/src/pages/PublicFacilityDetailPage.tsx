import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PublicDetailShell, { DetailCard, DetailEmpty, DetailRows } from '../components/portal/PublicDetailShell'
import { api, ApiError } from '../lib/api'
import { districtLabel } from '../lib/district'
import type { PublicFacilityDetail } from '../types/portal'
import { accessLabel, amenityLabel, courtTypeLabel, netConditionLabel, operationalStatusLabel, surfaceConditionLabel, surfaceLabel } from '../types/facility'

/** Rupiah tanpa desimal — tarif lapangan selalu bilangan bulat. */
function rupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

/** Ukuran lapangan ditulis apa adanya; nilai kosong ditampilkan sebagai null agar barisnya hilang. */
function meters(value: number | null | undefined) {
  return value === null || value === undefined ? null : `${value} m`
}

/**
 * Detail lapangan untuk publik.
 *
 * Ini satu-satunya entitas yang KONTAKnya boleh tampil: nomor PIC adalah
 * kontak tempat usaha — orang menghubungi untuk menyewa lapangan. Foto juga
 * tampil, karena lapangan difoto sebagai tempat, bukan orang.
 */
export default function PublicFacilityDetailPage() {
  const { code } = useParams<{ code: string }>()
  const [facility, setFacility] = useState<PublicFacilityDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) { setError('Kode lapangan tidak valid.'); setLoading(false); return }
    api.public.facility(code)
      .then(setFacility)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Data lapangan tidak dapat dimuat.'))
      .finally(() => setLoading(false))
  }, [code])

  // Galeri: cover lebih dulu bila ada, sisanya mengikuti urutan aslinya.
  const gallery = facility
    ? [facility.coverPhotoId, ...facility.photoIds].filter((id, index, all): id is string => Boolean(id) && all.indexOf(id) === index)
    : []

  const hasContact = Boolean(facility?.picName || facility?.picPhone || facility?.managerName)

  return <PublicDetailShell
    eyebrow="Sarana & Prasarana Terverifikasi"
    title={facility?.name ?? 'Detail Lapangan'}
    code={facility?.facilityCode}
    districtName={facility ? districtLabel(facility.district.name) : null}
    loading={loading}
    error={error}
  >
    {facility && <>
      {gallery.length > 0 && <DetailCard title="Foto lapangan">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallery.map((id) => <img key={id} className="h-40 w-full rounded-lg object-cover" src={api.files.publicUrl(id)} alt={`Foto ${facility.name}`} loading="lazy" />)}
        </div>
      </DetailCard>}

      <DetailCard title="Identitas & lokasi">
        <DetailRows rows={[
          ['Alamat', facility.address],
          ['Kabupaten/Kota', districtLabel(facility.district.name)],
          ['Grade', facility.grade ? `Grade ${facility.grade}` : null],
          ['Status operasional', operationalStatusLabel(facility.operationalStatus)],
        ]} />
        {facility.description && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">{facility.description}</p>}
        {facility.mapsUrl && <a className="mt-4 inline-block text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400" href={facility.mapsUrl} target="_blank" rel="noopener noreferrer">Buka di Google Maps →</a>}
      </DetailCard>

      <DetailCard title="Data teknis">
        <DetailRows rows={[
          ['Jumlah court', `${facility.courtCount} court`],
          ['Jenis', courtTypeLabel(facility.courtType)],
          ['Permukaan', surfaceLabel(facility.surface)],
          ['Kondisi permukaan', surfaceConditionLabel(facility.surfaceCondition)],
          ['Kondisi net', netConditionLabel(facility.netCondition)],
          ['Ukuran', facility.courtLength && facility.courtWidth ? `${facility.courtLength} × ${facility.courtWidth} m` : null],
          ['Ruang belakang', meters(facility.clearanceBack)],
          ['Ruang samping', facility.clearanceLeft || facility.clearanceRight ? `${facility.clearanceLeft ?? '—'} m / ${facility.clearanceRight ?? '—'} m` : null],
          ['Pencahayaan', facility.hasLighting ? `Ada${facility.lightCount ? ` (${facility.lightCount} lampu)` : ''}` : 'Tidak ada'],
        ]} />
      </DetailCard>

      <DetailCard title="Operasional">
        <DetailRows rows={[
          ['Jam buka', facility.openTime && facility.closeTime ? `${facility.openTime}–${facility.closeTime}` : null],
          ['Akses', accessLabel(facility.accessType)],
          ['Tarif per jam', facility.hourlyRate !== null && facility.hourlyRate !== undefined ? rupiah(facility.hourlyRate) : null],
        ]} />
      </DetailCard>

      <DetailCard
        title="Sarana & prasarana"
        description={facility.amenities.length > 0 ? `${facility.amenities.length} sarana tercatat.` : undefined}
      >
        {facility.amenities.length === 0
          ? <DetailEmpty message="Belum ada data sarana untuk lapangan ini." />
          : <ul className="grid gap-4 sm:grid-cols-2">
            {facility.amenities.map((amenity, index) => <li key={`${amenity.code}-${index}`} className="rounded-lg border border-gray-100 p-4 dark:border-gray-700/60">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {amenity.code === 'LAINNYA' && amenity.customName ? amenity.customName : amenityLabel(amenity.code)}
              </p>
              {amenity.description && <p className="mt-1 text-sm text-gray-500">{amenity.description}</p>}
              {amenity.photoIds.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                {amenity.photoIds.map((id) => <img key={id} className="h-16 w-16 rounded-md object-cover" src={api.files.publicUrl(id)} alt="" loading="lazy" />)}
              </div>}
            </li>)}
          </ul>}
      </DetailCard>

      {hasContact && <DetailCard title="Kontak pengelola" description="Kontak resmi pengelola lapangan.">
        <DetailRows rows={[
          ['Pengelola', facility.managerName],
          ['Narahubung', facility.picName],
          ['Telepon', facility.picPhone
            ? <a className="font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400" href={`tel:${facility.picPhone}`}>{facility.picPhone}</a>
            : null],
        ]} />
      </DetailCard>}
    </>}
  </PublicDetailShell>
}
