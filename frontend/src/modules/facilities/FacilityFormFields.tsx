import { useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../lib/api'
import {
  ACCESS_OPTIONS,
  COURT_TYPE_OPTIONS,
  NET_CONDITION_OPTIONS,
  OPERATIONAL_STATUS_OPTIONS,
  SURFACE_CONDITION_OPTIONS,
  SURFACE_OPTIONS,
} from '../../types/facility'
import AmenityEditor, { type AmenityDraft } from './AmenityEditor'
import { RECOMMENDED_PHOTO_COUNT } from './facility-form'

export type FacilityPhoto = { id: string; previewUrl: string; name: string }

type Props = {
  photos: FacilityPhoto[]
  setPhotos: Dispatch<SetStateAction<FacilityPhoto[]>>
  coverPhotoId: string | null
  setCoverPhotoId: Dispatch<SetStateAction<string | null>>
  amenityDrafts: AmenityDraft[]
  setAmenityDrafts: Dispatch<SetStateAction<AmenityDraft[]>>
  onUploadError: (message: string) => void
  /** Token admin; bila kosong, unggahan memakai endpoint publik. */
  token?: string | null
}

const sectionClass = 'rounded-lg border border-gray-200 bg-gray-50/60 p-5 dark:border-gray-700/60 dark:bg-gray-900/20'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'
// Tanda * saja sudah cukup menandai kolom wajib; label "(opsional)" di belasan
// kolom lain hanya menambah teks tanpa menambah informasi.
const required = <span className="text-red-500">*</span>

/**
 * Tujuh bagian form pendataan lapangan (dokumen Master Data Sarana &
 * Prasarana §1–§6; §7 verifikasi & grade sengaja tidak ada di sini karena
 * hanya boleh diisi admin).
 */
export default function FacilityFormFields({ photos, setPhotos, coverPhotoId, setCoverPhotoId, amenityDrafts, setAmenityDrafts, onUploadError, token }: Props) {
  const [uploading, setUploading] = useState(0)
  const [hasLighting, setHasLighting] = useState(false)

  const uploadPhotos = async (files: FileList) => {
    const list = Array.from(files)
    setUploading((count) => count + list.length)
    for (const file of list) {
      try {
        const result = token
          ? await api.players.uploadCertificateFile(token, file, 'facility')
          : await api.files.uploadPublic(file, 'facilityPhoto')
        const previewUrl = URL.createObjectURL(file)
        setPhotos((current) => [...current, { id: result.id, previewUrl, name: file.name }])
        // Foto pertama otomatis jadi cover sampai pengisi memilih yang lain.
        // Pakai updater agar unggahan beruntun tidak membaca state basi.
        setCoverPhotoId((current) => current ?? result.id)
      } catch {
        onUploadError(`Foto "${file.name}" gagal diunggah. Pastikan JPEG/PNG maksimal 4MB.`)
      } finally {
        setUploading((count) => count - 1)
      }
    }
  }

  const removePhoto = (photo: FacilityPhoto) => {
    URL.revokeObjectURL(photo.previewUrl)
    setPhotos((current) => current.filter((item) => item.id !== photo.id))
    if (coverPhotoId === photo.id) setCoverPhotoId(null)
  }

  return (
    <>
      <p className="text-xs text-gray-500">Kolom bertanda <span className="text-red-500">*</span> wajib diisi.</p>

      <section className={sectionClass}>
        <h2 className="mb-5 font-semibold text-gray-800 dark:text-gray-100">1. Identitas &amp; Lokasi Lapangan</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={labelClass}>Nama Lapangan {required}</span><input className="form-input w-full" name="name" required maxLength={200} /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Alamat Lengkap {required}</span><textarea className="form-textarea w-full" name="address" rows={2} required maxLength={1000} /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Link Google Maps</span><input className="form-input w-full" name="mapsUrl" type="url" maxLength={2000} /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Deskripsi Lapangan</span><textarea className="form-textarea w-full" name="description" rows={3} maxLength={2000} /></label>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">2. Data Teknis Lapangan</h2>
          <p className="mt-1 text-xs text-gray-500">Ukuran dalam meter, boleh pakai koma.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label><span className={labelClass}>Jumlah Court {required}</span><input className="form-input w-full" name="courtCount" type="number" min={1} max={100} defaultValue={1} required /></label>
          <label><span className={labelClass}>Jenis Lapangan {required}</span><select className="form-select w-full" name="courtType" required defaultValue="OUTDOOR">{COURT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className={labelClass}>Jenis Permukaan {required}</span><select className="form-select w-full" name="surface" required defaultValue="HARD_COURT">{SURFACE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className={labelClass}>Kondisi Permukaan {required}</span><select className="form-select w-full" name="surfaceCondition" required defaultValue="BAIK">{SURFACE_CONDITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className={labelClass}>Panjang Court</span><input className="form-input w-full" name="courtLength" inputMode="decimal" /></label>
          <label><span className={labelClass}>Lebar Court</span><input className="form-input w-full" name="courtWidth" inputMode="decimal" /></label>
          <label><span className={labelClass}>Ruang Bebas Belakang</span><input className="form-input w-full" name="clearanceBack" inputMode="decimal" /></label>
          <label><span className={labelClass}>Ruang Bebas Samping Kiri</span><input className="form-input w-full" name="clearanceLeft" inputMode="decimal" /></label>
          <label><span className={labelClass}>Ruang Bebas Samping Kanan</span><input className="form-input w-full" name="clearanceRight" inputMode="decimal" /></label>
          <label><span className={labelClass}>Kondisi Net {required}</span><select className="form-select w-full" name="netCondition" required defaultValue="BAIK">{NET_CONDITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className={labelClass}>Penerangan / Lampu {required}</span><select className="form-select w-full" name="hasLighting" required defaultValue="TIDAK_ADA" onChange={(event) => setHasLighting(event.target.value === 'ADA')}><option value="TIDAK_ADA">Tidak Ada</option><option value="ADA">Ada</option></select></label>
          {hasLighting && <label><span className={labelClass}>Jumlah Lampu {required}</span><input className="form-input w-full" name="lightCount" type="number" min={1} max={1000} required /></label>}
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">3. Foto Lapangan {required}</h2>
          <p className="mt-1 text-xs text-gray-500">JPG/PNG maksimal 4MB. Klik foto untuk menjadikannya Foto Utama.</p>
        </div>
        <input
          className="block w-full text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          onChange={(event) => { const files = event.target.files; if (files?.length) void uploadPhotos(files); event.target.value = '' }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <span className={photos.length >= RECOMMENDED_PHOTO_COUNT ? 'font-medium text-green-600' : 'text-gray-500'}>{photos.length}/{RECOMMENDED_PHOTO_COUNT} foto</span>
          {uploading > 0 && <span className="text-violet-600">Mengunggah {uploading} foto…</span>}
        </div>
        {photos.length > 0 && <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => {
            const isCover = coverPhotoId === photo.id
            return <li key={photo.id} className={`relative overflow-hidden rounded-lg border-2 ${isCover ? 'border-violet-500' : 'border-gray-200 dark:border-gray-700'}`}>
              <button type="button" className="block w-full cursor-pointer" onClick={() => setCoverPhotoId(photo.id)} aria-label={`Jadikan ${photo.name} foto utama`} aria-pressed={isCover}>
                <img className="h-28 w-full object-cover" src={photo.previewUrl} alt={photo.name} />
              </button>
              {isCover && <span className="absolute bottom-0 left-0 right-0 bg-violet-500 py-0.5 text-center text-[11px] font-medium text-white">Foto Utama</span>}
              <button type="button" className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/80 text-sm text-white hover:bg-gray-900" onClick={() => removePhoto(photo)} aria-label={`Hapus ${photo.name}`}>×</button>
            </li>
          })}
        </ul>}
      </section>

      <section className={sectionClass}>
        <h2 className="mb-5 font-semibold text-gray-800 dark:text-gray-100">4. Sarana &amp; Prasarana</h2>
        <AmenityEditor drafts={amenityDrafts} setDrafts={setAmenityDrafts} onError={onUploadError} token={token} />
      </section>

      <section className={sectionClass}>
        <h2 className="mb-5 font-semibold text-gray-800 dark:text-gray-100">5. Pengelola Lapangan</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={labelClass}>Nama Pengelola / Instansi</span><input className="form-input w-full" name="managerName" maxLength={200} /></label>
          <label><span className={labelClass}>Nama PIC</span><input className="form-input w-full" name="picName" maxLength={200} /></label>
          <label><span className={labelClass}>No. HP / WhatsApp</span><input className="form-input w-full" name="picPhone" type="tel" maxLength={50} /></label>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-5 font-semibold text-gray-800 dark:text-gray-100">6. Operasional Lapangan</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label><span className={labelClass}>Status Lapangan {required}</span><select className="form-select w-full" name="operationalStatus" required defaultValue="AKTIF">{OPERATIONAL_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className={labelClass}>Akses Lapangan {required}</span><select className="form-select w-full" name="accessType" required defaultValue="UMUM">{ACCESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className={labelClass}>Jam Buka</span><input className="form-input w-full" name="openTime" type="time" /></label>
          <label><span className={labelClass}>Jam Tutup</span><input className="form-input w-full" name="closeTime" type="time" /></label>
          {/* Satuan pindah ke label agar tidak perlu baris keterangan tersendiri. */}
          <label className="sm:col-span-2"><span className={labelClass}>Harga Sewa per Jam (Rp)</span><input className="form-input w-full sm:max-w-xs" name="hourlyRate" type="number" min={0} step={1000} /></label>
        </div>
      </section>
    </>
  )
}
