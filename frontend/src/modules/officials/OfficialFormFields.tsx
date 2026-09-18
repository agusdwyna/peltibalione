import { useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../lib/api'
import CertificateEditor, { type CertificateDraft } from '../../components/certificates/CertificateEditor'
import TournamentEditor, { type TournamentDraft } from './TournamentEditor'
import {
  GENDER_OPTIONS,
  OFFICIAL_LEVEL_OPTIONS,
  OFFICIAL_ROLE_OPTIONS,
  OFFICIAL_STATUS_OPTIONS,
} from '../../types/official'

export type OfficialPhoto = { id: string; previewUrl: string; name: string }

type Props = {
  photo: OfficialPhoto | null
  setPhoto: Dispatch<SetStateAction<OfficialPhoto | null>>
  certificateDrafts: CertificateDraft[]
  setCertificateDrafts: Dispatch<SetStateAction<CertificateDraft[]>>
  tournamentDrafts: TournamentDraft[]
  setTournamentDrafts: Dispatch<SetStateAction<TournamentDraft[]>>
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
 * Enam bagian pertama form pendataan wasit (PRD Master Data Wasit §4–§9).
 * §10 Verifikasi Admin sengaja tidak ada di sini karena hanya boleh diisi admin.
 */
export default function OfficialFormFields({
  photo,
  setPhoto,
  certificateDrafts,
  setCertificateDrafts,
  tournamentDrafts,
  setTournamentDrafts,
  onUploadError,
  token,
}: Props) {
  const [uploading, setUploading] = useState(false)

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    try {
      const result = token
        ? await api.players.uploadCertificateFile(token, file, 'official')
        : await api.files.uploadPublic(file, 'officialPhoto')
      // Pratinjau lama dilepas agar blob URL tidak menumpuk saat foto diganti.
      setPhoto((current) => {
        if (current) URL.revokeObjectURL(current.previewUrl)
        return { id: result.id, previewUrl: URL.createObjectURL(file), name: file.name }
      })
    } catch {
      onUploadError(`Foto "${file.name}" gagal diunggah. Pastikan JPEG/PNG maksimal 4MB.`)
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = () => {
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl)
      return null
    })
  }

  return (
    <>
      <p className="text-xs text-gray-500">
        Kolom bertanda <span className="text-red-500">*</span> wajib diisi.
      </p>

      <section className={sectionClass}>
        <h2 className="mb-5 font-semibold text-gray-800 dark:text-gray-100">1. Informasi Pribadi</h2>

        <div className="mb-5">
          {/* §4 — foto profil wasit wajib, berbeda dengan master pelatih. */}
          <span className={labelClass}>Foto Profil {required}</span>
          <div className="flex flex-wrap items-center gap-4">
            {photo ? (
              <div className="relative">
                <img className="h-24 w-24 rounded-lg border border-gray-200 object-cover dark:border-gray-700" src={photo.previewUrl} alt={photo.name} />
                <button
                  type="button"
                  className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/85 text-sm text-white hover:bg-gray-900"
                  aria-label={`Hapus foto ${photo.name}`}
                  onClick={removePhoto}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-600">
                Belum ada
              </div>
            )}
            <div>
              <input
                className="block text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100"
                type="file"
                accept="image/jpeg,image/png"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadPhoto(file)
                  event.target.value = ''
                }}
              />
              <p className="mt-2 text-xs text-gray-500">JPG/PNG maksimal 4MB.</p>
              {uploading && <p className="mt-1 text-xs text-violet-600">Mengunggah…</p>}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>Nama Lengkap {required}</span>
            <input className="form-input w-full" name="fullName" required maxLength={200} />
          </label>
          <label>
            {/* NIK dipakai sebagai identitas internal dan tidak ditampilkan publik (§17). */}
            <span className={labelClass}>NIK {required}</span>
            <input
              className="form-input w-full"
              name="nik"
              required
              inputMode="numeric"
              pattern="\d{16}"
              maxLength={16}
              title="NIK harus 16 digit angka"
            />
            <span className="mt-1 block text-xs text-gray-500">16 digit sesuai KTP.</span>
          </label>
          <label>
            {/* Sengaja tanpa pilihan bawaan — pengisi yang menentukan sendiri. */}
            <span className={labelClass}>Jenis Kelamin {required}</span>
            <select className="form-select w-full" name="gender" required defaultValue="">
              <option value="" disabled>
                Pilih jenis kelamin
              </option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {/* Umur dihitung otomatis dari tanggal ini (§4). */}
            <span className={labelClass}>Tanggal Lahir {required}</span>
            <input className="form-input w-full" name="birthDate" type="date" required max={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Alamat Lengkap {required}</span>
            <textarea className="form-textarea w-full" name="address" rows={2} required maxLength={1000} />
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">2. Informasi Kewasitan</h2>
          {/* §5 — jumlah turnamen tidak ada di sini karena dihitung sistem. */}
          <p className="mt-1 text-xs text-gray-500">
            Jumlah turnamen dihitung otomatis dari Riwayat Turnamen di bagian 4.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Status Wasit {required}</span>
            <select className="form-select w-full" name="officialStatus" required defaultValue="AKTIF">
              {OFFICIAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {/* Lama pengalaman dihitung sistem dari tahun ini (§5). */}
            <span className={labelClass}>Menjadi Wasit Sejak {required}</span>
            <input
              className="form-input w-full"
              name="officiatingSince"
              type="number"
              required
              min={1950}
              max={new Date().getFullYear()}
            />
          </label>

          <div className="sm:col-span-2">
            <span className={labelClass}>Peran Wasit {required}</span>
            <p className="mb-2 text-xs text-gray-500">Boleh lebih dari satu peran.</p>
            <div className="flex flex-wrap gap-3">
              {OFFICIAL_ROLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 dark:border-gray-700/60 dark:text-gray-100"
                >
                  <input className="form-checkbox" type="checkbox" name="roles" value={option.value} />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <label>
            <span className={labelClass}>Tingkat Wasit</span>
            <select className="form-select w-full" name="level" defaultValue="">
              <option value="">Belum ditentukan</option>
              {OFFICIAL_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-5 font-semibold text-gray-800 dark:text-gray-100">3. Lisensi &amp; Sertifikasi</h2>
        <CertificateEditor
          drafts={certificateDrafts}
          setDrafts={setCertificateDrafts}
          onError={onUploadError}
          owner="official"
          token={token}
          hint="Satu wasit boleh memiliki lebih dari satu lisensi atau sertifikat."
        />
      </section>

      <section className={sectionClass}>
        <h2 className="mb-5 font-semibold text-gray-800 dark:text-gray-100">4. Riwayat Turnamen</h2>
        <TournamentEditor drafts={tournamentDrafts} setDrafts={setTournamentDrafts} />
      </section>

      <section className={sectionClass}>
        <h2 className="mb-5 font-semibold text-gray-800 dark:text-gray-100">5. Kontak Wasit</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Nomor HP / WhatsApp {required}</span>
            <input className="form-input w-full" name="whatsapp" type="tel" required maxLength={50} />
          </label>
          <label>
            <span className={labelClass}>Email</span>
            <input className="form-input w-full" name="email" type="email" maxLength={200} />
          </label>
          <label>
            <span className={labelClass}>Instagram / Social Media</span>
            <input className="form-input w-full" name="instagram" maxLength={100} />
          </label>
          <label>
            {/* Tanpa pilihan bawaan; bila dibiarkan kosong dianggap belum bersedia. */}
            <span className={labelClass}>Bersedia Menerima Penugasan</span>
            <select className="form-select w-full" name="acceptingAssignments" defaultValue="">
              <option value="">Belum ditentukan</option>
              <option value="YA">Ya</option>
              <option value="TIDAK">Tidak</option>
            </select>
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-5 font-semibold text-gray-800 dark:text-gray-100">6. Informasi Tambahan</h2>
        <label className="block">
          <span className={labelClass}>Pengalaman / Catatan Kewasitan</span>
          <textarea className="form-textarea w-full" name="experience" rows={4} maxLength={4000} />
        </label>
      </section>
    </>
  )
}
