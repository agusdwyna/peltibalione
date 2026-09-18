import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import AuthenticatedImage from '../../components/ui/AuthenticatedImage'
import { useAuthStore } from '../../stores/auth.store'
import AmenityEditor, { draftsFromFacility, draftsToInput, findUnnamedCustom, type AmenityDraft } from './AmenityEditor'
import FormRow, { FormField, FormGrid, FormRows, FormSection, SaveRow } from '../../components/portal/FormRow'
import {
  ACCESS_OPTIONS,
  AMENITY_OPTIONS,
  COURT_TYPE_OPTIONS,
  NET_CONDITION_OPTIONS,
  OPERATIONAL_STATUS_OPTIONS,
  SURFACE_CONDITION_OPTIONS,
  SURFACE_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
  accessLabel,
  amenityDisplayName,
  courtTypeLabel,
  formatOperatingHours,
  formatRupiah,
  operationalStatusClass,
  operationalStatusLabel,
  surfaceLabel,
  verificationStatusClass,
  verificationStatusLabel,
  type FacilityDetail,
  type FacilityGrade,
  type FacilityVerificationStatus,
} from '../../types/facility'

type Tab = 'info' | 'amenities' | 'operational'


function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}

function decimalValue(value?: number | null) {
  return value == null ? '' : String(value)
}

