import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useWorkspaceStore } from '../stores/workspace.store'
import { z } from 'zod'
import { useAuthStore } from '../stores/auth.store'

const signInSchema = z.object({ email: z.string().email('Masukkan email yang valid.'), password: z.string().min(1, 'Password wajib diisi.') })

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((state) => state.login)
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const parsed = signInSchema.safeParse({ email, password })
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Periksa kembali data login.')
      return
    }
    setFieldError('')
    setLoading(true)
    try {
      await login(email, password)
      const intentDistrictId = (location.state as { intentDistrictId?: string } | null)?.intentDistrictId
      if (intentDistrictId) {
        const districts = await api.districts.list()
        const intended = districts.find((district) => district.id === intentDistrictId)
        const currentUser = useAuthStore.getState().user
        const isCentral = currentUser?.roles.some((role) => role.role === 'CENTRAL_ADMIN') ?? false
        const assignedId = currentUser?.roles.find((role) => role.role === 'DISTRICT_ADMIN')?.districtId
        if (intended && (isCentral || intended.id === assignedId)) {
          selectWorkspace(intended)
          navigate('/dashboard', { replace: true })
          return
        }
      }
      navigate('/', { replace: true })
    } catch {
      setError('Email atau password tidak valid.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-12 font-inter">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Link to="/signin" className="mb-5 inline-flex items-center justify-center" aria-label="PELTI Bali One">
            <svg className="fill-violet-500" xmlns="http://www.w3.org/2000/svg" width={44} height={44} viewBox="0 0 32 32"><path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" /></svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-100">PELTI Bali One</h1>
          <p className="mt-2 text-sm text-gray-400">Central Management System</p>
        </div>

        <div className="rounded-xl border border-gray-700/60 bg-gray-800 p-6 shadow-xs sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-gray-100">Sign in</h2>
          <p className="mb-6 text-sm text-gray-400">Masuk untuk mengelola workspace PELTI Bali.</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-300" htmlFor="email">Email</label>
              <input id="email" className="form-input w-full bg-gray-900/40 text-gray-100 placeholder-gray-500" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nama@pelti-bali.id" />
            </div>
            <div className="mb-5">
              <label className="mb-1 block text-sm font-medium text-gray-300" htmlFor="password">Password</label>
              <input id="password" className="form-input w-full bg-gray-900/40 text-gray-100 placeholder-gray-500" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </div>
            {(fieldError || error) && <p className="mb-4 text-sm text-red-400" role="alert">{fieldError || error}</p>}
            <button className="btn w-full bg-violet-500 font-medium text-gray-900 hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading} type="submit">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">PELTI Bali Data Center</p>
      </div>
    </main>
  )
}
