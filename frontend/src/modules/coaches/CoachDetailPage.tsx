import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import AuthenticatedImage from '../../components/ui/AuthenticatedImage'
import { useAuthStore } from '../../stores/auth.store'
import CertificateTable from '../../components/certificates/CertificateTable'
import FormRow, { FormRows, FormSection, SaveRow } from '../../components/portal/FormRow'
import {
  ATHLETE_CATEGORY_OPTIONS,
  COACH_STATUS_OPTIONS,
  GENDER_OPTIONS,
  SPECIALIZATION_OPTIONS,
  ageFrom,
  athleteCategoryLabel,
  coachStatusClass,
  coachStatusLabel,
  coachVerificationStatusClass,
  coachVerificationStatusLabel,
  dateInputValue,
  formatDate,
  formatExperience,
  genderLabel,
  joinLabels,
  specializationLabel,
  type AthleteCategory,
  type CoachDetail,
  type CoachSpecialization,
} from '../../types/coach'

type Tab = 'personal' | 'coaching' | 'certificates'



/** Satu baris label–nilai; dipakai di ringkasan maupun daftar detail. */
function Field({ label, value, mono }: { label: string; value?: ReactNode; mono?: boolean }) {
  const empty = value === null || value === undefined || value === ''
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? 'font-mono ' : ''}${empty ? 'text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
        {empty ? '—' : value}
      </dd>
    </div>
  )
}

/** Checkbox group yang nilainya dikendalikan state, bukan FormData. */
function CheckboxGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: ReadonlyArray<{ value: T; label: string }>
  selected: T[]
  onToggle: (value: T, checked: boolean) => void
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 dark:border-gray-700/60 dark:text-gray-100"
        >
          <input
            className="form-checkbox"
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={(event) => onToggle(option.value, event.target.checked)}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}

