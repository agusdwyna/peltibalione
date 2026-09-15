import { Link } from 'react-router-dom'

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4"><div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-xs"><p className="text-sm text-gray-500">404</p><h1 className="mt-2 text-xl font-semibold text-gray-800">Page not found</h1><Link className="mt-5 inline-flex text-sm font-medium text-violet-600 hover:text-violet-700" to="/">Return to dashboard →</Link></div></main>
}