/** Satu baris label–nilai; dipakai di panel kiri maupun daftar detail. */
function Field({ label, value, mono }: { label: string; value?: ReactNode; mono?: boolean }) {
  const empty = value === null || value === undefined || value === ''
  return <div>
    <dt className="text-xs font-medium text-gray-500">{label}</dt>
    <dd className={`mt-1 text-sm ${mono ? 'font-mono ' : ''}${empty ? 'text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>{empty ? '—' : value}</dd>
  </div>
}


export default function FacilityDetailPage() {
  const { facilityId } = useParams<{ facilityId: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const [facility, setFacility] = useState<FacilityDetail | null>(null)
  const [tab, setTab] = useState<Tab>('info')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState<{ id: string; label: string } | null>(null)
  const [hasLighting, setHasLighting] = useState(false)
  const [amenityDrafts, setAmenityDrafts] = useState<AmenityDraft[]>([])
  // Hanya tab sarana yang memakai mode lihat/sunting; tab lain selalu bisa diubah.
  const [editingAmenities, setEditingAmenities] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<FacilityVerificationStatus>('MENUNGGU')
  const [grade, setGrade] = useState<FacilityGrade | ''>('')
  const [adminNotes, setAdminNotes] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoAction, setPhotoAction] = useState<'cover' | 'delete' | null>(null)
  // Foto yang sedang tampil besar di galeri utama.
  const [activePhoto, setActivePhoto] = useState(0)

  /**
   * `resetForm: false` dipakai saat hanya foto yang berubah — menyegarkan
   * seluruh state form di tengah pengeditan akan membuang isian yang belum
   * sempat disimpan.
   */
  const load = (options: { resetForm?: boolean } = {}) => {
    if (!token || !facilityId) return
    const resetForm = options.resetForm ?? true
    if (resetForm) setLoading(true)
    api.facilities
      .get(token, facilityId)
      .then((data) => {
        setFacility(data)
        if (!resetForm) return
        setHasLighting(data.hasLighting)
        setAmenityDrafts(draftsFromFacility(data.amenities))
        setVerificationStatus(data.verificationStatus)
        setGrade(data.grade ?? '')
        setAdminNotes(data.adminNotes ?? '')
      })
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Detail lapangan tidak dapat dimuat.'))
      .finally(() => { if (resetForm) setLoading(false) })
  }
  useEffect(() => { load() }, [token, facilityId]) // eslint-disable-line react-hooks/exhaustive-deps

  const text = (fd: FormData, key: string) => { const value = String(fd.get(key) ?? '').trim(); return value || null }
  const decimal = (fd: FormData, key: string) => {
    const value = String(fd.get(key) ?? '').trim()
    if (!value) return null
    const parsed = Number(value.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }

  const submitTab = (build: (fd: FormData) => Record<string, unknown>) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !facility || saving) return
    setSaving(true); setError(''); setNotice('')
    try {
      await api.facilities.update(token, facility.id, build(new FormData(event.currentTarget)))
      setNotice('Perubahan tersimpan.')
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Perubahan tidak dapat disimpan.')
    } finally { setSaving(false) }
  }

  const saveInfo = submitTab((fd) => ({
    name: String(fd.get('name') ?? '').trim(),
    address: String(fd.get('address') ?? '').trim(),
    mapsUrl: text(fd, 'mapsUrl'),
    description: text(fd, 'description'),
    courtCount: Number(fd.get('courtCount') ?? 1),
    courtType: fd.get('courtType'),
    surface: fd.get('surface'),
    surfaceCondition: fd.get('surfaceCondition'),
    netCondition: fd.get('netCondition'),
    courtLength: decimal(fd, 'courtLength'),
    courtWidth: decimal(fd, 'courtWidth'),
    clearanceBack: decimal(fd, 'clearanceBack'),
    clearanceLeft: decimal(fd, 'clearanceLeft'),
    clearanceRight: decimal(fd, 'clearanceRight'),
    hasLighting,
    lightCount: hasLighting ? decimal(fd, 'lightCount') : null,
  }))

  /** Sarana punya endpoint sendiri karena ikut membawa foto per baris. */
  const saveAmenities = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !facility || saving) return
    if (findUnnamedCustom(amenityDrafts)) { setError('Setiap sarana tambahan harus diberi nama.'); return }
    setSaving(true); setError(''); setNotice('')
    try {
      await api.facilities.replaceAmenities(token, facility.id, draftsToInput(amenityDrafts))
      setNotice('Sarana & prasarana tersimpan.')
      setEditingAmenities(false)
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Sarana tidak dapat disimpan.')
    } finally { setSaving(false) }
  }

  const saveOperational = submitTab((fd) => ({
    managerName: text(fd, 'managerName'),
    picName: text(fd, 'picName'),
    picPhone: text(fd, 'picPhone'),
    operationalStatus: fd.get('operationalStatus'),
    openTime: text(fd, 'openTime'),
    closeTime: text(fd, 'closeTime'),
    accessType: fd.get('accessType'),
    hourlyRate: decimal(fd, 'hourlyRate'),
  }))

  const saveVerification = async () => {
    if (!token || !facility || verifying) return
    setVerifying(true); setError(''); setNotice('')
    try {
      await api.facilities.verify(token, facility.id, { verificationStatus, grade: grade || null, adminNotes: adminNotes.trim() || null })
      setNotice('Status verifikasi diperbarui.')
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Status verifikasi tidak dapat disimpan.')
    } finally { setVerifying(false) }
  }

  const addPhotos = async (files: FileList) => {
    if (!token || !facility) return
    setUploading(true); setError('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const result = await api.players.uploadCertificateFile(token, file, 'facility')
        uploaded.push(result.id)
      }
      await api.facilities.attachPhotos(token, facility.id, uploaded)
      setNotice(`${uploaded.length} foto ditambahkan.`)
      load({ resetForm: false })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Foto gagal ditambahkan.')
    } finally { setUploading(false) }
  }

  const setCover = async (photoId: string) => {
    if (!token || !facility || photoAction) return
    setPhotoAction('cover'); setError(''); setNotice('')
    try {
      await api.facilities.update(token, facility.id, { coverPhotoId: photoId })
      setNotice('Foto utama diperbarui.')
      setLightbox(null)
      load({ resetForm: false })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Foto utama tidak dapat diubah.')
    } finally { setPhotoAction(null) }
  }

  const deletePhoto = async (photoId: string, label: string) => {
    if (!token || !facility || photoAction) return
    if (!window.confirm(`Hapus foto "${label}"? Berkasnya ikut terhapus permanen.`)) return
    setPhotoAction('delete'); setError(''); setNotice('')
    try {
      const result = await api.facilities.deletePhoto(token, facility.id, photoId)
      setNotice(result.coverPhotoId && result.coverPhotoId !== facility.coverPhotoId
        ? 'Foto dihapus. Foto tersisa berikutnya menjadi foto utama.'
        : 'Foto dihapus.')
      setLightbox(null)
      load({ resetForm: false })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Foto tidak dapat dihapus.')
    } finally { setPhotoAction(null) }
  }

  const remove = async () => {
    if (!token || !facility) return
    if (!window.confirm(`Hapus master lapangan "${facility.name}"? Seluruh fotonya ikut terhapus dan tindakan ini tidak dapat dibatalkan.`)) return
    try {
      await api.facilities.remove(token, facility.id)
      navigate('/facilities', { replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Lapangan tidak dapat dihapus.')
    }
  }

  if (loading) return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8"><p className="text-sm text-gray-500">Memuat detail…</p></div>
  if (!facility) return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
    <Link className="text-sm text-gray-500 hover:text-gray-800" to="/facilities">Kembali ke fasilitas lapangan</Link>
    <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Lapangan tidak ditemukan.'}</div>
  </div>

  const photos = facility.photos ?? []
  // Foto utama selalu di depan agar pilihan cover langsung terlihat.
  const orderedPhotos = facility.coverPhotoId
    ? [...photos].sort((a, b) => Number(b.id === facility.coverPhotoId) - Number(a.id === facility.coverPhotoId))
    : photos


  /**
   * Pengelola foto lapangan. Sengaja tampil di mode lihat maupun sunting:
   * mengganti/menghapus foto adalah bagian dari "edit identitas", dan
   * memaksa pengguna naik ke galeri atas hanya untuk itu terasa memutar.
   * Semua tombol bertipe "button" agar tidak ikut men-submit form induk.
   */
  const PhotoManager = () => <div>
    {orderedPhotos.length === 0
      ? <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700">Belum ada foto.</p>
      : <ul className="flex flex-wrap gap-4">
        {orderedPhotos.map((photo) => {
          const isCover = photo.id === facility.coverPhotoId
          return <li key={photo.id} className="w-36">
            <button type="button" className="block w-full cursor-zoom-in" onClick={() => setLightbox({ id: photo.id, label: photo.originalName })} aria-label={`Perbesar ${photo.originalName}`}>
              <AuthenticatedImage fileId={photo.id} alt={photo.originalName} className={`h-28 w-36 rounded-lg border-2 object-cover transition hover:opacity-90 ${isCover ? 'border-violet-500' : 'border-gray-200 dark:border-gray-700'}`} />
            </button>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              {isCover
                ? <span className="text-xs font-medium text-violet-600">Utama</span>
                : <button type="button" className="text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50" disabled={photoAction !== null} onClick={() => setCover(photo.id)}>Jadikan utama</button>}
              <button type="button" className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50" disabled={photoAction !== null} onClick={() => deletePhoto(photo.id, photo.originalName)}>Hapus</button>
            </div>
          </li>
        })}
      </ul>}
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 dark:border-gray-700/60">
      <input
        className="block max-w-xs text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100"
        type="file"
        accept="image/jpeg,image/png"
        multiple
        disabled={uploading}
        onChange={(event) => { const files = event.target.files; if (files?.length) void addPhotos(files); event.target.value = '' }}
      />
      {uploading && <span className="text-xs text-violet-600">Mengunggah…</span>}
    </div>
  </div>

  /** Buang perubahan draft yang belum disimpan saat pindah tab. */
  const resetDrafts = () => { setHasLighting(facility.hasLighting); setAmenityDrafts(draftsFromFacility(facility.amenities)) }

  const tabs: Array<[Tab, string]> = [['info', 'Informasi Lapangan'], ['amenities', 'Sarana & Prasarana'], ['operational', 'Operasional']]

  // Indeks bisa melewati batas setelah foto dihapus — jepit ke rentang yang ada.
  const currentIndex = Math.min(activePhoto, Math.max(orderedPhotos.length - 1, 0))
  const mainPhoto = orderedPhotos[currentIndex]

  // Spesifikasi ringkas di samping galeri — yang paling sering dicari.
  const heroSpecs: Array<[string, string]> = [
    ['Jumlah court', `${facility.courtCount} court`],
    ['Jenis lapangan', courtTypeLabel(facility.courtType)],
    ['Permukaan', surfaceLabel(facility.surface)],
    ['Jam operasional', formatOperatingHours(facility.openTime, facility.closeTime)],
    ['Akses', accessLabel(facility.accessType)],
    ['Harga sewa / jam', formatRupiah(facility.hourlyRate)],
  ]

  return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6"><Link className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" to="/facilities">Kembali ke fasilitas lapangan</Link></div>
    {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
    {notice && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700" role="status">{notice}</div>}

    {/* ── Galeri besar + ringkasan ─────────────────────────────── */}
    <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,44%)_minmax(0,56%)] lg:gap-8">
        <div>
          {mainPhoto
            ? <button type="button" className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700" onClick={() => setLightbox({ id: mainPhoto.id, label: mainPhoto.originalName })} aria-label={`Perbesar ${mainPhoto.originalName}`}>
              <AuthenticatedImage fileId={mainPhoto.id} alt={mainPhoto.originalName} className="aspect-4/3 w-full bg-gray-50 object-cover dark:bg-gray-900" />
            </button>
            : <div className="flex aspect-4/3 w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-700">Belum ada foto</div>}

          {orderedPhotos.length > 1 && <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {orderedPhotos.map((photo, index) => {
              const active = index === currentIndex
              return <li key={photo.id} className="shrink-0">
                <button
                  type="button"
                  className={`block overflow-hidden rounded-md border-2 transition ${active ? 'border-violet-500' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  onClick={() => setActivePhoto(index)}
                  aria-label={`Lihat ${photo.originalName}`}
                  aria-current={active}
                >
                  <AuthenticatedImage fileId={photo.id} alt={photo.originalName} className="h-16 w-20 object-cover" />
                </button>
              </li>
            })}
          </ul>}
        </div>

        <div className="min-w-0">
          <p className="font-mono text-xs text-gray-400">{facility.facilityCode}</p>
          <h1 className="mt-1 text-2xl font-bold leading-snug text-gray-900 dark:text-gray-100 md:text-3xl">{facility.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${verificationStatusClass[facility.verificationStatus] ?? 'bg-gray-100 text-gray-600'}`}>{verificationStatusLabel(facility.verificationStatus)}</span>
            {facility.grade && <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700">Grade {facility.grade}</span>}
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${operationalStatusClass[facility.operationalStatus] ?? 'bg-gray-100 text-gray-600'}`}>{operationalStatusLabel(facility.operationalStatus)}</span>
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{facility.district.name} · {facility.address}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {facility.mapsUrl && <a className="text-sm font-medium text-violet-600 underline hover:text-violet-700" href={facility.mapsUrl} target="_blank" rel="noopener noreferrer">Buka di Google Maps</a>}
            {facility.latitude != null && facility.longitude != null && <span className="font-mono text-xs text-gray-400">{facility.latitude}, {facility.longitude}</span>}
          </div>
          {facility.description && <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{facility.description}</p>}

          <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-gray-100 pt-5 dark:border-gray-700/60 sm:grid-cols-3">
            {heroSpecs.map(([label, value]) => <Field key={label} label={label} value={value} />)}
          </dl>
        </div>
      </div>
    </section>

    {/* ── Tab isi ──────────────────────────────────────────────── */}
    <section className="min-w-0 rounded-xl border border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
      <nav className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700/60" aria-label="Detail lapangan">
        {tabs.map(([key, label]) => <button
          key={key}
          className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-semibold transition sm:px-5 ${tab === key ? 'border-violet-500 text-violet-700 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          onClick={() => { setTab(key); setEditingAmenities(false); resetDrafts() }}
        >{label}</button>)}
      </nav>

      <div className="space-y-8 p-5 sm:p-7">
          {/* Semua kolom langsung bisa diubah — tidak perlu menekan "Edit"
              lebih dulu. Perubahan baru tersimpan saat tombol Simpan ditekan. */}

          {/* ── Tab 1: Informasi Lapangan ───────────────────────── */}
          {tab === 'info' && <form onSubmit={saveInfo}>
            <FormSection title="Identitas & lokasi" description="Nama, alamat, dan titik lokasi lapangan.">
              <FormRows>
                <FormRow label="Nama lapangan">
                  <input className="form-input w-full sm:max-w-sm" name="name" defaultValue={facility.name} required maxLength={200} />
                </FormRow>
                <FormRow label="Alamat lengkap">
                  <textarea className="form-textarea w-full sm:max-w-md" name="address" rows={2} defaultValue={facility.address} required maxLength={1000} />
                </FormRow>
                <FormRow label="Link Google Maps" hint="Koordinat diambil ulang otomatis">
                  <input className="form-input w-full sm:max-w-md" name="mapsUrl" type="url" defaultValue={facility.mapsUrl ?? ''} maxLength={2000} />
                </FormRow>
                <FormRow label="Deskripsi">
                  <textarea className="form-textarea w-full sm:max-w-2xl" name="description" rows={3} defaultValue={facility.description ?? ''} maxLength={2000} />
                </FormRow>
              </FormRows>
            </FormSection>

            <FormSection title="Data teknis" description="Ukuran dalam meter, boleh pakai koma.">
              {/* Kolomnya pendek-pendek dan jumlahnya banyak — disusun grid agar
                  halaman tidak memanjang ke bawah. */}
              <FormGrid>
                <FormField label="Jumlah court">
                  <input className="form-input w-full" name="courtCount" type="number" min={1} max={100} defaultValue={facility.courtCount} required />
                </FormField>
                <FormField label="Jenis lapangan">
                  <select className="form-select w-full" name="courtType" defaultValue={facility.courtType}>
                    {COURT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Jenis permukaan">
                  <select className="form-select w-full" name="surface" defaultValue={facility.surface}>
                    {SURFACE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Kondisi permukaan">
                  <select className="form-select w-full" name="surfaceCondition" defaultValue={facility.surfaceCondition}>
                    {SURFACE_CONDITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Kondisi net">
                  <select className="form-select w-full" name="netCondition" defaultValue={facility.netCondition}>
                    {NET_CONDITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Penerangan / lampu">
                  <select className="form-select w-full" value={hasLighting ? 'ADA' : 'TIDAK_ADA'} onChange={(event) => setHasLighting(event.target.value === 'ADA')}>
                    <option value="TIDAK_ADA">Tidak Ada</option>
                    <option value="ADA">Ada</option>
                  </select>
                </FormField>
                {/* Jumlah lampu hanya bermakna bila lapangan berpenerangan. */}
                {hasLighting && <FormField label="Jumlah lampu">
                  <input className="form-input w-full" name="lightCount" type="number" min={0} max={1000} defaultValue={decimalValue(facility.lightCount)} />
                </FormField>}
                <FormField label="Panjang court" hint="meter">
                  <input className="form-input w-full" name="courtLength" inputMode="decimal" defaultValue={decimalValue(facility.courtLength)} />
                </FormField>
                <FormField label="Lebar court" hint="meter">
                  <input className="form-input w-full" name="courtWidth" inputMode="decimal" defaultValue={decimalValue(facility.courtWidth)} />
                </FormField>
                <FormField label="Ruang bebas belakang" hint="meter">
                  <input className="form-input w-full" name="clearanceBack" inputMode="decimal" defaultValue={decimalValue(facility.clearanceBack)} />
                </FormField>
                <FormField label="Ruang bebas kiri" hint="meter">
                  <input className="form-input w-full" name="clearanceLeft" inputMode="decimal" defaultValue={decimalValue(facility.clearanceLeft)} />
                </FormField>
                <FormField label="Ruang bebas kanan" hint="meter">
                  <input className="form-input w-full" name="clearanceRight" inputMode="decimal" defaultValue={decimalValue(facility.clearanceRight)} />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection title={`Foto lapangan (${photos.length})`} description="Perubahan foto langsung tersimpan, tidak menunggu tombol Simpan.">
              <div className="mt-4 border-t border-gray-100 pt-5 dark:border-gray-700/60"><PhotoManager /></div>
            </FormSection>
            <SaveRow saving={saving} />
          </form>}

          {/* ── Tab 2: Sarana & Prasarana ───────────────────────── */}
          {/* ── Tab 2: Sarana & Prasarana ───────────────────────── */}
          {/* Satu-satunya tab yang masih memakai mode lihat/sunting: daftar
              centang seluruh fasilitas master terlalu ramai bila selalu
              terbuka, sementara yang paling sering dibutuhkan hanyalah melihat
              sarana yang sudah tercatat beserta fotonya. */}
          {tab === 'amenities' && (editingAmenities ? (
            <form onSubmit={saveAmenities}>
              <FormSection
                title="Sarana & prasarana"
                description="Centang fasilitas yang tersedia, lalu lengkapi deskripsi dan fotonya."
              >
                <div className="mt-4 border-t border-gray-100 pt-5 dark:border-gray-700/60">
                  <AmenityEditor
                    drafts={amenityDrafts}
                    setDrafts={setAmenityDrafts}
                    onError={setError}
                    token={token}
                    onPreviewPhoto={(photoId, label) => setLightbox({ id: photoId, label })}
                    onDeletePersistedPhoto={async (amenityId, photoId) => {
                      await api.facilities.deleteAmenityPhoto(token!, facility.id, amenityId, photoId)
                    }}
                  />
                </div>
              </FormSection>
              <div className="mt-7 flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-700/60">
                <button
                  type="button"
                  className="btn border border-gray-200 bg-white text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  onClick={() => { setEditingAmenities(false); resetDrafts() }}
                >
                  Batal
                </button>
                <button type="submit" className="btn bg-gray-900 text-sm text-gray-100 hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800" disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan perubahan'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <FormSection
                title="Sarana & prasarana"
                description={`${facility.amenities.length} fasilitas tercatat di lapangan ini.`}
                action={
                  <button type="button" className="text-sm font-medium text-violet-600 hover:text-violet-700" onClick={() => setEditingAmenities(true)}>
                    Edit
                  </button>
                }
              >
                <div className="mt-4">
                  {facility.amenities.length === 0
                    ? <p className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">Belum ada sarana yang dicatat.</p>
                    : <ul className="space-y-4">
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
                            <button
                              type="button"
                              className="block cursor-zoom-in"
                              onClick={() => setLightbox({ id: photo.id, label: `${amenityDisplayName(amenity)} — ${photo.originalName}` })}
                              aria-label={`Perbesar ${photo.originalName}`}
                            >
                              <AuthenticatedImage fileId={photo.id} alt={photo.originalName} className="h-20 w-28 rounded border border-gray-200 object-cover transition hover:opacity-90 dark:border-gray-700" />
                            </button>
                          </li>)}
                        </ul>}
                      </li>)}
                    </ul>}
                </div>
              </FormSection>

              <FormSection title="Belum tersedia" description="Fasilitas dari daftar master yang belum tercatat di lapangan ini.">
                <div className="mt-4">
                  {(() => {
                    const missing = AMENITY_OPTIONS.filter((option) => option.value !== 'LAINNYA' && !facility.amenities.some((amenity) => amenity.code === option.value))
                    return missing.length === 0
                      ? <p className="text-sm text-gray-500">Seluruh fasilitas master sudah tercatat.</p>
                      : <ul className="flex flex-wrap gap-2">
                        {missing.map((option) => <li key={option.value} className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-400 dark:border-gray-700">{option.label}</li>)}
                      </ul>
                  })()}
                </div>
              </FormSection>
            </>
          ))}

          {/* ── Tab 3: Operasional ──────────────────────────────── */}
          {tab === 'operational' && <>
            <form onSubmit={saveOperational}>
              <FormSection title="Pengelola lapangan" description="Penanggung jawab yang bisa dihubungi.">
                <FormRows>
                  <FormRow label="Pengelola / instansi">
                    <input className="form-input w-full sm:max-w-sm" name="managerName" defaultValue={facility.managerName ?? ''} maxLength={200} />
                  </FormRow>
                  <FormRow label="Nama PIC">
                    <input className="form-input w-full sm:max-w-sm" name="picName" defaultValue={facility.picName ?? ''} maxLength={200} />
                  </FormRow>
                  <FormRow label="No. HP / WhatsApp">
                    <input className="form-input w-full sm:max-w-xs" name="picPhone" type="tel" defaultValue={facility.picPhone ?? ''} maxLength={50} />
                  </FormRow>
                </FormRows>
              </FormSection>

              <FormSection title="Operasional" description="Jam buka, akses, dan tarif sewa.">
                <FormRows>
                  <FormRow label="Status lapangan">
                    <select className="form-select w-full sm:max-w-[200px]" name="operationalStatus" defaultValue={facility.operationalStatus}>
                      {OPERATIONAL_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </FormRow>
                  <FormRow label="Akses lapangan">
                    <select className="form-select w-full sm:max-w-[200px]" name="accessType" defaultValue={facility.accessType}>
                      {ACCESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </FormRow>
                  <FormRow label="Jam buka">
                    <input className="form-input w-full sm:max-w-[160px]" name="openTime" type="time" defaultValue={facility.openTime ?? ''} />
                  </FormRow>
                  <FormRow label="Jam tutup">
                    <input className="form-input w-full sm:max-w-[160px]" name="closeTime" type="time" defaultValue={facility.closeTime ?? ''} />
                  </FormRow>
                  <FormRow label="Harga sewa / jam (Rp)">
                    <input className="form-input w-full sm:max-w-[200px]" name="hourlyRate" type="number" min={0} step={1000} defaultValue={decimalValue(facility.hourlyRate)} />
                  </FormRow>
                </FormRows>
              </FormSection>
              <SaveRow saving={saving} />
            </form>

            {/* §7 — panel verifikasi selalu tampil, terpisah dari data lapangan. */}
            <FormSection title="Verifikasi & grade lapangan" description={`Terverifikasi oleh ${facility.verifier?.name ?? '—'} · ${formatDateTime(facility.verifiedAt)}`}>
              <FormRows>
                <FormRow label="Status verifikasi">
                  <select className="form-select w-full sm:max-w-[200px]" value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value as FacilityVerificationStatus)}>
                    {VERIFICATION_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </FormRow>
                <FormRow label="Grade lapangan">
                  <select className="form-select w-full sm:max-w-[200px]" value={grade} onChange={(event) => setGrade(event.target.value as FacilityGrade | '')}>
                    <option value="">Belum ditentukan</option>
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                  </select>
                </FormRow>
                <FormRow label="Catatan admin">
                  <textarea className="form-textarea w-full sm:max-w-2xl" rows={3} maxLength={2000} value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} />
                </FormRow>
              </FormRows>
              <div className="mt-6 flex justify-end border-t border-gray-100 pt-5 dark:border-gray-700/60">
                <button type="button" className="btn bg-gray-900 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800" disabled={verifying} onClick={saveVerification}>{verifying ? 'Menyimpan…' : 'Simpan verifikasi'}</button>
              </div>
            </FormSection>
          </>}
      </div>
    </section>

    {/* Tindakan merusak ditaruh paling bawah agar tidak bersaing dengan isi. */}
    <div className="mt-6 flex justify-end">
      <button type="button" className="text-sm font-medium text-red-600 hover:text-red-700" onClick={remove}>Hapus lapangan ini</button>
    </div>

    {lightbox && (() => {
      const isCover = lightbox.id === facility.coverPhotoId
      return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={lightbox.label}>
        <button className="absolute inset-0 cursor-zoom-out bg-gray-950/70" aria-label="Tutup pratinjau" onClick={() => setLightbox(null)} />
        <div className="relative max-h-full w-full max-w-3xl">
          <p className="mb-2 text-center text-sm font-medium text-white">{lightbox.label} · {facility.name}{isCover && ' · Foto Utama'}</p>
          <AuthenticatedImage fileId={lightbox.id} alt={lightbox.label} className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain" />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {isCover
              ? <span className="rounded-md bg-violet-500/20 px-3 py-1.5 text-sm font-medium text-violet-200">Sudah menjadi foto utama</span>
              : <button type="button" className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50" disabled={photoAction !== null} onClick={() => setCover(lightbox.id)}>{photoAction === 'cover' ? 'Menyimpan…' : 'Jadikan Foto Utama'}</button>}
            <button type="button" className="rounded-md bg-red-600/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50" disabled={photoAction !== null} onClick={() => deletePhoto(lightbox.id, lightbox.label)}>{photoAction === 'delete' ? 'Menghapus…' : 'Hapus Foto'}</button>
            <button type="button" className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20" onClick={() => setLightbox(null)}>Tutup</button>
          </div>
        </div>
      </div>
    })()}
  </div>
}