export default function CoachDetailPage() {
  const { coachId } = useParams<{ coachId: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const [coach, setCoach] = useState<CoachDetail | null>(null)
  const [tab, setTab] = useState<Tab>('personal')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [athleteCategories, setAthleteCategories] = useState<AthleteCategory[]>([])
  const [specializations, setSpecializations] = useState<CoachSpecialization[]>([])
  const [uploading, setUploading] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)

  /**
   * `resetForm: false` dipakai saat hanya foto yang berubah — menyegarkan
   * seluruh state form di tengah pengeditan akan membuang isian yang belum
   * sempat disimpan.
   */
  const load = (options: { resetForm?: boolean } = {}) => {
    if (!token || !coachId) return
    const resetForm = options.resetForm ?? true
    if (resetForm) setLoading(true)
    api.coaches
      .get(token, coachId)
      .then((data) => {
        setCoach(data)
        if (!resetForm) return

        setAthleteCategories(data.athleteCategories)
        setSpecializations(data.specializations)


      })
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Detail pelatih tidak dapat dimuat.'))
      .finally(() => {
        if (resetForm) setLoading(false)
      })
  }
  useEffect(() => { load() }, [token, coachId]) // eslint-disable-line react-hooks/exhaustive-deps

  const text = (fd: FormData, key: string) => {
    const value = String(fd.get(key) ?? '').trim()
    return value || null
  }
  const integer = (fd: FormData, key: string) => {
    const value = String(fd.get(key) ?? '').trim()
    if (!value) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null
  }

  const submitTab = (build: (fd: FormData) => Record<string, unknown>) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !coach || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.coaches.update(token, coach.id, build(new FormData(event.currentTarget)))
      setNotice('Perubahan tersimpan.')
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Perubahan tidak dapat disimpan.')
    } finally {
      setSaving(false)
    }
  }

  const savePersonal = submitTab((fd) => ({
    fullName: String(fd.get('fullName') ?? '').trim(),
    nik: String(fd.get('nik') ?? '').trim(),
    gender: fd.get('gender'),
    birthDate: String(fd.get('birthDate') ?? '').trim(),
    address: String(fd.get('address') ?? '').trim(),
    whatsapp: String(fd.get('whatsapp') ?? '').trim(),
    email: text(fd, 'email'),
    instagram: text(fd, 'instagram'),
    acceptingNewAthletes: String(fd.get('acceptingNewAthletes') ?? '') === 'YA',
    experience: text(fd, 'experience'),
  }))

  const saveCoaching = submitTab((fd) => ({
    coachStatus: fd.get('coachStatus'),
    coachingSince: integer(fd, 'coachingSince'),
    clubName: text(fd, 'clubName'),
    activeAthletes: integer(fd, 'activeAthletes'),
    athleteCategories,
    specializations,
    // Keterangan hanya dikirim selama "Lainnya" masih dipilih.
    otherSpecialization: specializations.includes('LAINNYA') ? text(fd, 'otherSpecialization') : null,
  }))



  const changePhoto = async (file: File) => {
    if (!token || !coach) return
    setUploading(true)
    setError('')
    setNotice('')
    try {
      const uploaded = await api.players.uploadCertificateFile(token, file, 'coach')
      await api.coaches.update(token, coach.id, { photoId: uploaded.id })
      setNotice('Foto profil diperbarui.')
      load({ resetForm: false })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Foto gagal diunggah.')
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = async () => {
    if (!token || !coach || photoBusy) return
    if (!window.confirm('Hapus foto profil pelatih ini? Berkasnya ikut terhapus permanen.')) return
    setPhotoBusy(true)
    setError('')
    setNotice('')
    try {
      await api.coaches.deletePhoto(token, coach.id)
      setNotice('Foto profil dihapus.')
      load({ resetForm: false })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Foto tidak dapat dihapus.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const remove = async () => {
    if (!token || !coach) return
    if (!window.confirm(`Hapus master pelatih "${coach.fullName}"? Seluruh berkasnya ikut terhapus dan tindakan ini tidak dapat dibatalkan.`))
      return
    try {
      await api.coaches.remove(token, coach.id)
      navigate('/coaches', { replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Pelatih tidak dapat dihapus.')
    }
  }

  if (loading)
    return (
      <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">Memuat detail…</p>
      </div>
    )
  if (!coach)
    return (
      <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
        <Link className="text-sm text-gray-500 hover:text-gray-800" to="/coaches">
          Kembali ke daftar pelatih
        </Link>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Pelatih tidak ditemukan.'}</div>
      </div>
    )

  /** Buang perubahan draft yang belum disimpan saat pindah tab. */
  const resetDrafts = () => {

    setAthleteCategories(coach.athleteCategories)
    setSpecializations(coach.specializations)
  }


  const tabs: Array<[Tab, string]> = [
    ['personal', 'Informasi Pribadi'],
    ['coaching', 'Informasi Kepelatihan'],
    ['certificates', 'Lisensi & Sertifikasi'],
  ]

  const age = ageFrom(coach.birthDate)

  // §14 — ringkasan profil yang paling sering dicari.
  const heroSpecs: Array<[string, string]> = [
    ['Distrik', `PELTI ${coach.district.name}`],
    ['Pengalaman', formatExperience(coach.coachingSince)],
    ['Club', coach.clubName || '—'],
    ['Spesialisasi', joinLabels(coach.specializations, specializationLabel)],
    ['Kategori atlet', joinLabels(coach.athleteCategories, athleteCategoryLabel)],
    ['Jumlah atlet', coach.activeAthletes == null ? '—' : `${coach.activeAthletes} atlet`],
  ]

  return (
    <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" to="/coaches">
          Kembali ke daftar pelatih
        </Link>
      </div>
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700" role="status">
          {notice}
        </div>
      )}

      {/* ── Profil ringkas ───────────────────────────────────────── */}
      <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,28%)_minmax(0,72%)] lg:gap-8">
          <div>
            {coach.photoId ? (
              <AuthenticatedImage
                fileId={coach.photoId}
                alt={`Foto ${coach.fullName}`}
                className="aspect-square w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-700">
                Belum ada foto
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                className="block max-w-[11rem] text-xs text-gray-500 file:mr-2 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-xs file:text-gray-100"
                type="file"
                accept="image/jpeg,image/png"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void changePhoto(file)
                  event.target.value = ''
                }}
              />
              {uploading && <span className="text-xs text-violet-600">Mengunggah…</span>}
              {coach.photoId && !uploading && (
                <button type="button" className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50" disabled={photoBusy} onClick={removePhoto}>
                  Hapus foto
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <p className="font-mono text-xs text-gray-400">{coach.coachCode}</p>
            <h1 className="mt-1 text-2xl font-bold leading-snug text-gray-900 dark:text-gray-100 md:text-3xl">{coach.fullName}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${coachVerificationStatusClass[coach.verificationStatus] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {coachVerificationStatusLabel(coach.verificationStatus)}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${coachStatusClass[coach.coachStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                {coachStatusLabel(coach.coachStatus)}
              </span>
              {coach.acceptingNewAthletes && (
                <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700">Menerima atlet baru</span>
              )}
            </div>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              {genderLabel(coach.gender)} · {formatDate(coach.birthDate)}
              {age != null && ` · ${age} tahun`}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              WhatsApp {coach.whatsapp}
              {coach.instagram && ` · ${coach.instagram}`}
            </p>

            <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-gray-100 pt-5 dark:border-gray-700/60 sm:grid-cols-3">
              {heroSpecs.map(([label, value]) => (
                <Field key={label} label={label} value={value} />
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Tab isi ──────────────────────────────────────────────── */}
      <section className="min-w-0 rounded-xl border border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
        <nav className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700/60" aria-label="Detail pelatih">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-semibold transition sm:px-5 ${tab === key ? 'border-violet-500 text-violet-700 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
              onClick={() => {
                setTab(key)
                resetDrafts()
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="space-y-8 p-5 sm:p-7">
          {/* Semua kolom langsung bisa diubah — tidak perlu menekan "Edit"
              lebih dulu. Perubahan baru tersimpan saat tombol Simpan ditekan. */}

          {/* ── Tab 1: Informasi Pribadi ────────────────────────── */}
          {tab === 'personal' && (
            <form onSubmit={savePersonal}>
              <FormSection title="Data diri" description="Identitas dasar pelatih. NIK dan alamat tidak ditampilkan pada halaman publik.">
                <FormRows>
                  <FormRow label="Nama lengkap">
                    <input className="form-input w-full sm:max-w-sm" name="fullName" defaultValue={coach.fullName} required maxLength={200} />
                  </FormRow>
                  <FormRow label="NIK" hint="16 digit sesuai KTP">
                    <input
                      className="form-input w-full font-mono sm:max-w-[220px]"
                      name="nik"
                      defaultValue={coach.nik}
                      required
                      inputMode="numeric"
                      pattern="\d{16}"
                      maxLength={16}
                      title="NIK harus 16 digit angka"
                    />
                  </FormRow>
                  <FormRow label="Jenis kelamin">
                    <select className="form-select w-full sm:max-w-[200px]" name="gender" defaultValue={coach.gender}>
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Tanggal lahir">
                    <input
                      className="form-input w-full sm:max-w-[200px]"
                      name="birthDate"
                      type="date"
                      defaultValue={dateInputValue(coach.birthDate)}
                      required
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </FormRow>
                  <FormRow label="Umur" value={age == null ? null : `${age} tahun`} hint="Otomatis dari tanggal lahir" />
                </FormRows>
              </FormSection>

              <FormSection title="Kontak" description="Kanal komunikasi dan kesediaan menerima atlet baru.">
                <FormRows>
                  <FormRow label="Alamat lengkap">
                    <textarea className="form-textarea w-full sm:max-w-md" name="address" rows={2} defaultValue={coach.address} required maxLength={1000} />
                  </FormRow>
                  <FormRow label="No. HP / WhatsApp">
                    <input className="form-input w-full sm:max-w-xs" name="whatsapp" type="tel" defaultValue={coach.whatsapp} required maxLength={50} />
                  </FormRow>
                  <FormRow label="Email">
                    <input className="form-input w-full sm:max-w-sm" name="email" type="email" defaultValue={coach.email ?? ''} maxLength={200} />
                  </FormRow>
                  <FormRow label="Instagram">
                    <input className="form-input w-full sm:max-w-xs" name="instagram" defaultValue={coach.instagram ?? ''} maxLength={100} />
                  </FormRow>
                  <FormRow label="Menerima atlet baru">
                    <select className="form-select w-full sm:max-w-[160px]" name="acceptingNewAthletes" defaultValue={coach.acceptingNewAthletes ? 'YA' : 'TIDAK'}>
                      <option value="TIDAK">Tidak</option>
                      <option value="YA">Ya</option>
                    </select>
                  </FormRow>
                </FormRows>
              </FormSection>

              <FormSection title="Pengalaman / prestasi" description="Rekam jejak kepelatihan yang perlu dicatat.">
                <FormRows>
                  <FormRow label="Pengalaman / prestasi">
                    <textarea className="form-textarea w-full sm:max-w-2xl" name="experience" rows={4} defaultValue={coach.experience ?? ''} maxLength={4000} />
                  </FormRow>
                </FormRows>
              </FormSection>
              <SaveRow saving={saving} />
            </form>
          )}

          {/* ── Tab 2: Informasi Kepelatihan ────────────────────── */}
          {tab === 'coaching' && (
            <form onSubmit={saveCoaching}>
              <FormSection title="Informasi kepelatihan" description="Aktivitas dan spesialisasi pelatih.">
                <FormRows>
                  <FormRow label="Status pelatih">
                    <select className="form-select w-full sm:max-w-[200px]" name="coachStatus" defaultValue={coach.coachStatus}>
                      {COACH_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Mulai melatih sejak">
                    <input
                      className="form-input w-full sm:max-w-[160px]"
                      name="coachingSince"
                      type="number"
                      min={1950}
                      max={new Date().getFullYear()}
                      defaultValue={coach.coachingSince ?? ''}
                    />
                  </FormRow>
                  <FormRow label="Pengalaman" value={formatExperience(coach.coachingSince)} hint="Otomatis dari tahun mulai melatih" />
                  <FormRow label="Tempat / club melatih">
                    <input className="form-input w-full sm:max-w-sm" name="clubName" defaultValue={coach.clubName ?? ''} maxLength={200} />
                  </FormRow>
                  <FormRow label="Jumlah atlet aktif">
                    <input
                      className="form-input w-full sm:max-w-[160px]"
                      name="activeAthletes"
                      type="number"
                      min={0}
                      max={10000}
                      defaultValue={coach.activeAthletes ?? ''}
                    />
                  </FormRow>
                  <FormRow label="Kategori atlet">
                    <CheckboxGroup
                      options={ATHLETE_CATEGORY_OPTIONS}
                      selected={athleteCategories}
                      onToggle={(value, checked) =>
                        setAthleteCategories((current) => (checked ? [...current, value] : current.filter((item) => item !== value)))
                      }
                    />
                  </FormRow>
                  <FormRow label="Spesialisasi">
                    <CheckboxGroup
                      options={SPECIALIZATION_OPTIONS}
                      selected={specializations}
                      onToggle={(value, checked) =>
                        setSpecializations((current) => (checked ? [...current, value] : current.filter((item) => item !== value)))
                      }
                    />
                  </FormRow>
                  {/* Kolom keterangan hanya relevan selama "Lainnya" dicentang. */}
                  {specializations.includes('LAINNYA') && (
                    <FormRow label="Spesialisasi lainnya">
                      <input className="form-input w-full sm:max-w-sm" name="otherSpecialization" defaultValue={coach.otherSpecialization ?? ''} maxLength={200} required />
                    </FormRow>
                  )}
                </FormRows>
              </FormSection>
              <SaveRow saving={saving} />
            </form>
          )}

          {/* ── Tab 3: Lisensi & Sertifikasi ────────────────────── */}
          {tab === 'certificates' && token && (
            <CertificateTable
              certificates={coach.certificates}
              owner="coach"
              token={token}
              onSave={async (input) => {
                const certificates = await api.coaches.replaceCertificates(token, coach.id, input)
                setCoach((current) => current ? { ...current, certificates } : current)
              }}
            />
          )}

        </div>
      </section>

      {/* Tindakan merusak ditaruh paling bawah agar tidak bersaing dengan isi. */}
      <div className="mt-6 flex justify-end">
        <button type="button" className="text-sm font-medium text-red-600 hover:text-red-700" onClick={remove}>
          Hapus pelatih ini
        </button>
      </div>
    </div>
  )
}
