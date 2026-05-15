'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0C0920', fontFamily: 'system-ui, sans-serif', color: '#EDE5FF', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 38, fontWeight: 400, lineHeight: 1, margin: 0 }}>
          Welcome <span style={{ fontStyle: 'italic', color: '#B794FF' }}>back.</span>
        </h1>
        <p style={{ color: '#C4B8E0', marginTop: 12, fontSize: 14 }}>Log in to your gym app.</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 28, display: 'grid', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#EDE5FF', fontSize: 15 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#EDE5FF', fontSize: 15 }}
          />

          {error && <div style={{ color: '#FF5E8A', fontSize: 13 }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '16px', borderRadius: 14, border: 'none', background: loading ? '#3A2A5C' : 'linear-gradient(135deg, #B794FF, #FFD1E3)', color: '#0C0920', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', marginTop: 8 }}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: 13, color: '#7D73A3', textAlign: 'center' }}>
          New here?{' '}
          <Link href="/signup" style={{ color: '#B794FF', textDecoration: 'underline' }}>Create an account</Link>
        </p>
      </div>
    </main>
  )
}