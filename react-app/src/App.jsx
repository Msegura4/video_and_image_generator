import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ImageToVideo from './pages/ImageToVideo'
import GenerateImage from './pages/GenerateImage'
import ExtendVideo from './pages/ExtendVideo'
import Prompts from './pages/Prompts'
import Creations from './pages/Creations'
import CreatePreset from './pages/CreatePreset'
import CreateProject from './pages/CreateProject'
import ProjectDashboard from './pages/ProjectDashboard'
import Inspirations from './pages/Inspirations'
import LoginPage from './pages/LoginPage'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STATIC_NAV = [
  {
    section: 'Créer',
    items: [
      { to: '/generate-image', label: 'Générer Image',  icon: '◻' },
      { to: '/image-to-video', label: 'Image → Vidéo', icon: '◈' },
      { to: '/extend-video',   label: 'Étendre Vidéo',  icon: '⊞' },
    ]
  },
  {
    section: 'Bibliothèque',
    items: [
      { to: '/creations',     label: 'Mes Créations',   icon: '▦' },
      { to: '/prompts',       label: 'Voir Presets',    icon: '≡' },
      { to: '/create-preset', label: 'Créer Preset',    icon: '+' },
    ]
  },
]

function Sidebar({ projects, onProjectCreated, onLogout }) {
  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        Rose Panama
        <span>Espace de création</span>
      </div>

      {STATIC_NAV.map(({ section, items }) => (
        <div className="sidebar-section" key={section}>
          <div className="sidebar-section-label">{section}</div>
          {items.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span style={{ fontSize: 15, opacity: 0.6 }}>{icon}</span>
              {label}
              <span className="nav-arrow">→</span>
            </NavLink>
          ))}
          <div className="sidebar-divider" />
        </div>
      ))}

      {/* MODE PROJET section */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Mode Projet</div>
        <NavLink
          to="/create-project"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span style={{ fontSize: 15, opacity: 0.6 }}>✦</span>
          Créer un Projet
          <span className="nav-arrow">→</span>
        </NavLink>

        <NavLink
          to="/inspirations"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span style={{ fontSize: 15, opacity: 0.6 }}>◇</span>
          Inspirations
          <span className="nav-arrow">→</span>
        </NavLink>

        {projects.map(p => (
          <NavLink
            key={p.id}
            to={`/project/${p.id}`}
            className={({ isActive }) => `nav-item nav-item-project${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: 11, opacity: 0.4 }}>◎</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {p.name}
            </span>
            <span className="nav-arrow">→</span>
          </NavLink>
        ))}

        <div className="sidebar-divider" />
      </div>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span>v2.0 · PiAPI + Kling</span>
        <button
          onClick={onLogout}
          style={{
            background: 'transparent',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            color: '#555',
            fontSize: 11,
            padding: '5px 10px',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => { e.target.style.color = '#aaa'; e.target.style.borderColor = '#444' }}
          onMouseLeave={e => { e.target.style.color = '#555'; e.target.style.borderColor = '#2a2a2a' }}
        >
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

const STORAGE_KEY = 'rp_auth'

export default function App() {
  const [projects, setProjects] = useState([])
  const [authed, setAuthed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const expected = import.meta.env.VITE_APP_PASSWORD
    // If no password is configured, always allow access
    if (!expected) return true
    return stored === expected
  })

  const handleAuth = (pwd) => {
    localStorage.setItem(STORAGE_KEY, pwd)
    setAuthed(true)
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setAuthed(false)
  }

  const fetchProjects = async () => {
    try {
      const r = await fetch(`${API}/api/projects`)
      const d = await r.json()
      setProjects(d.projects || [])
    } catch {
      // API pas encore lancée
    }
  }

  useEffect(() => {
    if (authed) fetchProjects()
  }, [authed])

  if (!authed) {
    return <LoginPage onAuth={handleAuth} />
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar projects={projects} onProjectCreated={fetchProjects} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/image-to-video" replace />} />
            <Route path="/image-to-video" element={<ImageToVideo />} />
            <Route path="/generate-image" element={<GenerateImage />} />
            <Route path="/extend-video"   element={<ExtendVideo />} />
            <Route path="/creations"      element={<Creations />} />
            <Route path="/prompts"        element={<Prompts />} />
            <Route path="/create-preset"  element={<CreatePreset />} />
            <Route path="/create-project" element={<CreateProject onCreated={fetchProjects} />} />
            <Route path="/project/:id"    element={<ProjectDashboard onUpdate={fetchProjects} />} />
            <Route path="/inspirations"   element={<Inspirations />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
