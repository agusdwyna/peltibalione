import AuthenticatedImage from '../../components/ui/AuthenticatedImage'
import {
  accessLabel,
  amenityDisplayName,
  courtTypeLabel,
  formatMeters,
  formatOperatingHours,
  formatRupiah,
  netConditionLabel,
  operationalStatusLabel,
  surfaceConditionLabel,
  surfaceLabel,
} from '../../types/facility'

type FacilityLike = {
  name: string
  address: string
  mapsUrl?: string | null
  latitude?: number | null
  longitude?: number | null
  description?: string | null
  courtCount: number
  courtType: string
  surface: string
  courtLength?: number | null
  courtWidth?: number | null
  clearanceBack?: number | null
  clearanceLeft?: number | null
  clearanceRight?: number | null
  surfaceCondition: string
  hasLighting: boolean
  lightCount?: number | null
  netCondition: string
  amenities: Array<{ id: string; code: string; customName?: string | null; description?: string | null; photos?: Array<{ id: string; originalName: string }> }>
  managerName?: string | null
  picName?: string | null
  picPhone?: string | null
  operationalStatus: string
  openTime?: string | null
  closeTime?: string | null
  accessType: string
  hourlyRate?: number | null
  coverPhotoId?: string | null
  photos?: Array<{ id: string; originalName: string }>
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="border-t border-gray-100 pt-5 dark:border-gray-700/60">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
    <div className="mt-3">{children}</div>
  </div>
}

function Grid({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {rows.map(([label, value]) => <div key={label}>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800 dark:text-gray-100">{value || '—'}</dd>
    </div>)}
  </dl>
}

/** Tampilan read-only bagian §1–§6 — dipakai halaman review dan detail master. */
export default function FacilitySpecs({ facility, onPhotoClick }: { facility: FacilityLike; onPhotoClick?: (photoId: string, label: string) => void }) {
  const photos = facility.photos ?? []
  // Cover selalu tampil pertama agar pilihan pengisi terlihat langsung.
  const ordered = facility.coverPhotoId
    ? [...photos].sort((a, b) => Number(b.id === facility.coverPhotoId) - Number(a.id === facility.coverPhotoId))
    : photos

  return <div className="space-y-6">
    <Block title="Identitas & Lokasi">
      <Grid rows={[
        ['Alamat lengkap', facility.address],
        ['Deskripsi', facility.description],
        ['Lokasi Google Maps', facility.mapsUrl
          ? <a className="text-violet-600 underline hover:text-violet-700" href={facility.mapsUrl} target="_blank" rel="noopener noreferrer">Buka di Maps</a>
          : null],
        ['Koordinat', facility.latitude != null && facility.longitude != null ? `${facility.latitude}, ${facility.longitude}` : null],
      ]} />
    </Block>

    <Block title="Data Teknis">
      <Grid rows={[
        ['Jumlah court', String(facility.courtCount)],
        ['Jenis lapangan', courtTypeLabel(facility.courtType)],
        ['Jenis permukaan', surfaceLabel(facility.surface)],
        ['Kondisi permukaan', surfaceConditionLabel(facility.surfaceCondition)],
        ['Kondisi net', netConditionLabel(facility.netCondition)],
        ['Penerangan', facility.hasLighting ? `Ada${facility.lightCount ? ` · ${facility.lightCount} lampu` : ''}` : 'Tidak ada'],
        ['Panjang court', formatMeters(facility.courtLength)],
        ['Lebar court', formatMeters(facility.courtWidth)],
        ['Ruang bebas belakang', formatMeters(facility.clearanceBack)],
        ['Ruang bebas kiri', formatMeters(facility.clearanceLeft)],
        ['Ruang bebas kanan', formatMeters(facility.clearanceRight)],
      ]} />
    </Block>

    <Block title={`Foto Lapangan (${photos.length})`}>
      {ordered.length === 0 ? <p className="text-sm text-gray-500">Belum ada foto.</p> : <ul className="flex flex-wrap gap-4">
        {ordered.map((photo) => {
          const isCover = photo.id === facility.coverPhotoId
          return <li key={photo.id} className="w-32">
            <button type="button" className="block w-full cursor-zoom-in" onClick={() => onPhotoClick?.(photo.id, photo.originalName)} aria-label={`Perbesar ${photo.originalName}`}>
              <AuthenticatedImage fileId={photo.id} alt={photo.originalName} className={`h-24 w-32 rounded-lg border-2 object-cover ${isCover ? 'border-violet-500' : 'border-gray-200 dark:border-gray-700'}`} />
            </button>
            <p className="mt-1 truncate text-xs text-gray-400">{isCover ? 'Foto Utama' : photo.originalName}</p>
          </li>
        })}
      </ul>}
    </Block>

    <Block title={`Sarana & Prasarana (${facility.amenities.length})`}>
      {facility.amenities.length === 0 ? <p className="text-sm text-gray-500">Tidak ada sarana yang dicatat.</p> : <ul className="space-y-4">
        {facility.amenities.map((amenity) => <li key={amenity.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700/60">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{amenityDisplayName(amenity)}</p>
              {amenity.code === 'LAINNYA' && <span className="mt-1 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-500">Sarana tambahan</span>}
            </div>
            <span className="text-xs text-gray-400">{amenity.photos?.length ?? 0} foto</span>
          </div>
          {amenity.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{amenity.description}</p>}
          {(amenity.photos?.length ?? 0) > 0 && <ul className="mt-3 flex flex-wrap gap-2">
            {amenity.photos?.map((photo) => <li key={photo.id}>
              <button type="button" className="block cursor-zoom-in" onClick={() => onPhotoClick?.(photo.id, `${amenityDisplayName(amenity)} — ${photo.originalName}`)} aria-label={`Perbesar ${photo.originalName}`}>
                <AuthenticatedImage fileId={photo.id} alt={photo.originalName} className="h-20 w-28 rounded border border-gray-200 object-cover transition hover:opacity-90 dark:border-gray-700" />
              </button>
            </li>)}
          </ul>}
        </li>)}
      </ul>}
    </Block>

    <Block title="Pengelola">
      <Grid rows={[
        ['Pengelola / instansi', facility.managerName],
        ['Nama PIC', facility.picName],
        ['No. HP / WhatsApp', facility.picPhone],
      ]} />
    </Block>

    <Block title="Operasional">
      <Grid rows={[
        ['Status lapangan', operationalStatusLabel(facility.operationalStatus)],
        ['Jam operasional', formatOperatingHours(facility.openTime, facility.closeTime)],
        ['Akses lapangan', accessLabel(facility.accessType)],
        ['Harga sewa / jam', formatRupiah(facility.hourlyRate)],
      ]} />
    </Block>
  </div>
}
