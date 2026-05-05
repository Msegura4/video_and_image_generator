import { useState } from 'react'

export default function LoginPage({ onAuth }) {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(false)
  const [shake, setShake]       = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const expected = import.meta.env.VITE_APP_PASSWORD
    if (password === expected) {
      onAuth(password)
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d0d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: 360,
        background: '#161616',
        border: '1px solid #2a2a2a',
        borderRadius: 16,
        padding: '48px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        animation: shake ? 'shake 0.4s ease' : 'none',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#f0f0f0',
            letterSpacing: '0.04em',
          }}>
            Rose Panama
          </div>
          <div style={{
            fontSize: 12,
            color: '#555',
            marginTop: 4,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Espace de création
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false) }}
              autoFocus
              placeholder="••••••••"
              style={{
                background: '#0d0d0d',
                border: `1px solid ${error ? '#c0392b' : '#2a2a2a'}`,
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 15,
                color: '#f0f0f0',
                outline: 'none',
                transition: 'border-color 0.2s',
                letterSpacing: '0.1em',
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = '#444' }}
              onBlur={e  => { if (!error) e.target.style.borderColor = '#2a2a2a' }}
            />
            {error && (
              <span style={{ fontSize: 12, color: '#c0392b' }}>
                Mot de passe incorrect
              </span>
            )}
          </div>

          <button
            type="submit"
            style={{
              background: '#f0f0f0',
              color: '#0d0d0d',
              border: 'none',
              borderRadius: 8,
              padding: '13px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'opacity 0.2s',
              marginTop: 4,
            }}
            onMouseEnter={e => e.target.style.opacity = '0.85'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            Accéder →
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}
