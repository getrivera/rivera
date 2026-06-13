import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rivera — Sign in',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-500 tracking-tight">Rivera</h1>
          <p className="text-sm text-gray-500 mt-1">Real estate partner platform</p>
        </div>
        {children}
      </div>
    </div>
  )
}
