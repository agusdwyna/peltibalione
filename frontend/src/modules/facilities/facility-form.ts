import type { CourtType, FacilityAccess, FacilityAmenityInput, FacilityFormInput, FacilityOperationalStatus, NetCondition, Surface, SurfaceCondition } from '../../types/facility'

function text(fd: FormData, key: string) {
  const value = String(fd.get(key) ?? '').trim()
  return value || undefined
}

function number(fd: FormData, key: string) {
  const value = String(fd.get(key) ?? '').trim()
  if (!value) return undefined
  // Pengisi Indonesia lazim mengetik "23,77" — terima koma sebagai desimal.
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Rakit payload lapangan dari FormData + state foto & sarana yang dikelola komponen. */
export function readFacilityForm(
  fd: FormData,
  photoIds: string[],
  coverPhotoId: string | null,
  amenities: FacilityAmenityInput[],
): FacilityFormInput {
  const hasLighting = String(fd.get('hasLighting') ?? '') === 'ADA'

  return {
    name: String(fd.get('name') ?? '').trim(),
    address: String(fd.get('address') ?? '').trim(),
    mapsUrl: text(fd, 'mapsUrl'),
    description: text(fd, 'description'),
    courtCount: Number(fd.get('courtCount') ?? 1),
    courtType: String(fd.get('courtType') ?? 'OUTDOOR') as CourtType,
    surface: String(fd.get('surface') ?? 'HARD_COURT') as Surface,
    courtLength: number(fd, 'courtLength'),
    courtWidth: number(fd, 'courtWidth'),
    clearanceBack: number(fd, 'clearanceBack'),
    clearanceLeft: number(fd, 'clearanceLeft'),
    clearanceRight: number(fd, 'clearanceRight'),
    surfaceCondition: String(fd.get('surfaceCondition') ?? 'BAIK') as SurfaceCondition,
    hasLighting,
    // Jumlah lampu tidak dikirim saat lapangan tidak berpenerangan.
    lightCount: hasLighting ? number(fd, 'lightCount') : undefined,
    netCondition: String(fd.get('netCondition') ?? 'BAIK') as NetCondition,
    amenities,
    managerName: text(fd, 'managerName'),
    picName: text(fd, 'picName'),
    picPhone: text(fd, 'picPhone'),
    operationalStatus: String(fd.get('operationalStatus') ?? 'AKTIF') as FacilityOperationalStatus,
    openTime: text(fd, 'openTime'),
    closeTime: text(fd, 'closeTime'),
    accessType: String(fd.get('accessType') ?? 'UMUM') as FacilityAccess,
    hourlyRate: number(fd, 'hourlyRate'),
    photoIds,
    coverPhotoId: coverPhotoId ?? undefined,
  }
}

export const RECOMMENDED_PHOTO_COUNT = 6
