import { useState, useEffect, useRef, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Assign to Project Modal ───────────────────

function AssignModal({ item, projects, onAssign, onClose }) {
  const [selectedProject, setSelectedProject] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [done, setDone] = useState(false)

  const handleAssign = async () => {
    if (!selectedProject) return
    setAssigning(true)
    try {
      await fetch(`${API}/api/projects/${selectedProject}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id:     item.public_id,
          url:           item.url,
          resource_type: item.resource_type,
          media_type:    'inspiration',
          label:         item.label,
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
        padding: 24, minWidth: 320, maxWidth: 420,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Assigner au projet</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
          "{item.label}" sera ajouté aux médias du projet sélectionné.
        </div>

        {projects.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 20 }}>
            Aucun projet disponible. Créez d'abord un projet en Mode Projet.
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                style={{
                  padding: '10px 12px', marginBottom: 6, borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${selectedProject === p.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: selectedProject === p.id ? 'var(--accent-dim)' : 'var(--bg-3)',
                  cursor: 'pointer', fontSize: 13,
                  color: selectedProject === p.id ? 'var(--text)' : 'var(--text-2)',
                }}
              >
                {p.name}
              </div>
            ))}
          </div>
        )}

        {done ? (
          <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>✓ Assigné</div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '7px 18px' }}
              onClick={handleAssign}
              disabled={!selectedProject || assigning || projects.length === 0}
            >
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


// ── Inspiration Card ──────────────────────────

function InspirationCard({ item, projects, onDelete }) {
  const [showAssign, setShowAssign] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`${API}/api/inspirations/${item.public_id}`, { method: 'DELETE' })
    if (onDelete) onDelete(item.public_id)
  }

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Preview */}
        <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg-3)', overflow: 'hidden' }}>
          {item.resource_type === 'video' ? (
            <video
              src={item.url}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted
              onMouseEnter={e => e.target.play()}
              onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0 }}
            />
          ) : (
            <img
              src={item.url}
              alt={item.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          )}
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 7px',
            fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {item.resource_type === 'video' ? 'Vidéo' : 'Image'}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 10, padding: '4px 10px', flex: 1 }}
              onClick={() => setShowAssign(true)}
            >
              → Projet
            </button>

            {confirmDel ? (
              <>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 10, padding: '4px 8px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? '…' : 'Oui'}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 10, padding: '4px 8px' }}
                  onClick={() => setConfirmDel(false)}
                >
                  Non
                </button>
              </>
            ) : (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 10, padding: '4px 8px', color: 'var(--accent)' }}
                onClick={() => setConfirmDel(true)}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {showAssign && (
        <AssignModal
          item={item}
          projects={projects}
          onAssign={() => {}}
          onClose={() => setShowAssign(false)}
        />
      )}
    </>
  )
}


// ── Upload Zone ───────────────────────────────

function UploadZone({ onUploaded }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState([])
  const inputRef = useRef(null)

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return
    setUploading(true)
    const results = []

    for (const file of Array.from(files)) {
      setProgress(p => [...p, { name: file.name, status: 'uploading' }])
      const fd = new FormData()
      fd.append('file', file)
      fd.append('label', file.name.replace(/\.[^.]+$/, ''))

      try {
        const r = await fetch(`${API}/api/inspirations`, { method: 'POST', body: fd })
        const d = await r.json()
        if (r.ok) {
          results.push(d)
          setProgress(p => p.map(x => x.name === file.name ? { ...x, status: 'done' } : x))
        } else {
          setProgress(p => p.map(x => x.name === file.name ? { ...x, status: 'error' } : x))
        }
      } catch {
        setProgress(p => p.map(x => x.name === file.name ? { ...x, status: 'error' } : x))
      }
    }

    if (results.length > 0 && onUploaded) onUploaded(results)
    setTimeout(() => { setProgress([]); setUploading(false) }, 1500)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    uploadFiles(e.dataTransfer.files)
  }, [])

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '28px 20px',
        textAlign: 'center',
        cursor: uploading ? 'default' : 'pointer',
        background: dragOver ? 'var(--accent-dim)' : 'transparent',
        transition: 'all 150ms ease',
        marginBottom: 32,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={e => uploadFiles(e.target.files)}
      />

      {uploading ? (
        <div>
          {progress.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{f.name}</span>
              <span style={{
                fontSize: 10, padding: '1px 7px', borderRadius: 'var(--radius-pill)',
                background: f.status === 'done' ? 'var(--success-dim)' : f.status === 'error' ? 'rgba(239,68,68,0.1)' : 'var(--bg-3)',
                color: f.status === 'done' ? 'var(--success)' : f.status === 'error' ? 'var(--error)' : 'var(--text-3)',
              }}>
                {f.status === 'done' ? '✓' : f.status === 'error' ? '✕' : '…'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>↑</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
            Déposez vos images ou vidéos ici
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            ou cliquez pour sélectionner — JPG, PNG, MP4, MOV…
          </div>
        </>
      )}
    </div>
  )
}


// ── Main Page ─────────────────────────────────

export default function Inspirations() {
  const [inspirations, setInspirations] = useState([])
  const [projects, setProjects]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [ri, rp] = await Promise.all([
        fetch(`${API}/api/inspirations`),
        fetch(`${API}/api/projects`),
      ])
      const di = await ri.json()
      const dp = await rp.json()
      setInspirations(di.inspirations || [])
      setProjects(dp.projects || [])
    } catch (e) {
      setError('Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleUploaded = (newItems) => {
    setInspirations(prev => [...newItems, ...prev])
  }

  const handleDelete = (publicId) => {
    setInspirations(prev => prev.filter(i => i.public_id !== publicId))
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Inspirations</h1>
        <p className="page-subtitle">Références visuelles — uploadez des images ou vidéos, puis assignez-les à un projet</p>
      </div>

      <UploadZone onUploaded={handleUploaded} />

      {loading ? (
        <div className="progress-track" style={{ maxWidth: 200 }}>
          <div className="progress-fill indeterminate" />
        </div>
      ) : error ? (
        <div className="validation-msg warn">{error}</div>
      ) : inspirations.length === 0 ? (
        <div className="empty-state">
          <p>Aucune inspiration. Commencez par uploader des images ou vidéos de référence.</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
            {inspirations.length} inspiration{inspirations.length > 1 ? 's' : ''}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 16,
          }}>
            {inspirations.map(item => (
              <InspirationCard
                key={item.public_id}
                item={item}
                projects={projects}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
