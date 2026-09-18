import { authUserSchema, districtSchema, type AuthUser, type District } from '../types/auth'
import { ageGroupSchema, certificateSchema, checkStatusResultSchema, formSchema, paginationMetaSchema, playerDetailSchema, playerSchema, pnpRankingSchema, publicDistrictOverviewSchema, publicSubmissionSchema, statsOverviewSchema, submissionDetailSchema, submissionSchema, trackRecordSchema, updatePlayerPersonalInfoSchema, verificationSchema, type FormType, type PublicSubmissionInput, type UpdatePlayerPersonalInfoInput } from '../types/portal'
import { facilityAmenitySchema, facilityDetailSchema, facilitySchema, facilityStatsSchema, facilitySubmissionDetailSchema, facilitySubmissionSchema, type FacilityAmenityInput, type FacilityFormInput, type FacilityGrade, type FacilityVerificationStatus } from '../types/facility'
import { coachCertificateSchema, coachDetailSchema, coachSchema, coachStatsSchema, coachSubmissionDetailSchema, coachSubmissionSchema, type AthleteCategory, type CoachCertificateInput, type CoachFormInput, type CoachStatus, type CoachVerificationStatus } from '../types/coach'
import { officialCertificateSchema, officialDetailSchema, officialSchema, officialStatsSchema, officialSubmissionDetailSchema, officialSubmissionSchema, officialTournamentSchema, type OfficialCertificateInput, type OfficialFormInput, type OfficialLevel, type OfficialRole, type OfficialStatus, type OfficialTournamentInput, type OfficialVerificationStatus } from '../types/official'
import { auditLogSchema, managedUserSchema, type CreateUserInput, type UpdateUserInput } from '../types/system'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type RequestOptions = RequestInit & { token?: string | null }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...init } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const error = payload?.error
    throw new ApiError(error?.message ?? 'Request failed', response.status, error?.code)
  }
  return payload as T
}

