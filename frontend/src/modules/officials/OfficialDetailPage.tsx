import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import AuthenticatedImage from '../../components/ui/AuthenticatedImage'
import { useAuthStore } from '../../stores/auth.store'
import CertificateTable from '../../components/certificates/CertificateTable'
import FormRow, { FormRows, FormSection, SaveRow } from '../../components/portal/FormRow'
import TournamentTable from './TournamentTable'
import {
  GENDER_OPTIONS,
  OFFICIAL_LEVEL_OPTIONS,
  OFFICIAL_ROLE_OPTIONS,
  OFFICIAL_STATUS_OPTIONS,
  ageFrom,
  dateInputValue,
  formatDate,
  formatExperience,
  genderLabel,
  joinLabels,
  officialLevelLabel,
  officialRoleLabel,
  officialStatusClass,
  officialStatusLabel,
  officialVerificationStatusClass,
  officialVerificationStatusLabel,
  type OfficialDetail,
  type OfficialRole,
} from '../../types/official'

type Tab = 'personal' | 'officiating' | 'certificates' | 'tournaments'


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

export default function OfficialDetailPage() {
  const { officialId } = useParams<{ officialId: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const [official, setOfficial] = useState<OfficialDetail | null>(null)
  const [tab, setTab] = useState<Tab>('personal')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState<OfficialRole[]>([])
  const [uploading, setUploading] = useState(false)

  /**
   * `resetForm: false` dipakai saat hanya foto yang berubah — menyegarkan
   * seluruh state form di tengah pengeditan akan membuang isian yang belum
   * sempat disimpan.
   */
  const load = (options: { resetForm?: boolean } = {}) => {
    if (!token || !officialId) return
    const resetForm = options.resetForm ?? true
    if (resetForm) setLoading(true)
    api.officials
      .get(token, officialId)
      .then((data) => {
        setOfficial(data)
        if (!resetForm) return

        setRoles(data.roles)


      })
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Detail wasit tidak dapat dimuat.'))
      .finally(() => {
        if (resetForm) setLoading(false)
      })
  }
  useEffect(() => { load() }, [token, officialId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!token || !official || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.officials.update(token, official.id, build(new FormData(event.currentTarget)))
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
    acceptingAssignments: String(fd.get('acceptingAssignments') ?? '') === 'YA',
    experience: text(fd, 'experience'),
  }))

  const saveOfficiating = submitTab((fd) => ({
    officialStatus: fd.get('officialStatus'),
    officiatingSince: integer(fd, 'officiatingSince'),
    roles,
    level: text(fd, 'level'),
  }))




  const changePhoto = async (file: File) => {
    if (!token || !official) return
    setUploading(true)
    setError('')
    setNotice('')
    try {
      const uploaded = await api.players.uploadCertificateFile(token, file, 'official')
      await api.officials.update(token, official.id, { photoId: uploaded.id })
      setNotice('Foto profil diperbarui.')
      load({ resetForm: false })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Foto gagal diunggah.')
    } finally {
      setUploading(false)
    }
  }

  const remove = async () => {
    if (!token || !official) return
    if (!window.confirm(`Hapus master wasit "${official.fullName}"? Seluruh berkasnya ikut terhapus dan tindakan ini tidak dapat dibatalkan.`))
      return
    try {
      await api.officials.remove(token, official.id)
      navigate('/officials', { replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Wasit tidak dapat dihapus.')
    }
  }

  if (loading)
    return (
      <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">Memuat detail…</p>
      </div>
    )
  if (!official)
    return (
      <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
        <Link className="text-sm text-gray-500 hover:text-gray-800" to="/officials">
          Kembali ke daftar wasit
        </Link>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Wasit tidak ditemukan.'}</div>
      </div>
    )

  /** Buang perubahan draft yang belum disimpan saat pindah tab. */
  const resetDrafts = () => {

    setRoles(official.roles)
  }


  const tabs: Array<[Tab, string]> = [
    ['personal', 'Informasi Pribadi'],
    ['officiating', 'Informasi Kewasitan'],
    ['certificates', 'Lisensi & Sertifikasi'],
    ['tournaments', 'Riwayat Turnamen'],
  ]

  const age = ageFrom(official.birthDate)
  const tournamentCount = official._count?.tournaments ?? official.tournaments.length

  // §14 — ringkasan profil yang paling sering dicari.
  const heroSpecs: Array<[string, string]> = [
    ['Distrik', `PELTI ${official.district.name}`],
    ['Menjadi wasit sejak', String(official.officiatingSince)],
    ['Pengalaman', formatExperience(official.officiatingSince)],
    ['Peran', joinLabels(official.roles, officialRoleLabel)],
    ['Tingkat', official.level ? officialLevelLabel(official.level) : '—'],
    ['Jumlah turnamen', `${tournamentCount} turnamen`],
  ]

  return (
    <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" to="/officials">
          Kembali ke daftar wasit
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
            {official.photoId ? (
              <AuthenticatedImage
                fileId={official.photoId}
                alt={`Foto ${official.fullName}`}
                className="aspect-square w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-700">
                Belum ada foto
              </div>
            )}
            {/* §4 — foto wajib, jadi hanya bisa diganti, tidak dihapus. */}
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
            </div>
          </div>

          <div className="min-w-0">
            <p className="font-mono text-xs text-gray-400">{official.officialCode}</p>
            <h1 className="mt-1 text-2xl font-bold leading-snug text-gray-900 dark:text-gray-100 md:text-3xl">{official.fullName}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${officialVerificationStatusClass[official.verificationStatus] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {officialVerificationStatusLabel(official.verificationStatus)}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${officialStatusClass[official.officialStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                {officialStatusLabel(official.officialStatus)}
              </span>
              {official.acceptingAssignments && (
                <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700">Bersedia ditugaskan</span>
              )}
            </div>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              {genderLabel(official.gender)} · {formatDate(official.birthDate)}
              {age != null && ` · ${age} tahun`}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              WhatsApp {official.whatsapp}
              {official.instagram && ` · ${official.instagram}`}
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
        <nav className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700/60" aria-label="Detail wasit">
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
              <FormSection title="Data diri" description="Identitas dasar wasit. NIK dan alamat tidak ditampilkan pada halaman publik.">
                <FormRows>
                  <FormRow label="Nama lengkap">
                    <input className="form-input w-full sm:max-w-sm" name="fullName" defaultValue={official.fullName} required maxLength={200} />
                  </FormRow>
                  <FormRow label="NIK" hint="16 digit sesuai KTP">
                    <input
                      className="form-input w-full font-mono sm:max-w-[220px]"
                      name="nik"
                      defaultValue={official.nik}
                      required
                      inputMode="numeric"
                      pattern="\d{16}"
                      maxLength={16}
                      title="NIK harus 16 digit angka"
                    />
                  </FormRow>
                  <FormRow label="Jenis kelamin">
                    <select className="form-select w-full sm:max-w-[200px]" name="gender" defaultValue={official.gender}>
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
                      defaultValue={dateInputValue(official.birthDate)}
                      required
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </FormRow>
                  <FormRow label="Umur" value={age == null ? null : `${age} tahun`} hint="Otomatis dari tanggal lahir" />
                </FormRows>
              </FormSection>

              <FormSection title="Kontak" description="Kanal komunikasi dan kesediaan menerima penugasan.">
                <FormRows>
                  <FormRow label="Alamat lengkap">
                    <textarea className="form-textarea w-full sm:max-w-md" name="address" rows={2} defaultValue={official.address} required maxLength={1000} />
                  </FormRow>
                  <FormRow label="No. HP / WhatsApp">
                    <input className="form-input w-full sm:max-w-xs" name="whatsapp" type="tel" defaultValue={official.whatsapp} required maxLength={50} />
                  </FormRow>
                  <FormRow label="Email">
                    <input className="form-input w-full sm:max-w-sm" name="email" type="email" defaultValue={official.email ?? ''} maxLength={200} />
                  </FormRow>
                  <FormRow label="Instagram">
                    <input className="form-input w-full sm:max-w-xs" name="instagram" defaultValue={official.instagram ?? ''} maxLength={100} />
                  </FormRow>
                  <FormRow label="Bersedia ditugaskan">
                    <select className="form-select w-full sm:max-w-[160px]" name="acceptingAssignments" defaultValue={official.acceptingAssignments ? 'YA' : 'TIDAK'}>
                      <option value="TIDAK">Tidak</option>
                      <option value="YA">Ya</option>
                    </select>
                  </FormRow>
                </FormRows>
              </FormSection>

              <FormSection title="Pengalaman / catatan kewasitan" description="Rekam jejak kewasitan yang perlu dicatat.">
                <FormRows>
                  <FormRow label="Pengalaman / catatan">
                    <textarea className="form-textarea w-full sm:max-w-2xl" name="experience" rows={4} defaultValue={official.experience ?? ''} maxLength={4000} />
                  </FormRow>
                </FormRows>
              </FormSection>
              <SaveRow saving={saving} />
            </form>
          )}

          {/* ── Tab 2: Informasi Kewasitan ──────────────────────── */}
          {tab === 'officiating' && (
            <form onSubmit={saveOfficiating}>
              <FormSection title="Informasi kewasitan" description="Peran dan tingkat kewasitan. Jumlah turnamen dihitung otomatis dari tab Riwayat Turnamen.">
                <FormRows>
                  <FormRow label="Status wasit">
                    <select className="form-select w-full sm:max-w-[200px]" name="officialStatus" defaultValue={official.officialStatus}>
                      {OFFICIAL_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Menjadi wasit sejak">
                    <input
                      className="form-input w-full sm:max-w-[160px]"
                      name="officiatingSince"
                      type="number"
                      required
                      min={1950}
                      max={new Date().getFullYear()}
                      defaultValue={official.officiatingSince}
                    />
                  </FormRow>
                  <FormRow label="Pengalaman" value={formatExperience(official.officiatingSince)} hint="Otomatis dari tahun menjadi wasit" />
                  <FormRow label="Peran wasit" hint="Minimal satu peran">
                    <div className="flex flex-wrap gap-3">
                      {OFFICIAL_ROLE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 dark:border-gray-700/60 dark:text-gray-100"
                        >
                          <input
                            className="form-checkbox"
                            type="checkbox"
                            checked={roles.includes(option.value)}
                            onChange={(event) =>
                              setRoles((current) =>
                                event.target.checked ? [...current, option.value] : current.filter((item) => item !== option.value),
                              )
                            }
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </FormRow>
                  {roles.length === 0 && (
                    <FormRow label="" value={<span className="text-xs text-red-600">Pilih minimal satu peran wasit.</span>} />
                  )}
                  <FormRow label="Tingkat wasit">
                    <select className="form-select w-full sm:max-w-[200px]" name="level" defaultValue={official.level ?? ''}>
                      <option value="">Belum ditentukan</option>
                      {OFFICIAL_LEVEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Jumlah turnamen" value={`${tournamentCount} turnamen`} hint="Otomatis dari riwayat turnamen" />
                </FormRows>
              </FormSection>
              <SaveRow saving={saving} />
            </form>
          )}

          {/* ── Tab 3: Lisensi & Sertifikasi ────────────────────── */}
          {tab === 'certificates' && token && (
            <CertificateTable
              certificates={official.certificates}
              owner="official"
              token={token}
              onSave={async (input) => {
                const certificates = await api.officials.replaceCertificates(token, official.id, input)
                setOfficial((current) => current ? { ...current, certificates } : current)
              }}
            />
          )}

          {/* ── Tab 4: Riwayat Turnamen ─────────────────────────── */}
          {tab === 'tournaments' && token && (
            <TournamentTable
              tournaments={official.tournaments}
              onSave={async (input) => {
                const tournaments = await api.officials.replaceTournaments(token, official.id, input)
                setOfficial((current) => current ? { ...current, tournaments, _count: { ...current._count, tournaments: tournaments.length } } : current)
              }}
            />
          )}

        </div>
      </section>

      {/* Tindakan merusak ditaruh paling bawah agar tidak bersaing dengan isi. */}
      <div className="mt-6 flex justify-end">
        <button type="button" className="text-sm font-medium text-red-600 hover:text-red-700" onClick={remove}>
          Hapus wasit ini
        </button>
      </div>
    </div>
  )
}
