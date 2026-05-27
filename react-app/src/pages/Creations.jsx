import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getVideoPoster(videoUrl) {
  if (!videoUrl?.includes('cloudinary.com')) return null
  return videoUrl
    .replace('/video/upload/', '/video/upload/so_0,w_400/')
    .replace(/\.[^/.]+$/, '.jpg')
}

// ── Assign Modal ──────────────────────────────

function AssignModal({ item, projects, onClose }) {
  const [selected, setSelected] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [done, setDone] = useState(false)

  const handleAssign = async () => {
    if (!selected) return
    setAssigning(true)
    try {
      await fetch(`${API}/api/projects/${selected}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id:     item.public_id,
          url:           item.url,
          resource_type: item.resource_type || 'image',
          media_type:    'creation',
          label:         item.filename || item.public_id.split('/').pop(),
        })
      })
      setDone(true)
      setTimeout(onClose, 800)
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: 24, minWidth: 320, maxWidth: 400,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Assigner au projet</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
          Ce média sera ajouté à la section Médias du projet sélectionné.
        </div>
        {projects.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 20 }}>
            Aucun projet disponible. Créez d'abord un projet en Mode Projet.
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => setSelected(p.id)} style={{
                padding: '10px 12px', marginBottom: 6, borderRadius: 'var(--radius-sm)',
                border: `1px solid ${selected === p.id ? 'var(--accent)' : 'var(--border)'}`,
                background: selected === p.id ? 'var(--accent-dim)' : 'var(--bg-3)',
                cursor: 'pointer', fontSize: 13,
                color: selected === p.id ? 'var(--text)' : 'var(--text-2)',
              }}>
                {p.name}
              </div>
            ))}
          </div>
        )}
        {done ? (
          <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>✓ Assigné au projet</div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 18px' }}
              onClick={handleAssign} disabled={!selected || assigning || projects.length === 0}>
              {assigning ? '…' : 'Assigner →'}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }} onClick={onClose}>
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024)
  return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DeleteButton({ onDelete }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  if (confirm) return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Supprimer ?</span>
      <button
        className="btn btn-ghost"
        style={{ fontSize: 10, padding: '3px 8px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
        disabled={deleting}
        onClick={handleDelete}
      >
        {deleting ? '...' : 'Oui'}
      </button>
      <button
        className="btn btn-ghost"
        style={{ fontSize: 10, padding: '3px 8px' }}
        onClick={() => setConfirm(false)}
      >
        Non
      </button>
    </div>
  )

  return (
    <button
      className="btn btn-ghost"
      style={{ fontSize: 11, padding: '5px 12px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
      onClick={() => setConfirm(true)}
    >
      Supprimer
    </button>
  )
}

function VideoCard({ video, onDelete, projects }) {
  const [playing, setPlaying]       = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const posterUrl = getVideoPoster(video.url)

  return (
    <>
      <div className="preset-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ position: 'relative', background: 'var(--bg-3)', aspectRatio: '16/9' }}>
          {playing ? (
            <video
              src={video.url}
              autoPlay
              controls
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
              onClick={() => setPlaying(true)}
            >
              {posterUrl && (
                <img src={posterUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div style={{
                position: 'relative',
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: 'white'
              }}>▶</div>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {video.filename}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {video.duration > 0 && <span className="pill">{formatDuration(video.duration)}</span>}
            <span className="pill">{formatSize(video.size)}</span>
            <span className="pill">{formatDate(video.created_at)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={video.url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }}>
              Ouvrir ↗
            </a>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setShowAssign(true)}>
              → Projet
            </button>
            <DeleteButton onDelete={onDelete} />
          </div>
        </div>
      </div>
      {showAssign && (
        <AssignModal
          item={{ ...video, resource_type: 'video' }}
          projects={projects || []}
          onClose={() => setShowAssign(false)}
        />
      )}
    </>
  )
}

function ImageCard({ image, onDelete, projects }) {
  const [showAssign, setShowAssign] = useState(false)

  return (
    <>
      <div className="preset-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ aspectRatio: '1/1', overflow: 'hidden', background: 'var(--bg-3)' }}>
          <img
            src={image.thumbnail || image.url}
            alt={image.filename}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {image.filename}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <span className="pill">{image.width}×{image.height}</span>
            <span className="pill">{formatSize(image.size)}</span>
            <span className="pill">{formatDate(image.created_at)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={image.url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }}>
              Ouvrir ↗
            </a>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setShowAssign(true)}>
              → Projet
            </button>
            <DeleteButton onDelete={onDelete} />
          </div>
        </div>
      </div>
      {showAssign && (
        <AssignModal
          item={{ ...image, resource_type: 'image' }}
          projects={projects || []}
          onClose={() => setShowAssign(false)}
        />
      )}
    </>
  )
}

function StatsBar({ stats }) {
  if (!stats || Object.keys(stats).length === 0) return null

  const items = [
    { label: 'Vidéos générées', value: stats.videos_generated ?? '—' },
    { label: 'Image-to-Video',  value: stats.videos_image_to_video ?? '—' },
    { label: 'Étendues',        value: stats.videos_extended ?? '—' },
    { label: 'Images Flux',     value: stats.images_flux ?? '—' },
    { label: 'Stockage',        value: stats.storage_used_mb ? `${stats.storage_used_mb.toFixed(0)} MB` : '—' },
  ]

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 36, flexWrap: 'wrap' }}>
      {items.map(({ label, value }) => (
        <div key={label} className="card" style={{ padding: '14px 20px', flex: '1', minWidth: 100, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>{value}</div>
          <div className="label">{label}</div>
        </div>
      ))}
    </div>
  )
}

export default function Creations() {
  const [tab, setTab]         = useState('videos')
  const [videoFilter, setVideoFilter] = useState('all')
  const [videos, setVideos]   = useState([])
  const [images, setImages]   = useState([])
  const [stats, setStats]     = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [connected, setConnected] = useState(null)

  const VIDEO_FILTERS = [
    { value: 'all',           label: 'Toutes' },
    { value: 'image_to_video',label: 'Image-to-Video' },
    { value: 'generated',     label: 'Générées' },
    { value: 'extended',      label: 'Étendues' },
  ]

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, videosRes, imagesRes, projectsRes] = await Promise.all([
        fetch(`${API}/api/creations/stats`).then(r => r.json()),
        fetch(`${API}/api/creations/videos`).then(r => r.json()),
        fetch(`${API}/api/creations/images`).then(r => r.json()),
        fetch(`${API}/api/projects`).then(r => r.json()),
      ])
      setStats(statsRes)
      setVideos(videosRes.videos || [])
      setImages(imagesRes.images || [])
      setProjects(projectsRes.projects || [])
      setConnected(true)
    } catch {
      setError('Impossible de se connecter à Cloudinary.')
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const fetchVideos = async (type) => {
    setLoading(true)
    try {
      const url = type === 'all'
        ? `${API}/api/creations/videos`
        : `${API}/api/creations/videos?type=${type}`
      const r = await fetch(url)
      const d = await r.json()
      setVideos(d.videos || [])
    } catch {
      setError('Erreur lors du chargement des vidéos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleVideoFilter = (f) => {
    setVideoFilter(f)
    fetchVideos(f === 'all' ? 'all' : f)
  }

  const deleteVideo = async (publicId) => {
    try {
      const r = await fetch(`${API}/api/creations/video/${encodeURIComponent(publicId)}`, { method: 'DELETE' })
      if (r.ok) setVideos(vs => vs.filter(v => v.public_id !== publicId))
    } catch (e) { console.error(e) }
  }

  const deleteImage = async (publicId) => {
    try {
      const r = await fetch(`${API}/api/creations/image/${encodeURIComponent(publicId)}`, { method: 'DELETE' })
      if (r.ok) setImages(imgs => imgs.filter(i => i.public_id !== publicId))
    } catch (e) { console.error(e) }
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Mes Créations</h1>
            <p className="page-subtitle">Galerie Cloudinary — vidéos et images générées</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {connected !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: connected ? 'var(--success)' : 'var(--error)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? 'var(--success)' : 'var(--error)' }} />
                {connected ? 'Cloudinary connecté' : 'Déconnecté'}
              </div>
            )}
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 14px' }} onClick={fetchAll}>
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <StatsBar stats={stats} />

      <div className="tabs">
        {[
          { id: 'videos', label: `Vidéos${videos.length ? ` (${videos.length})` : ''}` },
          { id: 'images', label: `Images${images.length ? ` (${images.length})` : ''}` },
        ].map(t => (
          <button
            key={t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="validation-msg warn" style={{ marginBottom: 24 }}>{error}</div>
      )}

      {tab === 'videos' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {VIDEO_FILTERS.map(f => (
              <button
                key={f.value}
                className={`btn ${videoFilter === f.value ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 11, padding: '6px 14px' }}
                onClick={() => handleVideoFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="progress-track" style={{ maxWidth: 200 }}>
              <div className="progress-fill indeterminate" />
            </div>
          ) : videos.length === 0 ? (
            <div className="empty-state">
              <p>Aucune vidéo trouvée sur Cloudinary.</p>
            </div>
          ) : (
            <div className="preset-grid">
              {videos.map(v => <VideoCard key={v.public_id} video={v} projects={projects} onDelete={() => deleteVideo(v.public_id)} />)}
            </div>
          )}
        </>
      )}

      {tab === 'images' && (
        <>
          {loading ? (
            <div className="progress-track" style={{ maxWidth: 200 }}>
              <div className="progress-fill indeterminate" />
            </div>
          ) : images.length === 0 ? (
            <div className="empty-state">
              <p>Aucune image trouvée sur Cloudinary.</p>
            </div>
          ) : (
            <div className="preset-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {images.map(img => <ImageCard key={img.public_id} image={img} projects={projects} onDelete={() => deleteImage(img.public_id)} />)}
            </div>
          )}
        </>
      )}
    </>
  )
}