export const api = {
  auth: {
    async login(email: string, password: string) {
      const payload = await request<{ token: string; user: unknown }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      return { token: payload.token, user: authUserSchema.parse(payload.user) }
    },
    async me(token: string) {
      const payload = await request<unknown>('/auth/me', { token })
      return authUserSchema.parse(payload)
    },
    async logout(token: string) {
      await request('/auth/logout', { method: 'POST', token })
    },
  },
  districts: {
    async list() {
      const payload = await request<{ data: unknown }>('/districts')
      return districtSchema.array().parse(payload.data)
    },
    async overview(id: string) {
      const payload = await request<{ data: unknown }>(`/districts/${encodeURIComponent(id)}/overview`)
      return publicDistrictOverviewSchema.parse(payload.data)
    },
    async publicSummary() {
      const payload = await request<{ data: unknown }>('/districts/public-summary')
      return payload.data as { athletes: number; coaches: number; facilities: number; referees: number }
    },
  },
  stats: {
    async overview(token: string, districtId?: string) {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ''
      const payload = await request<{ data: unknown }>(`/stats/overview${query}`, { token })
      return statsOverviewSchema.parse(payload.data)
    },
  },
  ageGroups: {
    async list() {
      const payload = await request<{ data: unknown }>('/forms/age-groups/public')
      return ageGroupSchema.array().parse(payload.data)
    },
  },
  files: {
    async fetchBlobUrl(token: string, id: string) {
      const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new ApiError('Berkas tidak dapat dimuat', response.status)
      return URL.createObjectURL(await response.blob())
    },
    async uploadPublic(file: File, field: 'photoId' | 'achievementPhotoId' | 'facilityPhoto' | 'amenityPhoto' | 'coachPhoto' | 'coachCertificate' | 'officialPhoto' | 'officialCertificate') {
      const kindByField = { achievementPhotoId: 'achievement', facilityPhoto: 'facility', amenityPhoto: 'amenity', coachPhoto: 'coach', coachCertificate: 'coach-certificate', officialPhoto: 'official', officialCertificate: 'official-certificate', photoId: 'photo' } as const
      const body = new FormData()
      body.append('file', file)
      body.append('kind', kindByField[field])
      const response = await fetch(`${API_BASE_URL}/files/public/upload`, { method: 'POST', body })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new ApiError(payload?.error?.message ?? 'Upload gagal', response.status, payload?.error?.code)
      }
      return payload.data as { id: string }
    },
  },
  status: {
    async check(nik: string, fullName: string) {
      const query = new URLSearchParams({ nik, fullName })
      const payload = await request<{ data: unknown }>(`/status/check?${query}`)
      return checkStatusResultSchema.parse(payload.data)
    },
    async createAccount(playerId: string, nik: string, fullName: string) {
      const payload = await request<{ data: unknown }>('/status/create-account', { method: 'POST', body: JSON.stringify({ playerId, nik, fullName }) })
      return payload.data as { email: string; password: string; name: string }
    },
  },
  players: {
    async updateStatus(token: string, id: string, status: 'VERIFIED' | 'ACTIVE' | 'INACTIVE') {
      const payload = await request<{ data: { id: string; status: string } }>(`/players/${encodeURIComponent(id)}/status`, { method: 'PATCH', token, body: JSON.stringify({ status }) })
      return payload.data
    },
    async list(token: string, params: { page?: number; pageSize?: number; districtId?: string; q?: string; gender?: 'PUTRA' | 'PUTRI'; ageGroup?: string } = {}) {
      const query = new URLSearchParams()
      if (params.page) query.set('page', String(params.page))
      if (params.pageSize) query.set('pageSize', String(params.pageSize))
      if (params.districtId) query.set('districtId', params.districtId)
      if (params.q) query.set('q', params.q)
      if (params.gender) query.set('gender', params.gender)
      if (params.ageGroup) query.set('ageGroup', params.ageGroup)
      const payload = await request<{ data: unknown; meta: unknown }>(`/players?${query}`, { token })
      return { data: playerSchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
    async get(token: string, id: string) {
      const payload = await request<unknown>(`/players/${encodeURIComponent(id)}`, { token })
      return playerDetailSchema.parse(payload)
    },
    async requestTransfer(token: string, id: string, toDistrictId: string) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(id)}/transfer`, { method: 'POST', token, body: JSON.stringify({ toDistrictId }) })
      return payload.data as { id: string }
    },
    async updatePersonalInfo(token: string, id: string, input: UpdatePlayerPersonalInfoInput) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(updatePlayerPersonalInfoSchema.parse(input)),
      })
      return playerDetailSchema.parse(payload.data)
    },
    async addPnpRanking(token: string, playerId: string, input: { rank: number; period: string }) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(playerId)}/pnp-rankings`, { method: 'POST', token, body: JSON.stringify(input) })
      return pnpRankingSchema.parse(payload.data)
    },
    async updatePnpRanking(token: string, playerId: string, rankingId: string, input: { rank?: number; period?: string }) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(playerId)}/pnp-rankings/${encodeURIComponent(rankingId)}`, { method: 'PATCH', token, body: JSON.stringify(input) })
      return pnpRankingSchema.parse(payload.data)
    },
    async deletePnpRanking(token: string, playerId: string, rankingId: string) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(playerId)}/pnp-rankings/${encodeURIComponent(rankingId)}`, { method: 'DELETE', token })
      return payload.data as { id: string }
    },
    async addTrackRecord(token: string, playerId: string, input: { title: string; eventName?: string; eventDate?: string; category?: string; result?: string; description?: string }) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(playerId)}/track-records`, { method: 'POST', token, body: JSON.stringify(input) })
      return trackRecordSchema.parse(payload.data)
    },
    async updateTrackRecord(token: string, playerId: string, recordId: string, input: { title?: string; eventName?: string | null; eventDate?: string | null; category?: string | null; result?: string | null; description?: string | null }) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(playerId)}/track-records/${encodeURIComponent(recordId)}`, { method: 'PATCH', token, body: JSON.stringify(input) })
      return trackRecordSchema.parse(payload.data)
    },
    async deleteTrackRecord(token: string, playerId: string, recordId: string) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(playerId)}/track-records/${encodeURIComponent(recordId)}`, { method: 'DELETE', token })
      return payload.data as { id: string }
    },
    async addCertificate(token: string, playerId: string, input: { title: string; issuer?: string; issuedAt?: string; certificateNo?: string; notes?: string; fileId?: string; trackRecordId?: string }) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(playerId)}/certificates`, { method: 'POST', token, body: JSON.stringify(input) })
      return certificateSchema.parse(payload.data)
    },
    async updateCertificate(token: string, playerId: string, certificateId: string, input: { title?: string; issuer?: string | null; issuedAt?: string | null; certificateNo?: string | null; notes?: string | null; fileId?: string | null; trackRecordId?: string | null }) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(playerId)}/certificates/${encodeURIComponent(certificateId)}`, { method: 'PATCH', token, body: JSON.stringify(input) })
      return certificateSchema.parse(payload.data)
    },
    async deleteCertificate(token: string, playerId: string, certificateId: string) {
      const payload = await request<{ data: unknown }>(`/players/${encodeURIComponent(playerId)}/certificates/${encodeURIComponent(certificateId)}`, { method: 'DELETE', token })
      return payload.data as { id: string }
    },
    async uploadCertificateFile(token: string, file: File, kind?: 'facility' | 'amenity' | 'coach' | 'coach-certificate' | 'official' | 'official-certificate') {
      const body = new FormData()
      body.append('file', file)
      if (kind) body.append('kind', kind)
      const response = await fetch(`${API_BASE_URL}/files/upload`, { method: 'POST', body, headers: { Authorization: `Bearer ${token}` } })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new ApiError(payload?.error?.message ?? 'Upload gagal', response.status, payload?.error?.code)
      return payload.data as { id: string; originalName: string; mimeType: string; size: number }
    },
  },
  forms: {
    async list(token: string, options: { districtId?: string; type?: FormType } = {}) {
      const query = new URLSearchParams()
      if (options.districtId) query.set('districtId', options.districtId)
      if (options.type) query.set('type', options.type)
      const suffix = query.toString() ? `?${query}` : ''
      const payload = await request<{ data: unknown }>(`/forms${suffix}`, { token })
      return formSchema.array().parse(payload.data)
    },
    async create(token: string, input: { title: string; description?: string; type?: FormType }) {
      const payload = await request<{ data: unknown }>('/forms', { method: 'POST', token, body: JSON.stringify(input) })
      return formSchema.parse(payload.data)
    },
    async setStatus(token: string, id: string, status: 'ACTIVE' | 'CLOSED') {
      const payload = await request<{ data: unknown }>(`/forms/${id}/status`, { method: 'PATCH', token, body: JSON.stringify({ status }) })
      return formSchema.parse(payload.data)
    },
  },
  submissions: {
    async createPublic(input: PublicSubmissionInput) {
      const payload = await request<{ data: unknown }>('/submissions/public', { method: 'POST', body: JSON.stringify(publicSubmissionSchema.parse(input)) })
      return payload.data as { id: string; duplicateMatch: string; duplicateOfPlayerId?: string }
    },
    async createDirect(token: string, input: Omit<PublicSubmissionInput, 'formToken'> & { districtId?: string }) {
      const payload = await request<{ data: unknown }>('/submissions/direct', { method: 'POST', token, body: JSON.stringify(input) })
      return payload.data as { id: string; duplicateMatch: string; duplicateOfPlayerId?: string }
    },
    async list(token: string, options: { page?: number; pageSize?: number; districtId?: string; q?: string } = {}) {
      const query = new URLSearchParams({ page: String(options.page ?? 1), pageSize: String(options.pageSize ?? 10) })
      if (options.districtId) query.set('districtId', options.districtId)
      if (options.q) query.set('q', options.q)
      const payload = await request<{ data: unknown; meta: unknown }>(`/submissions?${query}`, { token })
      return { data: submissionSchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
    async review(token: string, id: string, input: { action: 'LINK' | 'REJECT'; rejectionReason?: string; districtId?: string }) {
      return request<{ data: unknown }>(`/submissions/${id}/review`, { method: 'POST', token, body: JSON.stringify(input) })
    },
    async get(token: string, id: string, districtId?: string) {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ''
      const payload = await request<{ data: unknown }>(`/submissions/${id}${query}`, { token })
      return submissionDetailSchema.parse(payload.data)
    },
  },
  facilities: {
    async list(token: string, params: { page?: number; pageSize?: number; districtId?: string; q?: string; verificationStatus?: FacilityVerificationStatus; grade?: FacilityGrade; operationalStatus?: string } = {}) {
      const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 20) })
      if (params.districtId) query.set('districtId', params.districtId)
      if (params.q) query.set('q', params.q)
      if (params.verificationStatus) query.set('verificationStatus', params.verificationStatus)
      if (params.grade) query.set('grade', params.grade)
      if (params.operationalStatus) query.set('operationalStatus', params.operationalStatus)
      const payload = await request<{ data: unknown; meta: unknown }>(`/facilities?${query}`, { token })
      return { data: facilitySchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
    async stats(token: string, districtId?: string) {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ''
      const payload = await request<{ data: unknown }>(`/facilities/stats${query}`, { token })
      return facilityStatsSchema.parse(payload.data)
    },
    async get(token: string, id: string) {
      const payload = await request<{ data: unknown }>(`/facilities/${encodeURIComponent(id)}`, { token })
      return facilityDetailSchema.parse(payload.data)
    },
    async update(token: string, id: string, input: Record<string, unknown>) {
      const payload = await request<{ data: unknown }>(`/facilities/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: JSON.stringify(input) })
      return facilityDetailSchema.partial().parse(payload.data)
    },
    async verify(token: string, id: string, input: { verificationStatus?: FacilityVerificationStatus; grade?: FacilityGrade | null; adminNotes?: string | null }) {
      const payload = await request<{ data: unknown }>(`/facilities/${encodeURIComponent(id)}/verification`, { method: 'PATCH', token, body: JSON.stringify(input) })
      return facilityDetailSchema.partial().parse(payload.data)
    },
    async attachPhotos(token: string, id: string, photoIds: string[]) {
      const payload = await request<{ data: unknown }>(`/facilities/${encodeURIComponent(id)}/photos`, { method: 'POST', token, body: JSON.stringify({ photoIds }) })
      return payload.data as { attached: number }
    },
    async replaceAmenities(token: string, id: string, amenities: FacilityAmenityInput[]) {
      const payload = await request<{ data: unknown }>(`/facilities/${encodeURIComponent(id)}/amenities`, { method: 'PUT', token, body: JSON.stringify({ amenities }) })
      return facilityAmenitySchema.array().parse(payload.data)
    },
    async attachAmenityPhotos(token: string, id: string, amenityId: string, photoIds: string[]) {
      const payload = await request<{ data: unknown }>(`/facilities/${encodeURIComponent(id)}/amenities/${encodeURIComponent(amenityId)}/photos`, { method: 'POST', token, body: JSON.stringify({ photoIds }) })
      return payload.data as { attached: number }
    },
    async deleteAmenityPhoto(token: string, id: string, amenityId: string, photoId: string) {
      const payload = await request<{ data: unknown }>(`/facilities/${encodeURIComponent(id)}/amenities/${encodeURIComponent(amenityId)}/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE', token })
      return payload.data as { id: string }
    },
    async deletePhoto(token: string, id: string, photoId: string) {
      const payload = await request<{ data: unknown }>(`/facilities/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE', token })
      return payload.data as { id: string; coverPhotoId: string | null }
    },
    async remove(token: string, id: string) {
      const payload = await request<{ data: unknown }>(`/facilities/${encodeURIComponent(id)}`, { method: 'DELETE', token })
      return payload.data as { id: string }
    },
  },
  facilitySubmissions: {
    async createPublic(input: FacilityFormInput & { formToken: string }) {
      const payload = await request<{ data: unknown }>('/facility-submissions/public', { method: 'POST', body: JSON.stringify(input) })
      return payload.data as { id: string; photoCount: number; coverPhotoId: string | null }
    },
    async createDirect(token: string, input: FacilityFormInput & { districtId?: string }) {
      const payload = await request<{ data: unknown }>('/facility-submissions/direct', { method: 'POST', token, body: JSON.stringify(input) })
      return payload.data as { id: string; photoCount: number; coverPhotoId: string | null }
    },
    async list(token: string, params: { page?: number; pageSize?: number; districtId?: string; q?: string } = {}) {
      const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 10) })
      if (params.districtId) query.set('districtId', params.districtId)
      if (params.q) query.set('q', params.q)
      const payload = await request<{ data: unknown; meta: unknown }>(`/facility-submissions?${query}`, { token })
      return { data: facilitySubmissionSchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
    async get(token: string, id: string, districtId?: string) {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ''
      const payload = await request<{ data: unknown }>(`/facility-submissions/${encodeURIComponent(id)}${query}`, { token })
      return facilitySubmissionDetailSchema.parse(payload.data)
    },
    async review(token: string, id: string, input: { action: 'LINK' | 'REJECT'; rejectionReason?: string; grade?: FacilityGrade; verificationStatus?: FacilityVerificationStatus; adminNotes?: string; districtId?: string }) {
      return request<{ data: unknown }>(`/facility-submissions/${encodeURIComponent(id)}/review`, { method: 'POST', token, body: JSON.stringify(input) })
    },
  },
  coaches: {
    async list(token: string, params: { page?: number; pageSize?: number; districtId?: string; q?: string; verificationStatus?: CoachVerificationStatus; coachStatus?: CoachStatus; athleteCategory?: AthleteCategory } = {}) {
      const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 20) })
      if (params.districtId) query.set('districtId', params.districtId)
      if (params.q) query.set('q', params.q)
      if (params.verificationStatus) query.set('verificationStatus', params.verificationStatus)
      if (params.coachStatus) query.set('coachStatus', params.coachStatus)
      if (params.athleteCategory) query.set('athleteCategory', params.athleteCategory)
      const payload = await request<{ data: unknown; meta: unknown }>(`/coaches?${query}`, { token })
      return { data: coachSchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
    async stats(token: string, districtId?: string) {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ''
      const payload = await request<{ data: unknown }>(`/coaches/stats${query}`, { token })
      return coachStatsSchema.parse(payload.data)
    },
    async get(token: string, id: string) {
      const payload = await request<{ data: unknown }>(`/coaches/${encodeURIComponent(id)}`, { token })
      return coachDetailSchema.parse(payload.data)
    },
    async update(token: string, id: string, input: Record<string, unknown>) {
      const payload = await request<{ data: unknown }>(`/coaches/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: JSON.stringify(input) })
      return coachDetailSchema.partial().parse(payload.data)
    },
    async verify(token: string, id: string, input: { verificationStatus: CoachVerificationStatus; adminNotes?: string | null }) {
      const payload = await request<{ data: unknown }>(`/coaches/${encodeURIComponent(id)}/verification`, { method: 'PATCH', token, body: JSON.stringify(input) })
      return coachDetailSchema.partial().parse(payload.data)
    },
    async replaceCertificates(token: string, id: string, certificates: CoachCertificateInput[]) {
      const payload = await request<{ data: unknown }>(`/coaches/${encodeURIComponent(id)}/certificates`, { method: 'PUT', token, body: JSON.stringify({ certificates }) })
      return coachCertificateSchema.array().parse(payload.data)
    },
    async deleteCertificateFile(token: string, id: string, certificateId: string) {
      const payload = await request<{ data: unknown }>(`/coaches/${encodeURIComponent(id)}/certificates/${encodeURIComponent(certificateId)}/file`, { method: 'DELETE', token })
      return payload.data as { id: string; fileId: null }
    },
    async deletePhoto(token: string, id: string) {
      const payload = await request<{ data: unknown }>(`/coaches/${encodeURIComponent(id)}/photo`, { method: 'DELETE', token })
      return payload.data as { id: string; photoId: null }
    },
    async remove(token: string, id: string) {
      const payload = await request<{ data: unknown }>(`/coaches/${encodeURIComponent(id)}`, { method: 'DELETE', token })
      return payload.data as { id: string }
    },
  },
  coachSubmissions: {
    async createPublic(input: CoachFormInput & { formToken: string }) {
      const payload = await request<{ data: unknown }>('/coach-submissions/public', { method: 'POST', body: JSON.stringify(input) })
      return payload.data as { id: string; photoId: string | null; certificateCount: number; duplicateOfCoachId: string | null }
    },
    async createDirect(token: string, input: CoachFormInput & { districtId?: string }) {
      const payload = await request<{ data: unknown }>('/coach-submissions/direct', { method: 'POST', token, body: JSON.stringify(input) })
      return payload.data as { id: string; photoId: string | null; certificateCount: number; duplicateOfCoachId: string | null }
    },
    async list(token: string, params: { page?: number; pageSize?: number; districtId?: string; q?: string } = {}) {
      const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 10) })
      if (params.districtId) query.set('districtId', params.districtId)
      if (params.q) query.set('q', params.q)
      const payload = await request<{ data: unknown; meta: unknown }>(`/coach-submissions?${query}`, { token })
      return { data: coachSubmissionSchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
    async get(token: string, id: string, districtId?: string) {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ''
      const payload = await request<{ data: unknown }>(`/coach-submissions/${encodeURIComponent(id)}${query}`, { token })
      return coachSubmissionDetailSchema.parse(payload.data)
    },
    async review(token: string, id: string, input: { action: 'LINK' | 'REJECT'; rejectionReason?: string; verificationStatus?: CoachVerificationStatus; adminNotes?: string; districtId?: string }) {
      return request<{ data: unknown }>(`/coach-submissions/${encodeURIComponent(id)}/review`, { method: 'POST', token, body: JSON.stringify(input) })
    },
  },
  officials: {
    async list(token: string, params: { page?: number; pageSize?: number; districtId?: string; q?: string; verificationStatus?: OfficialVerificationStatus; officialStatus?: OfficialStatus; role?: OfficialRole; level?: OfficialLevel } = {}) {
      const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 20) })
      if (params.districtId) query.set('districtId', params.districtId)
      if (params.q) query.set('q', params.q)
      if (params.verificationStatus) query.set('verificationStatus', params.verificationStatus)
      if (params.officialStatus) query.set('officialStatus', params.officialStatus)
      if (params.role) query.set('role', params.role)
      if (params.level) query.set('level', params.level)
      const payload = await request<{ data: unknown; meta: unknown }>(`/officials?${query}`, { token })
      return { data: officialSchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
    async stats(token: string, districtId?: string) {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ''
      const payload = await request<{ data: unknown }>(`/officials/stats${query}`, { token })
      return officialStatsSchema.parse(payload.data)
    },
    async get(token: string, id: string) {
      const payload = await request<{ data: unknown }>(`/officials/${encodeURIComponent(id)}`, { token })
      return officialDetailSchema.parse(payload.data)
    },
    async update(token: string, id: string, input: Record<string, unknown>) {
      const payload = await request<{ data: unknown }>(`/officials/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: JSON.stringify(input) })
      return officialDetailSchema.partial().parse(payload.data)
    },
    async verify(token: string, id: string, input: { verificationStatus: OfficialVerificationStatus; adminNotes?: string | null }) {
      const payload = await request<{ data: unknown }>(`/officials/${encodeURIComponent(id)}/verification`, { method: 'PATCH', token, body: JSON.stringify(input) })
      return officialDetailSchema.partial().parse(payload.data)
    },
    async replaceCertificates(token: string, id: string, certificates: OfficialCertificateInput[]) {
      const payload = await request<{ data: unknown }>(`/officials/${encodeURIComponent(id)}/certificates`, { method: 'PUT', token, body: JSON.stringify({ certificates }) })
      return officialCertificateSchema.array().parse(payload.data)
    },
    async replaceTournaments(token: string, id: string, tournaments: OfficialTournamentInput[]) {
      const payload = await request<{ data: unknown }>(`/officials/${encodeURIComponent(id)}/tournaments`, { method: 'PUT', token, body: JSON.stringify({ tournaments }) })
      return officialTournamentSchema.array().parse(payload.data)
    },
    async deleteCertificateFile(token: string, id: string, certificateId: string) {
      const payload = await request<{ data: unknown }>(`/officials/${encodeURIComponent(id)}/certificates/${encodeURIComponent(certificateId)}/file`, { method: 'DELETE', token })
      return payload.data as { id: string; fileId: null }
    },
    async remove(token: string, id: string) {
      const payload = await request<{ data: unknown }>(`/officials/${encodeURIComponent(id)}`, { method: 'DELETE', token })
      return payload.data as { id: string }
    },
  },
  officialSubmissions: {
    async createPublic(input: OfficialFormInput & { formToken: string }) {
      const payload = await request<{ data: unknown }>('/official-submissions/public', { method: 'POST', body: JSON.stringify(input) })
      return payload.data as { id: string; photoId: string | null; certificateCount: number; tournamentCount: number; duplicateOfOfficialId: string | null }
    },
    async createDirect(token: string, input: OfficialFormInput & { districtId?: string }) {
      const payload = await request<{ data: unknown }>('/official-submissions/direct', { method: 'POST', token, body: JSON.stringify(input) })
      return payload.data as { id: string; photoId: string | null; certificateCount: number; tournamentCount: number; duplicateOfOfficialId: string | null }
    },
    async list(token: string, params: { page?: number; pageSize?: number; districtId?: string; q?: string } = {}) {
      const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 10) })
      if (params.districtId) query.set('districtId', params.districtId)
      if (params.q) query.set('q', params.q)
      const payload = await request<{ data: unknown; meta: unknown }>(`/official-submissions?${query}`, { token })
      return { data: officialSubmissionSchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
    async get(token: string, id: string, districtId?: string) {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ''
      const payload = await request<{ data: unknown }>(`/official-submissions/${encodeURIComponent(id)}${query}`, { token })
      return officialSubmissionDetailSchema.parse(payload.data)
    },
    async review(token: string, id: string, input: { action: 'LINK' | 'REJECT'; rejectionReason?: string; verificationStatus?: OfficialVerificationStatus; adminNotes?: string; districtId?: string }) {
      return request<{ data: unknown }>(`/official-submissions/${encodeURIComponent(id)}/review`, { method: 'POST', token, body: JSON.stringify(input) })
    },
  },
  verification: {
    async list(token: string, page = 1) {
      const payload = await request<{ data: unknown; meta: unknown }>(`/verification?page=${page}&pageSize=10`, { token })
      return { data: verificationSchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
    async decide(token: string, id: string, decision: 'approve' | 'reject', notes?: string) {
      return request<{ data: unknown }>(`/verification/${id}/${decision}`, { method: 'POST', token, body: JSON.stringify({ notes }) })
    },
  },
  users: {
    async list(token: string, params: { page?: number; pageSize?: number; q?: string; districtId?: string } = {}) {
      const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 20) })
      if (params.q) query.set('q', params.q)
      if (params.districtId) query.set('districtId', params.districtId)
      const payload = await request<{ data: unknown; meta: unknown }>(`/users?${query}`, { token })
      return { data: managedUserSchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
    async create(token: string, input: CreateUserInput) {
      const payload = await request<{ data: unknown }>('/users', { method: 'POST', token, body: JSON.stringify(input) })
      return managedUserSchema.parse(payload.data)
    },
    async update(token: string, id: string, input: UpdateUserInput) {
      const payload = await request<{ data: unknown }>(`/users/${id}`, { method: 'PATCH', token, body: JSON.stringify(input) })
      return managedUserSchema.parse(payload.data)
    },
    async setActivation(token: string, id: string, isActive: boolean) {
      const payload = await request<{ data: unknown }>(`/users/${id}/activation`, { method: 'PATCH', token, body: JSON.stringify({ isActive }) })
      return managedUserSchema.parse(payload.data)
    },
  },
  audit: {
    async list(token: string, params: { page?: number; pageSize?: number; action?: string; entityType?: string; districtId?: string } = {}) {
      const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 20) })
      if (params.action) query.set('action', params.action)
      if (params.entityType) query.set('entityType', params.entityType)
      if (params.districtId) query.set('districtId', params.districtId)
      const payload = await request<{ data: unknown; meta: unknown }>(`/audit?${query}`, { token })
      return { data: auditLogSchema.array().parse(payload.data), meta: paginationMetaSchema.parse(payload.meta) }
    },
  },
}

export type { AuthUser, District }
