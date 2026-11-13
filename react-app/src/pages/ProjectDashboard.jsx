import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Hls from 'hls.js'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// URL valide = sur Cloudinary. Les anciens chemins locaux (/api/serve/...) sont cassés.
function isCloudinaryUrl(url) {
  return !!url && url.includes('cloudinary.com')
}

function getCloudinaryThumb(url) {
  if (!url?.includes('cloudinary.com')) return url
  return url.replace('/image/upload/', '/image/upload/c_fill,h_300,w_300/')
}

function getCloudinaryVideoUrl(url) {
  if (!url?.includes('cloudinary.com')) return url
  return url.replace('/video/upload/', '/video/upload/f_mp4,vc_h264,q_auto/')
}

function getCloudinaryHlsUrl(url) {
  if (!url?.includes('cloudinary.com')) return null
  return url
    .replace('/video/upload/', '/video/upload/sp_auto/')
    .replace(/\.[^/.]+$/, '.m3u8')
}

function VideoPlayer({ src, style, controls, muted, onMouseEnter, onMouseLeave }) {
  const [erreur, setErreur] = useState(false)
  if (!src || erreur) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-3)', color: 'var(--text-3)', fontSize: 11, textAlign: 'center', padding: 8 }}>
        Vidéo non disponible
      </div>
    )
  }
  return (
    <video style={style} controls={controls} muted={muted} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <source src={getCloudinaryVideoUrl(src)} type="video/mp4" onError={() => setErreur(true)} />
    </video>
  )
}

// ── Helpers ───────────────────────────────────

// Convertit un code hex en nom de couleur descriptif pour les prompts IA
function hexToColorName(hex) {
  if (!hex || hex.length < 7) return ''
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
  }
  h = Math.round(h * 360)
  s = Math.round(s * 100)
  const lp = Math.round(l * 100)
  if (s < 12) {
    if (lp < 15) return 'black'
    if (lp > 88) return 'white'
    if (lp < 40) return 'dark gray'
    if (lp > 65) return 'light gray'
    return 'gray'
  }
  const mod = lp < 18 ? 'deep ' : lp < 33 ? 'dark ' : lp > 82 ? 'bright ' : lp > 68 ? 'light ' : lp > 58 ? 'pale ' : ''
  const hue =
    h < 15 || h >= 345 ? 'red' : h < 30 ? 'vermilion' : h < 50 ? 'orange' : h < 65 ? 'amber' :
    h < 80 ? 'yellow' : h < 130 ? 'green' : h < 155 ? 'emerald' : h < 175 ? 'teal' :
    h < 195 ? 'cyan' : h < 220 ? 'sky blue' : h < 250 ? 'blue' : h < 265 ? 'indigo' :
    h < 285 ? 'violet' : h < 310 ? 'purple' : h < 330 ? 'magenta' : 'rose'
  return `${mod}${hue}`
}

// Construit le suffixe palette couleur 60/30/10
function buildColorSuffix(direction) {
  const { color_dominant, color_secondary, color_accent } = direction || {}
  if (!color_dominant && !color_secondary && !color_accent) return ''
  const parts = []
  if (color_dominant)  parts.push(`${hexToColorName(color_dominant)} ${color_dominant} (60%)`)
  if (color_secondary) parts.push(`${hexToColorName(color_secondary)} ${color_secondary} (30%)`)
  if (color_accent)    parts.push(`${hexToColorName(color_accent)} ${color_accent} (10%)`)
  return `color grading: ${parts.join(' · ')}`
}

// Construit le suffixe DA à ajouter à n'importe quel prompt
function buildDASuffix(direction) {
  return [
    direction.colorimetry,
    direction.ambiance,
    direction.camera,
    buildColorSuffix(direction),
  ].filter(Boolean).join(', ')
}

// Construit un prompt complet en ajoutant la DA
function withDA(userPrompt, direction) {
  const suffix = buildDASuffix(direction)
  return [userPrompt.trim(), suffix].filter(Boolean).join(', ')
}

// Ajoute automatiquement un média généré aux Médias du projet
async function addToProjectMedia(projectId, { url, resource_type, label }) {
  try {
    const public_id = `local/${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    await fetch(`${API}/api/projects/${projectId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id, url, resource_type, media_type: 'creation', label }),
    })
  } catch { /* silently ignore — ne bloque pas le flux */ }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }) {
  const map = {
    pending:     { label: 'En attente', color: 'var(--text-3)', bg: 'var(--bg-3)' },
    in_progress: { label: 'En cours…',  color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)' },
    completed:   { label: 'Terminé',    color: 'var(--success)', bg: 'var(--success-dim)' },
    failed:      { label: 'Échoué',     color: 'var(--error)',   bg: 'rgba(239,68,68,0.1)' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{
      fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--radius-pill)',
      color: s.color, background: s.bg, letterSpacing: '0.05em',
    }}>
      {s.label}
    </span>
  )
}


// ── Mode Selection Modal ──────────────────────

function ModeSelectionModal({ onSelect, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: 32, maxWidth: 500, width: '92%',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nouvelle évolution</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 28 }}>
          Choisissez le mode de travail pour cette évolution
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
          <button
            onClick={() => onSelect('pipeline')}
            style={{
              background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: '20px 16px', textAlign: 'left', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 10,
              transition: 'border-color 150ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: 22, opacity: 0.6 }}>⊞</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Pipeline auto</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Les 3 étapes s'enchaînent automatiquement après un seul clic. Option : image de référence pour l'étape 1.
            </div>
          </button>

          <button
            onClick={() => onSelect('manual')}
            style={{
              background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: '20px 16px', textAlign: 'left', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 10,
              transition: 'border-color 150ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: 22, opacity: 0.6 }}>◈</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Manuel</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Contrôlez chaque étape indépendamment. Choisissez l'image et la vidéo source à chaque étape.
            </div>
          </button>
        </div>

        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  )
}


// ── Media Picker Modal ────────────────────────

function MediaPickerModal({ projectId, type = 'image', onSelect, onClose }) {
  const [tab, setTab]               = useState('ordi')
  const [projectMedia, setProjectMedia] = useState([])
  const [creations, setCreations]   = useState([])
  const [loading, setLoading]       = useState(false)
  const [dragOver, setDragOver]     = useState(false)
  const inputRef                    = useRef(null)

  useEffect(() => {
    if (tab === 'projet')     loadProjectMedia()
    if (tab === 'creations')  loadCreations()
  }, [tab])

  const loadProjectMedia = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/projects/${projectId}/media`)
      const d = await r.json()
      setProjectMedia((d.media || []).filter(m => m.resource_type === type))
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const loadCreations = async () => {
    setLoading(true)
    try {
      const endpoint = type === 'video'
        ? `${API}/api/creations/videos`
        : `${API}/api/creations/images`
      const r = await fetch(endpoint)
      const d = await r.json()
      setCreations(type === 'video' ? (d.videos || []) : (d.images || []))
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const handleFile = (file) => {
    const url = URL.createObjectURL(file)
    onSelect({ url, source: 'local', file, resource_type: type })
    onClose()
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const TABS = [
    { key: 'ordi',      label: "Depuis l'ordi" },
    { key: 'projet',    label: 'Médias du projet' },
    { key: 'creations', label: 'Mes Créations' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        width: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            Choisir {type === 'video' ? 'une vidéo' : 'une image'}
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 12px' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, padding: '11px 10px', marginRight: 4,
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t.key ? 'var(--text)' : 'var(--text-3)',
                transition: 'color 150ms ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {tab === 'ordi' && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '48px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'var(--accent-dim)' : 'transparent',
                transition: 'all 150ms ease',
              }}
            >
              <input
                ref={inputRef} type="file" style={{ display: 'none' }}
                accept={type === 'video' ? 'video/*' : 'image/*'}
                onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }}
              />
              <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 12 }}>↑</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
                Déposez {type === 'video' ? 'une vidéo' : 'une image'} ici
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                ou cliquez pour sélectionner
              </div>
            </div>
          )}

          {(tab === 'projet' || tab === 'creations') && (
            loading ? (
              <div className="progress-track" style={{ maxWidth: 160, margin: '30px auto' }}>
                <div className="progress-fill indeterminate" />
              </div>
            ) : (() => {
              const items = tab === 'projet' ? projectMedia : creations
              if (items.length === 0) return (
                <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '40px 20px', fontStyle: 'italic' }}>
                  Aucun{type === 'video' ? 'e vidéo' : 'e image'} disponible dans cette source.
                </div>
              )
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                  {items.map((item, idx) => {
                    const url = item.url
                    const label = item.label || item.filename || item.public_id?.split('/').pop() || '—'
                    const isVideo = item.resource_type === 'video' || type === 'video'
                    return (
                      <div
                        key={item.public_id || idx}
                        onClick={() => { onSelect({ url, source: 'cloud', item, resource_type: type }); onClose() }}
                        style={{
                          cursor: 'pointer', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                          border: '1px solid var(--border)', background: 'var(--bg-3)',
                          transition: 'border-color 150ms ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ aspectRatio: '1/1', overflow: 'hidden' }}>
                          {isVideo ? (
                            <VideoPlayer src={url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          )}
                        </div>
                        <div style={{ padding: '4px 6px', fontSize: 9, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()
          )}
        </div>
      </div>
    </div>
  )
}


// ── MediaPreview (inline thumbnail + change button) ──

function MediaPreview({ media, onRemove, label = 'Source', type = 'image' }) {
  const isVideo = type === 'video' || media.resource_type === 'video'
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 'var(--radius-sm)', overflow: 'hidden',
          background: 'var(--bg-3)', border: '1px solid var(--border)', flexShrink: 0,
        }}>
          {isVideo ? (
            <VideoPlayer src={media.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <img src={media.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 10, padding: '4px 10px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
          onClick={onRemove}
        >
          Changer ↔
        </button>
      </div>
    </div>
  )
}


// ── DA Tooltip ────────────────────────────────

const DA_INFO = {
  colorimetry: {
    hint: 'Lumière, palette, contraste',
    steps: [
      { n: '1', label: 'Image', how: 'ajouté au prompt Flux' },
      { n: '2', label: 'Vidéo', how: 'ajouté au prompt Kling' },
      { n: '3', label: 'Extend', how: 'ajouté au continuation prompt' },
    ],
  },
  ambiance: {
    hint: 'Atmosphère, émotion, style',
    steps: [
      { n: '1', label: 'Image', how: 'ajouté au prompt Flux' },
      { n: '2', label: 'Vidéo', how: 'ajouté au prompt Kling' },
      { n: '3', label: 'Extend', how: 'ajouté au continuation prompt' },
    ],
  },
  camera: {
    hint: 'Mouvement, cadrage, optique',
    steps: [
      { n: '1', label: 'Image', how: 'cadrage / point de vue' },
      { n: '2', label: 'Vidéo', how: 'ajouté au prompt Kling' },
      { n: '3', label: 'Extend', how: 'ajouté au continuation prompt' },
    ],
  },
  colors_60_30_10: {
    hint: 'Palette 60/30/10 — dominante · secondaire · accent',
    steps: [
      { n: '1', label: 'Image', how: 'injecté dans le prompt Flux' },
      { n: '2', label: 'Vidéo', how: 'injecté dans le prompt Kling' },
      { n: '3', label: 'Extend', how: 'injecté dans le continuation prompt' },
    ],
    note: 'Génère automatiquement : "cinematic color palette (60/30/10 rule): dominant … · secondary … · accent …"',
  },
  negative_prompt: {
    hint: 'Ce que l\'on veut exclure',
    steps: [
      { n: '2', label: 'Vidéo', how: 'champ negative_prompt Kling' },
    ],
    note: 'Non supporté par Flux ni par l\'API extend',
  },
  default_image_prompt: {
    hint: 'Pré-remplit le prompt à l\'ouverture',
    steps: [
      { n: '1', label: 'Image', how: 'valeur initiale du champ' },
    ],
  },
  default_motion_prompt: {
    hint: 'Pré-remplit le prompt à l\'ouverture',
    steps: [
      { n: '2', label: 'Vidéo', how: 'valeur initiale du champ' },
    ],
  },
  default_extend_prompt: {
    hint: 'Pré-remplit le prompt à l\'ouverture',
    steps: [
      { n: '3', label: 'Extend', how: 'valeur initiale du champ' },
    ],
  },
}

function DaTooltip({ fieldKey }) {
  const [visible, setVisible] = useState(false)
  const info = DA_INFO[fieldKey]
  if (!info) return null

  const STEP_COLORS = { '1': '#818cf8', '2': '#34d399', '3': '#fb923c' }

  return (
    <span style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle', marginLeft: 5 }}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, borderRadius: '50%',
          border: '1px solid var(--text-3)', color: 'var(--text-3)',
          fontSize: 9, fontWeight: 700, cursor: 'default',
          lineHeight: 1, userSelect: 'none', letterSpacing: 0,
        }}
      >
        i
      </span>

      {visible && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 'calc(100% + 8px)',
          transform: 'translateX(-50%)',
          background: 'var(--bg-1, #111)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 12px',
          width: 230, zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}>
          {/* Hint */}
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 8, fontStyle: 'italic' }}>
            {info.hint}
          </div>

          {/* Pipeline visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: info.note ? 8 : 0 }}>
            {['1', '2', '3'].map((n, i) => {
              const used = info.steps.find(s => s.n === n)
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && (
                    <div style={{ width: 14, height: 1, background: used ? STEP_COLORS[n] : 'var(--border)' }} />
                  )}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                      background: used ? STEP_COLORS[n] + '22' : 'var(--bg-3)',
                      border: `1px solid ${used ? STEP_COLORS[n] : 'var(--border)'}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 1,
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: used ? STEP_COLORS[n] : 'var(--text-3)' }}>
                        {n}
                      </span>
                    </div>
                    <div style={{ fontSize: 8, color: used ? 'var(--text-2)' : 'var(--text-3)', opacity: used ? 1 : 0.4 }}>
                      {used ? used.label : ['Img', 'Vidéo', 'Ext'][i]}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* How it's used per step */}
          {info.steps.map(s => (
            <div key={s.n} style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 4 }}>
              <span style={{ color: STEP_COLORS[s.n], fontWeight: 600 }}>Ét. {s.n}</span> — {s.how}
            </div>
          ))}

          {/* Note */}
          {info.note && (
            <div style={{
              fontSize: 9, color: 'var(--text-3)', marginTop: 6, paddingTop: 6,
              borderTop: '1px solid var(--border)', fontStyle: 'italic',
            }}>
              {info.note}
            </div>
          )}

          {/* Arrow */}
          <div style={{
            position: 'absolute', left: '50%', bottom: -5, transform: 'translateX(-50%) rotate(45deg)',
            width: 8, height: 8, background: 'var(--bg-1, #111)', border: '1px solid var(--border)',
            borderTop: 'none', borderLeft: 'none',
          }} />
        </div>
      )}
    </span>
  )
}


// ── Direction Panel ───────────────────────────

function DirectionPanel({ direction, projectId, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ ...direction })
  const [saving, setSaving]   = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: null, direction: form })
      })
      if (r.ok) { setEditing(false); if (onSaved) onSaved() }
    } finally { setSaving(false) }
  }

  const rows = [
    { key: 'colorimetry',           label: 'Colorimétrie' },
    { key: 'ambiance',              label: 'Ambiance' },
    { key: 'camera',                label: 'Caméra' },
    { key: 'negative_prompt',       label: 'Prompt négatif' },
    { key: 'default_image_prompt',  label: 'Prompt image (défaut)' },
    { key: 'default_motion_prompt', label: 'Prompt mouvement (défaut)' },
    { key: 'default_extend_prompt', label: 'Prompt extension (défaut)' },
  ]

  return (
    <div className="card" style={{ padding: 20, marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editing ? 20 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Direction artistique
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: '4px 12px' }}
          onClick={() => { setForm({ ...direction }); setEditing(v => !v) }}
        >
          {editing ? 'Annuler' : 'Modifier'}
        </button>
      </div>

      {!editing ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
          {/* Palette 60/30/10 en lecture */}
          {(direction.color_dominant || direction.color_secondary || direction.color_accent) && (
            <div style={{ width: '100%' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center' }}>
                Palette 60/30/10
                <DaTooltip fieldKey="colors_60_30_10" />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {[
                  { key: 'color_dominant',  label: '60%' },
                  { key: 'color_secondary', label: '30%' },
                  { key: 'color_accent',    label: '10%' },
                ].map(({ key, label }) => direction[key] ? (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: direction[key], border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-3)', lineHeight: 1 }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'monospace' }}>{direction[key]}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{hexToColorName(direction[key])}</div>
                    </div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}
          {rows.filter(r => direction[r.key]).map(r => (
            <div key={r.key} style={{ flex: '1', minWidth: 200 }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center' }}>
                {r.label}
                <DaTooltip fieldKey={r.key} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{direction[r.key]}</div>
            </div>
          ))}
          {rows.every(r => !direction[r.key]) && !direction.color_dominant && !direction.color_secondary && !direction.color_accent && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
              Aucune direction définie — cliquez sur Modifier pour renseigner la direction artistique.
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Palette 60/30/10 en édition */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--text-2)', marginBottom: 8 }}>
              Palette 60 / 30 / 10
              <DaTooltip fieldKey="colors_60_30_10" />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { key: 'color_dominant',  pct: '60%', label: 'Dominante' },
                { key: 'color_secondary', pct: '30%', label: 'Secondaire' },
                { key: 'color_accent',    pct: '10%', label: 'Accent' },
              ].map(({ key, pct, label }) => (
                <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{pct}</span> {label}
                  </div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    {/* Swatch cliquable qui ouvre le color picker natif */}
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <div style={{
                        width: '100%', height: 44, borderRadius: 8,
                        background: form[key] || 'var(--bg-3)',
                        border: '2px solid var(--border)',
                        transition: 'border-color 120ms',
                        minWidth: 60,
                      }} />
                      <input
                        type="color"
                        value={form[key] || '#000000'}
                        onChange={e => set(key, e.target.value)}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      />
                    </label>
                    {/* Hex input */}
                    <input
                      type="text"
                      value={form[key] || ''}
                      onChange={e => {
                        const v = e.target.value
                        if (v === '' || /^#[0-9A-Fa-f]{0,6}$/.test(v)) set(key, v)
                      }}
                      placeholder="#000000"
                      maxLength={7}
                      style={{
                        width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '5px 6px',
                        fontSize: 11, fontFamily: 'monospace', textAlign: 'center',
                      }}
                    />
                    {form[key] && form[key].length === 7 && (
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{hexToColorName(form[key])}</div>
                    )}
                    {form[key] && (
                      <button
                        onClick={() => set(key, '')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-3)', padding: 0 }}
                      >✕ effacer</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {(form.color_dominant || form.color_secondary || form.color_accent) && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace', lineHeight: 1.6 }}>
                {buildColorSuffix(form)}
              </div>
            )}
          </div>

          {rows.map(r => (
            <div key={r.key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>
                {r.label}
                <DaTooltip fieldKey={r.key} />
              </label>
              <textarea
                value={form[r.key] || ''}
                onChange={e => set(r.key, e.target.value)}
                rows={2}
                style={{
                  width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '8px 10px',
                  fontSize: 12, fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </div>
          ))}
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 18px' }} onClick={save} disabled={saving}>
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      )}
    </div>
  )
}


// ── Step: Image ───────────────────────────────
// Manual mode — with optional reference image picker

function StepImage({ step, evoId, projectId, direction, onDone }) {
  const [prompt, setPrompt]           = useState(step.prompt || direction.default_image_prompt || '')
  const [size, setSize]               = useState('1024x1024')
  const [running, setRunning]         = useState(false)
  const [err, setErr]                 = useState('')
  const [refImage, setRefImage]       = useState(null)
  const [showPicker, setShowPicker]   = useState(false)
  const [showRefSection, setShowRefSection] = useState(false)
  const pollRef                       = useRef(null)

  const SIZES = [
    { label: '1024×1024', value: '1024x1024', w: 1024, h: 1024 },
    { label: '1024×768',  value: '1024x768',  w: 1024, h: 768  },
    { label: '768×1024',  value: '768x1024',  w: 768,  h: 1024 },
  ]
  const sel = SIZES.find(s => s.value === size)

  const saveStep = async (patch) => {
    await fetch(`${API}/api/projects/${projectId}/evolution/${evoId}/step/image`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
    })
    if (onDone) onDone()
  }

  // Use reference image directly (skip Flux generation)
  const useRefDirectly = async () => {
    if (!refImage) return
    setRunning(true)
    await saveStep({
      status: 'completed', url: refImage.url, local_path: null,
      prompt: '(image de référence)', completed_at: new Date().toISOString(),
    })
    await addToProjectMedia(projectId, { url: refImage.url, resource_type: 'image', label: 'image de référence' })
    setRunning(false)
  }

  const launch = async () => {
    if (!prompt.trim()) return
    setRunning(true); setErr('')
    await saveStep({ status: 'in_progress', prompt: prompt.trim() })

    try {
      const body = new FormData()
      body.append('prompt', withDA(prompt, direction))
      body.append('model', 'flux-schnell')
      body.append('width', sel.w)
      body.append('height', sel.h)
      if (refImage) body.append('reference_url', refImage.url)

      const r = await fetch(`${API}/api/generate-image`, { method: 'POST', body })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur API')

      await saveStep({ job_id: d.job_id })
      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`${API}/api/job/${d.job_id}`)
          const pd = await pr.json()
          if (pd.status === 'completed') {
            clearInterval(pollRef.current)
            const lp = pd.image_path
            const url = pd.image_url  // uniquement URL Cloudinary — jamais de chemin local
            await saveStep({ status: 'completed', local_path: lp, url: url || null, completed_at: new Date().toISOString() })
            if (url) await addToProjectMedia(projectId, { url, resource_type: 'image', label: lp ? lp.split('/').pop() : 'image' })
            setRunning(false)
          } else if (pd.status === 'failed') {
            clearInterval(pollRef.current)
            await saveStep({ status: 'failed' })
            setErr(pd.error || 'Génération échouée'); setRunning(false)
          }
        } catch { clearInterval(pollRef.current); await saveStep({ status: 'failed' }); setErr('Erreur réseau'); setRunning(false) }
      }, 3000)
    } catch (e) { await saveStep({ status: 'failed' }); setErr(e.message); setRunning(false) }
  }

  const reset = async () => {
    setErr(''); setRunning(false)
    if (pollRef.current) clearInterval(pollRef.current)
    await saveStep({ status: 'pending', local_path: null, url: null, job_id: null, completed_at: null })
  }

  if (step.status === 'completed') {
    const validUrl = isCloudinaryUrl(step.url) ? step.url : null
    return (
      <div>
        <div style={{ aspectRatio: '1/1', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 10, maxWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {validUrl
            ? <img src={validUrl} alt="generated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', padding: 8 }}>Non disponible sur Cloudinary</span>
          }
        </div>
        {step.prompt && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, fontStyle: 'italic' }}>"{step.prompt}"</div>}
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 12px', color: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={reset}>
          Regénérer
        </button>
      </div>
    )
  }

  if (step.status === 'in_progress' || running) {
    return (
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>Génération en cours…</div>
        <div className="progress-track" style={{ maxWidth: 160 }}><div className="progress-fill indeterminate" /></div>
      </div>
    )
  }

  return (
    <div>
      {/* Reference image section */}
      <div style={{ marginBottom: 14 }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 10, padding: '4px 10px', marginBottom: showRefSection && refImage ? 10 : 0 }}
          onClick={() => { setShowRefSection(v => !v); if (!showRefSection) setShowPicker(true) }}
        >
          {refImage ? '◈ Référence sélectionnée' : '+ Image de référence (optionnel)'}
        </button>

        {refImage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <div style={{ width: 50, height: 50, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-3)', flexShrink: 0 }}>
              <img src={refImage.url} alt="ref" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <button
                className="btn btn-primary"
                style={{ fontSize: 10, padding: '3px 10px' }}
                onClick={useRefDirectly}
                disabled={running}
              >
                Utiliser directement →
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 10, padding: '3px 10px' }}
                onClick={() => setShowPicker(true)}
              >
                Changer ↔
              </button>
            </div>
            <button
              style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
              onClick={() => { setRefImage(null); setShowRefSection(false) }}
            >✕</button>
          </div>
        )}
      </div>

      {/* Flux generation form */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Prompt sujet</label>
        <textarea
          value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
          placeholder="Décrivez le sujet / la scène…"
          style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '8px 10px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical' }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Format</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {SIZES.map(s => (
            <button key={s.value} className={`btn ${size === s.value ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setSize(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {err && <div className="validation-msg warn" style={{ marginBottom: 10, fontSize: 11 }}>{err}</div>}
      <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 16px' }} onClick={launch} disabled={!prompt.trim() || running}>
        Générer l'image →
      </button>
      {buildDASuffix(direction) && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8 }}>
          + DA : {buildDASuffix(direction).slice(0, 80)}{buildDASuffix(direction).length > 80 ? '…' : ''}
        </div>
      )}

      {showPicker && (
        <MediaPickerModal
          projectId={projectId} type="image"
          onSelect={(media) => { setRefImage(media); setShowRefSection(true) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}


// ── Step: Image → Vidéo ──────────────────────
// Manual mode — with optional source image override

function StepImgToVideo({ step, imageStep, evoId, projectId, direction, onDone }) {
  const [prompt, setPrompt]           = useState(step.prompt || direction.default_motion_prompt || '')
  const [duration, setDuration]       = useState(5)
  const [mode, setMode]               = useState('professional')
  const [modelVer, setModelVer]       = useState('2.5')
  const [ratio, setRatio]             = useState('16:9')
  const [running, setRunning]         = useState(false)
  const [err, setErr]                 = useState('')
  const [sourceOverride, setSourceOverride] = useState(null)
  const [showPicker, setShowPicker]   = useState(false)
  const pollRef                       = useRef(null)

  const defaultImageUrl = imageStep?.status === 'completed' ? imageStep.url : null
  const effectiveSource = sourceOverride?.url || defaultImageUrl
  const hasSource       = !!effectiveSource

  const saveStep = async (patch) => {
    await fetch(`${API}/api/projects/${projectId}/evolution/${evoId}/step/img2video`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
    })
    if (onDone) onDone()
  }

  const launch = async () => {
    if (!hasSource) return
    setRunning(true); setErr('')
    await saveStep({ status: 'in_progress', prompt: prompt.trim() || null })

    try {
      const imgResp = await fetch(effectiveSource)
      const imgBlob = await imgResp.blob()
      const imgFile = new File([imgBlob], 'source.jpg', { type: imgBlob.type || 'image/jpeg' })

      const body = new FormData()
      body.append('image', imgFile)
      body.append('prompt', withDA(prompt, direction) || 'Cinematic movement')
      body.append('duration', duration)
      body.append('aspect_ratio', ratio)
      body.append('mode', mode)
      body.append('model_version', modelVer)
      if (direction.negative_prompt) body.append('negative_prompt', direction.negative_prompt)

      const r = await fetch(`${API}/api/image-to-video`, { method: 'POST', body })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur API')

      await saveStep({ task_id: d.task_id })
      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`${API}/api/task/${d.task_id}`)
          const pd = await pr.json()
          if (pd.status === 'completed' && pd.video_url) {
            clearInterval(pollRef.current)
            await saveStep({ status: 'completed', url: pd.video_url, completed_at: new Date().toISOString() })
            await addToProjectMedia(projectId, { url: pd.video_url, resource_type: 'video', label: 'img2video' })
            setRunning(false)
          } else if (pd.status === 'failed') {
            clearInterval(pollRef.current)
            await saveStep({ status: 'failed' })
            setErr('Tâche Kling échouée'); setRunning(false)
          }
        } catch { clearInterval(pollRef.current); await saveStep({ status: 'failed' }); setErr('Erreur réseau'); setRunning(false) }
      }, 5000)
    } catch (e) { await saveStep({ status: 'failed' }); setErr(e.message); setRunning(false) }
  }

  const reset = async () => {
    setErr(''); setRunning(false)
    if (pollRef.current) clearInterval(pollRef.current)
    await saveStep({ status: 'pending', task_id: null, url: null, completed_at: null })
  }

  if (step.status === 'completed' && step.url) {
    return (
      <div>
        <VideoPlayer src={step.url} controls style={{ width: '100%', maxWidth: 240, borderRadius: 'var(--radius-sm)', marginBottom: 10, display: 'block' }} />
        {step.prompt && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, fontStyle: 'italic' }}>"{step.prompt}"</div>}
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 12px', color: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={reset}>
          Regénérer
        </button>
      </div>
    )
  }

  if (step.status === 'in_progress' || running) {
    return (
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>Kling en cours… (1–3 min)</div>
        <div className="progress-track" style={{ maxWidth: 160 }}><div className="progress-fill indeterminate" /></div>
      </div>
    )
  }

  return (
    <div>
      {/* Source image */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Image source</label>
        {effectiveSource ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-3)', border: '1px solid var(--border)', flexShrink: 0 }}>
              <img src={effectiveSource} alt="source" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 10px' }} onClick={() => setShowPicker(true)}>
                {sourceOverride ? 'Changer ↔' : 'Remplacer la source'}
              </button>
              {sourceOverride && (
                <button style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '0 2px' }}
                  onClick={() => setSourceOverride(null)}>
                  ↩ Reprendre étape 1
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 8 }}>
              Attendez la fin de l'étape Image, ou choisissez une source.
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setShowPicker(true)}>
              Choisir une image source →
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Prompt mouvement</label>
        <textarea
          value={prompt} onChange={e => setPrompt(e.target.value)} rows={2}
          placeholder="ex. slow camera push, gentle sway…" disabled={!hasSource}
          style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '8px 10px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', opacity: hasSource ? 1 : 0.5 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {[5, 10].map(d => (
          <button key={d} className={`btn ${duration === d ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setDuration(d)} disabled={!hasSource}>{d}s</button>
        ))}
        {['16:9', '9:16', '1:1'].map(r => (
          <button key={r} className={`btn ${ratio === r ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setRatio(r)} disabled={!hasSource}>{r}</button>
        ))}
        {['2.5', '2.0'].map(v => (
          <button key={v} className={`btn ${modelVer === v ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setModelVer(v)} disabled={!hasSource}>v{v}</button>
        ))}
      </div>
      {err && <div className="validation-msg warn" style={{ marginBottom: 10, fontSize: 11 }}>{err}</div>}
      <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 16px' }} onClick={launch} disabled={!hasSource || running}>
        Animer →
      </button>

      {showPicker && (
        <MediaPickerModal
          projectId={projectId} type="image"
          onSelect={(media) => setSourceOverride(media)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}


// ── Step: Extend ─────────────────────────────
// Manual mode — with optional source video override

function StepExtend({ step, videoStep, evoId, projectId, direction, onDone }) {
  const [prompt, setPrompt]           = useState(step.prompt || direction.default_extend_prompt || '')
  const [duration, setDuration]       = useState(5)
  const [mode, setMode]               = useState('professional')
  const [running, setRunning]         = useState(false)
  const [err, setErr]                 = useState('')
  const [sourceOverride, setSourceOverride] = useState(null)
  const [showPicker, setShowPicker]   = useState(false)
  const pollRef                       = useRef(null)

  const defaultVideoUrl = videoStep?.status === 'completed' ? videoStep.url : null
  const effectiveSource = sourceOverride?.url || defaultVideoUrl
  const hasSource       = !!effectiveSource

  const saveStep = async (patch) => {
    await fetch(`${API}/api/projects/${projectId}/evolution/${evoId}/step/extend`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
    })
    if (onDone) onDone()
  }

  const launch = async () => {
    if (!hasSource) return
    setRunning(true); setErr('')
    await saveStep({ status: 'in_progress', prompt: prompt.trim() || null })

    try {
      const body = new FormData()
      // Envoyer l'URL directement — le backend télécharge la vidéo (évite CORS)
      body.append('video_url', effectiveSource)
      // DA complète (colorimétrie + ambiance + caméra) fusionnée dans le continuation_prompt
      const extFinalPrompt = withDA(prompt, direction)
      if (extFinalPrompt) body.append('continuation_prompt', extFinalPrompt)
      body.append('duration', duration)
      body.append('mode', mode)

      const r = await fetch(`${API}/api/extend-video`, { method: 'POST', body })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur API')

      await saveStep({ job_id: d.job_id })
      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`${API}/api/job/${d.job_id}`)
          const pd = await pr.json()
          if (pd.status === 'completed') {
            clearInterval(pollRef.current)
            const lp = pd.video_path
            const url = pd.video_url  // uniquement URL Cloudinary — jamais de chemin local
            await saveStep({ status: 'completed', url: url || null, completed_at: new Date().toISOString() })
            if (url) await addToProjectMedia(projectId, { url, resource_type: 'video', label: lp ? lp.split('/').pop() : 'video' })
            setRunning(false)
          } else if (pd.status === 'failed') {
            clearInterval(pollRef.current)
            await saveStep({ status: 'failed' })
            setErr(pd.error || 'Extension échouée'); setRunning(false)
          }
        } catch { clearInterval(pollRef.current); await saveStep({ status: 'failed' }); setErr('Erreur réseau'); setRunning(false) }
      }, 5000)
    } catch (e) { await saveStep({ status: 'failed' }); setErr(e.message); setRunning(false) }
  }

  const reset = async () => {
    setErr(''); setRunning(false)
    if (pollRef.current) clearInterval(pollRef.current)
    await saveStep({ status: 'pending', job_id: null, url: null, completed_at: null })
  }

  if (step.status === 'completed' && step.url) {
    return (
      <div>
        <VideoPlayer src={step.url} controls style={{ width: '100%', maxWidth: 240, borderRadius: 'var(--radius-sm)', marginBottom: 10, display: 'block' }} />
        {step.prompt && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, fontStyle: 'italic' }}>"{step.prompt}"</div>}
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 12px', color: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={reset}>
          Regénérer
        </button>
      </div>
    )
  }

  if (step.status === 'in_progress' || running) {
    return (
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>Extension en cours… (1–3 min)</div>
        <div className="progress-track" style={{ maxWidth: 160 }}><div className="progress-fill indeterminate" /></div>
      </div>
    )
  }

  return (
    <div>
      {/* Source video */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Vidéo source</label>
        {effectiveSource ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-3)', border: '1px solid var(--border)', flexShrink: 0 }}>
              <VideoPlayer src={effectiveSource} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 10px' }} onClick={() => setShowPicker(true)}>
                {sourceOverride ? 'Changer ↔' : 'Remplacer la source'}
              </button>
              {sourceOverride && (
                <button style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '0 2px' }}
                  onClick={() => setSourceOverride(null)}>
                  ↩ Reprendre étape 2
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 8 }}>
              Attendez la fin de l'étape Vidéo, ou choisissez une source.
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setShowPicker(true)}>
              Choisir une vidéo source →
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Prompt de continuation</label>
        <textarea
          value={prompt} onChange={e => setPrompt(e.target.value)} rows={2}
          placeholder="ex. continuous smooth flow, same light…" disabled={!hasSource}
          style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '8px 10px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', opacity: hasSource ? 1 : 0.5 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[5, 10].map(d => (
          <button key={d} className={`btn ${duration === d ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setDuration(d)} disabled={!hasSource}>{d}s</button>
        ))}
        {['professional', 'standard'].map(m => (
          <button key={m} className={`btn ${mode === m ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setMode(m)} disabled={!hasSource}>
            {m === 'professional' ? 'Pro' : 'Standard'}
          </button>
        ))}
      </div>
      {err && <div className="validation-msg warn" style={{ marginBottom: 10, fontSize: 11 }}>{err}</div>}
      <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 16px' }} onClick={launch} disabled={!hasSource || running}>
        Étendre →
      </button>

      {showPicker && (
        <MediaPickerModal
          projectId={projectId} type="video"
          onSelect={(media) => setSourceOverride(media)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}


// ── Pipeline View ─────────────────────────────
// Automatic sequential execution with optional reference image for step 1

function PipelineView({ evo, projectId, direction, onUpdate }) {
  const steps = evo.steps

  // Prompts & params state (pre-filled from direction defaults)
  const [imgPrompt,    setImgPrompt]    = useState(steps.image.prompt    || direction.default_image_prompt  || '')
  const [imgSize,      setImgSize]      = useState('1024x1024')
  const [refImage,     setRefImage]     = useState(null)
  const [showRefPicker, setShowRefPicker] = useState(false)

  const [vidPrompt,    setVidPrompt]    = useState(steps.img2video.prompt || direction.default_motion_prompt || '')
  const [vidDuration,  setVidDuration]  = useState(5)
  const [vidRatio,     setVidRatio]     = useState('16:9')
  const [vidMode,      setVidMode]      = useState('professional')
  const [vidModelVer,  setVidModelVer]  = useState('2.5')

  const [extPrompt,    setExtPrompt]    = useState(steps.extend.prompt    || direction.default_extend_prompt || '')
  const [extDuration,  setExtDuration]  = useState(5)
  const [extMode,      setExtMode]      = useState('professional')

  const [running,      setRunning]      = useState(false)
  const [currentStep,  setCurrentStep]  = useState(null) // 'image' | 'img2video' | 'extend'
  const [err,          setErr]          = useState('')
  const pollRef                         = useRef(null)

  const SIZES = [
    { label: '1024×1024', value: '1024x1024', w: 1024, h: 1024 },
    { label: '1024×768',  value: '1024x768',  w: 1024, h: 768  },
    { label: '768×1024',  value: '768x1024',  w: 768,  h: 1024 },
  ]
  const selSize = SIZES.find(s => s.value === imgSize)

  const saveStep = async (stepKey, patch) => {
    await fetch(`${API}/api/projects/${projectId}/evolution/${evo.id}/step/${stepKey}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
    })
    if (onUpdate) onUpdate()
  }

  const pollJob = (jobId) => new Promise((resolve, reject) => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/job/${jobId}`)
        const d = await r.json()
        if (d.status === 'completed') { clearInterval(pollRef.current); resolve(d) }
        else if (d.status === 'failed') { clearInterval(pollRef.current); reject(new Error(d.error || 'Job échoué')) }
      } catch (e) { clearInterval(pollRef.current); reject(e) }
    }, 3000)
  })

  const pollTask = (taskId) => new Promise((resolve, reject) => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/task/${taskId}`)
        const d = await r.json()
        if (d.status === 'completed' && d.video_url) { clearInterval(pollRef.current); resolve(d) }
        else if (d.status === 'failed') { clearInterval(pollRef.current); reject(new Error('Tâche Kling échouée')) }
      } catch (e) { clearInterval(pollRef.current); reject(e) }
    }, 5000)
  })

  // Determine starting step based on current step statuses
  const s1 = steps.image.status
  const s2 = steps.img2video.status
  const s3 = steps.extend.status
  const allDone = s1 === 'completed' && s2 === 'completed' && s3 === 'completed'
  const resumeFrom = s1 !== 'completed' ? 'image' : s2 !== 'completed' ? 'img2video' : 'extend'

  const runPipeline = async (fromStep = 'image') => {
    setRunning(true); setErr('')
    let imageUrl = steps.image.url
    let videoUrl = steps.img2video.url

    try {
      // ── Step 1 : Image ──────────────────────────────────────
      if (fromStep === 'image') {
        setCurrentStep('image')
        await saveStep('image', { status: 'in_progress', prompt: imgPrompt.trim() || null })
        onUpdate && onUpdate()

        const body = new FormData()
        body.append('prompt', withDA(imgPrompt, direction))
        body.append('model', 'flux-schnell')
        body.append('width',  selSize.w)
        body.append('height', selSize.h)
        if (refImage) body.append('reference_url', refImage.url)

        const r1 = await fetch(`${API}/api/generate-image`, { method: 'POST', body })
        const d1 = await r1.json()
        if (!r1.ok) throw new Error(d1.detail || 'Erreur image')
        await saveStep('image', { job_id: d1.job_id })

        const res1 = await pollJob(d1.job_id)
        const lp = res1.image_path
        imageUrl = res1.image_url || `${API}/api/serve${lp.startsWith('/') ? lp : '/' + lp}`  // local en mémoire pour step 2
        const cloudUrl1 = res1.image_url  // uniquement Cloudinary pour persistance
        await saveStep('image', { status: 'completed', local_path: lp, url: cloudUrl1 || null, completed_at: new Date().toISOString() })
        if (cloudUrl1) await addToProjectMedia(projectId, { url: cloudUrl1, resource_type: 'image', label: lp ? lp.split('/').pop() : 'image' })
        onUpdate && onUpdate()
      }

      // ── Step 2 : Image → Vidéo ─────────────────────────────
      if (fromStep === 'image' || fromStep === 'img2video') {
        setCurrentStep('img2video')
        await saveStep('img2video', { status: 'in_progress', prompt: vidPrompt.trim() || null })
        onUpdate && onUpdate()

        const srcUrl = imageUrl || steps.image.url
        const imgResp = await fetch(srcUrl)
        const imgBlob = await imgResp.blob()
        const imgFile = new File([imgBlob], 'source.jpg', { type: imgBlob.type || 'image/jpeg' })

        const body2 = new FormData()
        body2.append('image', imgFile)
        body2.append('prompt', withDA(vidPrompt, direction) || 'Cinematic movement')
        body2.append('duration', vidDuration)
        body2.append('aspect_ratio', vidRatio)
        body2.append('mode', vidMode)
        body2.append('model_version', vidModelVer)
        if (direction.negative_prompt) body2.append('negative_prompt', direction.negative_prompt)

        const r2 = await fetch(`${API}/api/image-to-video`, { method: 'POST', body: body2 })
        const d2 = await r2.json()
        if (!r2.ok) throw new Error(d2.detail || 'Erreur img2video')
        await saveStep('img2video', { task_id: d2.task_id })

        const res2 = await pollTask(d2.task_id)
        videoUrl = res2.video_url
        await saveStep('img2video', { status: 'completed', url: videoUrl, completed_at: new Date().toISOString() })
        await addToProjectMedia(projectId, { url: videoUrl, resource_type: 'video', label: 'img2video' })
        onUpdate && onUpdate()
      }

      // ── Step 3 : Extend ────────────────────────────────────
      setCurrentStep('extend')
      await saveStep('extend', { status: 'in_progress', prompt: extPrompt.trim() || null })
      onUpdate && onUpdate()

      const srcVidUrl = videoUrl || steps.img2video.url

      const body3 = new FormData()
      body3.append('video_url', srcVidUrl)
      const extFinalPrompt = withDA(extPrompt, direction)
      if (extFinalPrompt) body3.append('continuation_prompt', extFinalPrompt)
      body3.append('duration', extDuration)
      body3.append('mode', extMode)

      const r3 = await fetch(`${API}/api/extend-video`, { method: 'POST', body: body3 })
      const d3 = await r3.json()
      if (!r3.ok) throw new Error(d3.detail || 'Erreur extend')
      await saveStep('extend', { job_id: d3.job_id })

      const res3 = await pollJob(d3.job_id)
      const lp3 = res3.video_path
      const extUrl = res3.video_url  // uniquement URL Cloudinary — jamais de chemin local
      await saveStep('extend', { status: 'completed', url: extUrl || null, completed_at: new Date().toISOString() })
      if (extUrl) await addToProjectMedia(projectId, { url: extUrl, resource_type: 'video', label: lp3 ? lp3.split('/').pop() : 'video' })
      onUpdate && onUpdate()

    } catch (e) {
      setErr(e.message)
      // Mark current step as failed
      if (currentStep || true) {
        const failedStep = currentStep
        if (failedStep) await saveStep(failedStep, { status: 'failed' })
        onUpdate && onUpdate()
      }
    } finally {
      setRunning(false)
      setCurrentStep(null)
    }
  }

  // ── Render: all steps completed ───────────────────────────
  if (allDone) {
    return (
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>✓ Pipeline complété</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Image</div>
            <div style={{ aspectRatio: '1/1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxWidth: 160, marginBottom: 8, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isCloudinaryUrl(steps.image.url)
                ? <img src={steps.image.url} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'center', padding: 8 }}>Non dispo Cloudinary</span>
              }
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vidéo</div>
            <VideoPlayer src={steps.img2video.url} controls style={{ width: '100%', maxWidth: 200, borderRadius: 'var(--radius-sm)', display: 'block', marginBottom: 8 }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Extension</div>
            <VideoPlayer src={steps.extend.url} controls style={{ width: '100%', maxWidth: 200, borderRadius: 'var(--radius-sm)', display: 'block', marginBottom: 8 }} />
          </div>
        </div>
      </div>
    )
  }

  // ── Render: currently running ─────────────────────────────
  if (running) {
    const stepLabels = { image: '1 · Image (Flux)…', img2video: '2 · Animation (Kling)…', extend: '3 · Extension (Kling)…' }
    return (
      <div style={{ padding: '20px 20px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          {['image', 'img2video', 'extend'].map((k, i) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>→</span>}
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: steps[k].status === 'completed' ? 'var(--success)'
                  : currentStep === k ? 'var(--warning)'
                  : 'var(--border-2)',
                boxShadow: currentStep === k ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none',
                transition: 'all 300ms ease',
              }} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>
          {stepLabels[currentStep] || 'En cours…'}
        </div>
        <div className="progress-track" style={{ maxWidth: 200 }}>
          <div className="progress-fill indeterminate" />
        </div>
      </div>
    )
  }

  // ── Render: form ──────────────────────────────────────────
  return (
    <div style={{ padding: '16px 20px' }}>
      {err && <div className="validation-msg warn" style={{ marginBottom: 16, fontSize: 11 }}>{err}</div>}

      {/* Resume banner */}
      {resumeFrom !== 'image' && (
        <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Pipeline interrompu</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Reprendre depuis l'étape {resumeFrom === 'img2video' ? '2 · Vidéo' : '3 · Extension'}
            </div>
          </div>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 16px' }} onClick={() => runPipeline(resumeFrom)}>
            Reprendre →
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

        {/* Step 1 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 11, opacity: 0.4 }}>◻</span>
            <div style={{ fontSize: 11, fontWeight: 600 }}>1 · Image FLUX</div>
            {s1 === 'completed' && <span style={{ fontSize: 9, color: 'var(--success)' }}>✓</span>}
          </div>

          {s1 === 'completed' ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ aspectRatio: '1/1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxWidth: 120, marginBottom: 6, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isCloudinaryUrl(steps.image.url)
                  ? <img src={steps.image.url} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'center', padding: 6 }}>Non dispo</span>
                }
              </div>
            </div>
          ) : (
            <>
              {/* Reference image */}
              <div style={{ marginBottom: 10 }}>
                {refImage ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={refImage.url} alt="ref" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ fontSize: 9, padding: '2px 7px' }} onClick={() => setShowRefPicker(true)}>↔</button>
                      <button style={{ fontSize: 9, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setRefImage(null)}>✕</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 10px', marginBottom: 8 }} onClick={() => setShowRefPicker(true)}>
                    + Référence
                  </button>
                )}
              </div>
              <textarea
                value={imgPrompt} onChange={e => setImgPrompt(e.target.value)} rows={3}
                placeholder="Décrivez la scène…"
                style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '7px 9px', fontSize: 11, fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {SIZES.map(s => (
                  <button key={s.value} className={`btn ${imgSize === s.value ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setImgSize(s.value)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Step 2 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 11, opacity: 0.4 }}>◈</span>
            <div style={{ fontSize: 11, fontWeight: 600 }}>2 · Animation Kling</div>
            {s2 === 'completed' && <span style={{ fontSize: 9, color: 'var(--success)' }}>✓</span>}
          </div>
          {s2 === 'completed' && steps.img2video.url ? (
            <VideoPlayer src={steps.img2video.url} controls style={{ width: '100%', maxWidth: 160, borderRadius: 'var(--radius-sm)', display: 'block', marginBottom: 6 }} />
          ) : (
            <>
              <textarea
                value={vidPrompt} onChange={e => setVidPrompt(e.target.value)} rows={3}
                placeholder="Mouvement, caméra…"
                style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '7px 9px', fontSize: 11, fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                {[5, 10].map(d => (
                  <button key={d} className={`btn ${vidDuration === d ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setVidDuration(d)}>{d}s</button>
                ))}
                {['16:9', '9:16', '1:1'].map(r => (
                  <button key={r} className={`btn ${vidRatio === r ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setVidRatio(r)}>{r}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['2.5', '2.0'].map(v => (
                  <button key={v} className={`btn ${vidModelVer === v ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setVidModelVer(v)}>v{v}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Step 3 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 11, opacity: 0.4 }}>⊞</span>
            <div style={{ fontSize: 11, fontWeight: 600 }}>3 · Extension</div>
            {s3 === 'completed' && <span style={{ fontSize: 9, color: 'var(--success)' }}>✓</span>}
          </div>
          {s3 === 'completed' && steps.extend.url ? (
            <VideoPlayer src={steps.extend.url} controls style={{ width: '100%', maxWidth: 160, borderRadius: 'var(--radius-sm)', display: 'block', marginBottom: 6 }} />
          ) : (
            <>
              <textarea
                value={extPrompt} onChange={e => setExtPrompt(e.target.value)} rows={3}
                placeholder="Continuation, atmosphère…"
                style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '7px 9px', fontSize: 11, fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[5, 10].map(d => (
                  <button key={d} className={`btn ${extDuration === d ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setExtDuration(d)}>{d}s</button>
                ))}
                {['professional', 'standard'].map(m => (
                  <button key={m} className={`btn ${extMode === m ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setExtMode(m)}>
                    {m === 'professional' ? 'Pro' : 'Std'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Launch button */}
      {resumeFrom === 'image' && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 13, padding: '10px 28px' }}
            onClick={() => runPipeline('image')}
            disabled={!imgPrompt.trim() || running}
          >
            Lancer le pipeline →
          </button>
          {direction.colorimetry && (
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8 }}>
              Direction appliquée automatiquement à chaque étape
            </div>
          )}
        </div>
      )}

      {showRefPicker && (
        <MediaPickerModal
          projectId={projectId} type="image"
          onSelect={(media) => setRefImage(media)}
          onClose={() => setShowRefPicker(false)}
        />
      )}
    </div>
  )
}


// ── Evolution Card ────────────────────────────

function EvolutionCard({ evo, projectId, direction, onUpdate, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const evoMode = evo.mode || 'manual'

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`${API}/api/projects/${projectId}/evolution/${evo.id}`, { method: 'DELETE' })
    if (onDelete) onDelete()
  }

  const STEPS = [
    { key: 'image',    label: '1 · Image',     icon: '◻', desc: 'Génération FLUX' },
    { key: 'img2video',label: '2 · Vidéo',      icon: '◈', desc: 'Image → Vidéo (Kling)' },
    { key: 'extend',   label: '3 · Extension',  icon: '⊞', desc: 'Extension vidéo' },
  ]

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{evo.name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(evo.created_at)}</span>
          <span style={{
            fontSize: 9, fontWeight: 500, padding: '2px 7px', borderRadius: 'var(--radius-pill)',
            letterSpacing: '0.07em', textTransform: 'uppercase',
            background: evoMode === 'pipeline' ? 'rgba(99,102,241,0.12)' : 'var(--bg-3)',
            color: evoMode === 'pipeline' ? '#818cf8' : 'var(--text-3)',
          }}>
            {evoMode === 'pipeline' ? '⊞ Pipeline' : '◈ Manuel'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {['image', 'img2video', 'extend'].map(k => (
            <div key={k} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: evo.steps[k].status === 'completed' ? 'var(--success)'
                : evo.steps[k].status === 'in_progress' ? 'var(--warning)'
                : evo.steps[k].status === 'failed' ? 'var(--error)'
                : 'var(--border-2)',
            }} />
          ))}
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Supprimer ?</span>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 8px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                onClick={handleDelete} disabled={deleting}>{deleting ? '…' : 'Oui'}</button>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 8px' }}
                onClick={() => setConfirmDelete(false)}>Non</button>
            </div>
          ) : (
            <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
              onClick={() => setConfirmDelete(true)}>
              Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Body: Pipeline or Manual */}
      {evoMode === 'pipeline' ? (
        <PipelineView
          evo={evo}
          projectId={projectId}
          direction={direction}
          onUpdate={onUpdate}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s.key} style={{ padding: '18px 16px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13, opacity: 0.5 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <StatusBadge status={evo.steps[s.key].status} />
                </div>
              </div>

              {s.key === 'image' && (
                <StepImage
                  step={evo.steps.image} evoId={evo.id} projectId={projectId}
                  direction={direction} onDone={onUpdate}
                />
              )}
              {s.key === 'img2video' && (
                <StepImgToVideo
                  step={evo.steps.img2video} imageStep={evo.steps.image}
                  evoId={evo.id} projectId={projectId} direction={direction} onDone={onUpdate}
                />
              )}
              {s.key === 'extend' && (
                <StepExtend
                  step={evo.steps.extend} videoStep={evo.steps.img2video}
                  evoId={evo.id} projectId={projectId} direction={direction} onDone={onUpdate}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ── Project Media Section ─────────────────────

function ProjectMediaSection({ projectId }) {
  const [media, setMedia]     = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/projects/${projectId}/media`)
      const d = await r.json()
      setMedia(d.media || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [projectId])

  const remove = async (publicId) => {
    await fetch(`${API}/api/projects/${projectId}/media/${publicId}`, { method: 'DELETE' })
    setMedia(m => m.filter(x => x.public_id !== publicId))
  }

  const inspirations = media.filter(m => m.media_type === 'inspiration')
  const creations    = media.filter(m => m.media_type === 'creation')

  return (
    <div style={{ marginBottom: 40 }}>
      <div
        className="section-title"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 20 : 0, cursor: 'pointer', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        onClick={() => setOpen(v => !v)}
      >
        <span>Médias du projet {media.length > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-3)', textTransform: 'none', letterSpacing: 0 }}>({media.length})</span>}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{open ? '▼' : '▶'}</span>
      </div>

      {open && (
        <>
          {loading ? (
            <div className="progress-track" style={{ maxWidth: 160 }}>
              <div className="progress-fill indeterminate" />
            </div>
          ) : media.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0', background: 'none', border: 'none' }}>
              <p style={{ fontSize: 12 }}>
                Aucun média assigné. Depuis <strong>Mes Créations</strong> ou <strong>Inspirations</strong>, cliquez sur « → Projet » pour ajouter des médias ici.
              </p>
            </div>
          ) : (
            <>
              {inspirations.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Inspirations ({inspirations.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {inspirations.map(m => <MediaThumb key={m.public_id} item={m} onRemove={remove} />)}
                  </div>
                </div>
              )}
              {creations.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Créations ({creations.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {creations.map(m => <MediaThumb key={m.public_id} item={m} onRemove={remove} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function MediaThumb({ item, onRemove }) {
  const [confirmDel, setConfirmDel] = useState(false)
  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
      <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
        {item.resource_type === 'video' ? (
          <VideoPlayer src={item.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onMouseEnter={e => e.target.play?.()} onMouseLeave={e => { e.target.pause?.(); e.target.currentTime = 0 }} />
        ) : (
          <img src={getCloudinaryThumb(item.url)} onError={e => { e.target.src = item.url }} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        )}
      </div>
      <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </div>
        {confirmDel ? (
          <>
            <button style={{ fontSize: 9, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}
              onClick={() => onRemove(item.public_id)}>✕</button>
            <button style={{ fontSize: 9, color: 'var(--text-3)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}
              onClick={() => setConfirmDel(false)}>↩</button>
          </>
        ) : (
          <button style={{ fontSize: 9, color: 'var(--text-3)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}
            onClick={() => setConfirmDel(true)}>✕</button>
        )}
      </div>
    </div>
  )
}


// ── Montage Section ───────────────────────────

const MONTAGE_PX_PER_SEC = 60

function MontageSection({ projectId }) {
  const [clips, setClips]                   = useState([])
  const [selectedIdx, setSelectedIdx]       = useState(null)
  const [media, setMedia]                   = useState([])
  const [exportJobId, setExportJobId]       = useState(null)
  const [exportStatus, setExportStatus]     = useState(null)
  const [exportUrl, setExportUrl]           = useState(null)
  const [exportErr, setExportErr]           = useState(null)
  const [previewIdx, setPreviewIdx]         = useState(null)
  const [collapsed, setCollapsed]           = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [nativeDurations, setNativeDurations] = useState({})
  const dragSrcIdx                          = useRef(null)
  const trimDrag                            = useRef(null)
  const pollRef                             = useRef(null)
  const [previewFormat, setPreviewFormat]   = useState('16/9')
  const [playheadTime, setPlayheadTime]     = useState(0)
  const videoPreviewRef                     = useRef(null)
  const pendingSeekRef                      = useRef(null)
  const playheadDragRef                     = useRef(null)
  const previewPanDragRef                   = useRef(null)
  const previewContainerRef                 = useRef(null)
  const imageTimerRef                       = useRef(null)
  const [lastVideoSrc, setLastVideoSrc]     = useState(undefined)
  const hlsRef                              = useRef(null)
  const [showExportWarning, setShowExportWarning] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/projects/${projectId}/media`)
      .then(r => r.json())
      .then(d => setMedia(d.media || []))
      .catch(() => {})
  }, [projectId])

  useEffect(() => {
    if (!exportJobId) return
    pollRef.current = setInterval(async () => {
      try {
        const r  = await fetch(`${API}/api/video-editor/job/${exportJobId}`)
        const d  = await r.json()
        setExportStatus(d.status)
        if (d.status === 'completed') {
          clearInterval(pollRef.current)
          setExportUrl(d.video_url)
          setExportJobId(null)
        } else if (d.status === 'failed') {
          clearInterval(pollRef.current)
          setExportErr(d.error || 'Export échoué')
          setExportJobId(null)
        }
      } catch { clearInterval(pollRef.current) }
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [exportJobId])

  useEffect(() => {
    if (clips.length > 0 && previewIdx === null) setPreviewIdx(0)
    if (clips.length === 0) { setPreviewIdx(null); setPlayheadTime(0) }
  }, [clips.length])

  useEffect(() => {
    const vid = videoPreviewRef.current

    // Toujours détruire l'instance HLS précédente avant de changer de source
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (previewIdx === null || !clips[previewIdx]) return
    const clip = clips[previewIdx]

    if (clip.resource_type !== 'video') {
      if (vid) vid.pause()
      return
    }

    setLastVideoSrc(clip.url)

    const hlsUrl = getCloudinaryHlsUrl(clip.url)

    if (hlsUrl && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false })
      hlsRef.current = hls
      hls.loadSource(hlsUrl)
      hls.attachMedia(vid)
      // onLoadedMetadata s'occupe du seek + play après MANIFEST_PARSED
    } else if (vid && vid.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari : HLS natif
      vid.src = hlsUrl || getCloudinaryVideoUrl(clip.url)
    } else {
      // Fallback direct H.264
      if (vid) vid.src = getCloudinaryVideoUrl(clip.url)
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [previewIdx, clips])

  // Avance automatiquement après la durée d'une image
  useEffect(() => {
    if (imageTimerRef.current) clearTimeout(imageTimerRef.current)
    if (previewIdx === null || !clips[previewIdx]) return
    const clip = clips[previewIdx]
    if (clip.resource_type !== 'image') return
    const clipStart = clips.slice(0, previewIdx).reduce((acc, c) => acc + effectiveDuration(c), 0)
    setPlayheadTime(clipStart)
    imageTimerRef.current = setTimeout(() => {
      const nextIdx = previewIdx + 1
      if (nextIdx < clips.length) {
        setPlayheadTime(clips.slice(0, nextIdx).reduce((acc, c) => acc + effectiveDuration(c), 0))
        setPreviewIdx(nextIdx)
      }
    }, (clip.duration || 3) * 1000)
    return () => clearTimeout(imageTimerRef.current)
  }, [previewIdx, clips, nativeDurations])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!previewPanDragRef.current) return
      const { startX, startY, startPanX, startPanY, clipIdx } = previewPanDragRef.current
      const newPanX = startPanX + e.clientX - startX
      const newPanY = startPanY + e.clientY - startY
      setClips(prev => prev.map((c, i) => i === clipIdx ? { ...c, pan_x: newPanX, pan_y: newPanY } : c))
    }
    const onMouseUp = () => { previewPanDragRef.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [])

  const addClip = (item) => {
    setClips(prev => [...prev, {
      id:                   `${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      url:                  item.url,
      resource_type:        item.resource_type,
      label:                item.label || item.public_id?.split('/').pop() || 'clip',
      trim_start:           0,
      trim_end:             null,
      speed:                1.0,
      duration:             3.0,
      transition_after:     'cut',
      transition_duration:  0.5,
      zoom:                 1.0,
      pan_x:                0,
      pan_y:                0,
    }])
  }

  const removeClip = (idx) => {
    setClips(prev => prev.filter((_, i) => i !== idx))
    if (selectedIdx === idx) setSelectedIdx(null)
  }

  const updateClip = (idx, patch) => {
    setClips(prev => prev.map((clip, i) => i === idx ? { ...clip, ...patch } : clip))
  }

  const onDragStart = (idx) => { dragSrcIdx.current = idx }

  const onDrop = (targetIdx) => {
    const srcIdx = dragSrcIdx.current
    if (srcIdx === null || srcIdx === targetIdx) return
    setClips(prev => {
      const next = [...prev]
      const [moved] = next.splice(srcIdx, 1)
      next.splice(targetIdx, 0, moved)
      return next
    })
    dragSrcIdx.current = null
  }

  const startExport = async () => {
    if (clips.length === 0) return
    setExportErr(null); setExportUrl(null); setExportStatus('pending')
    const containerEl = previewContainerRef.current
    const containerW  = containerEl ? containerEl.clientWidth  : 800
    const containerH  = containerEl ? containerEl.clientHeight : 450
    const body = {
      project_id: projectId,
      clips: clips.map(c => ({
        url:                 c.url,
        resource_type:       c.resource_type,
        trim_start:          c.trim_start,
        trim_end:            c.trim_end || null,
        speed:               c.speed,
        duration:            c.duration,
        transition_after:    c.transition_after,
        transition_duration: c.transition_duration,
        zoom:                c.zoom ?? 1,
        pan_x_frac:          (c.pan_x ?? 0) / containerW,
        pan_y_frac:          (c.pan_y ?? 0) / containerH,
      }))
    }
    const r = await fetch(`${API}/api/video-editor/export`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const d = await r.json()
    if (!r.ok) { setExportErr(d.detail || 'Erreur export'); setExportStatus(null); return }
    setExportJobId(d.job_id)
  }

  // Durée effective d'un clip dans la timeline
  const effectiveDuration = useCallback((clip) => {
    if (clip.resource_type === 'image') return clip.duration || 3
    const native = nativeDurations[clip.id] || 5
    const end    = clip.trim_end ?? native
    return Math.max(0.2, (end - (clip.trim_start || 0)) / (clip.speed || 1))
  }, [nativeDurations])

  const seekToTime = useCallback((targetTime) => {
    const clamped = Math.max(0, Math.min(targetTime, clips.reduce((acc, c) => acc + effectiveDuration(c), 0)))
    let accumulated = 0
    for (let clipIdx = 0; clipIdx < clips.length; clipIdx++) {
      const dur = effectiveDuration(clips[clipIdx])
      if (clamped <= accumulated + dur || clipIdx === clips.length - 1) {
        const clip       = clips[clipIdx]
        const timeInClip = clamped - accumulated
        const videoTime  = (clip.trim_start || 0) + timeInClip * (clip.speed || 1)
        setPlayheadTime(clamped)
        if (clipIdx === previewIdx && videoPreviewRef.current) {
          videoPreviewRef.current.currentTime = videoTime
        } else {
          pendingSeekRef.current = videoTime
          setPreviewIdx(clipIdx)
        }
        return
      }
      accumulated += dur
    }
  }, [clips, previewIdx, effectiveDuration])

  // Drag playhead
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!playheadDragRef.current) return
      const { startX, startTime } = playheadDragRef.current
      seekToTime(startTime + (e.clientX - startX) / MONTAGE_PX_PER_SEC)
    }
    const onMouseUp = () => { playheadDragRef.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [seekToTime])

  // Drag trim handles
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!trimDrag.current) return
      const { clipIdx, side, startX, startVal } = trimDrag.current
      const delta  = (e.clientX - startX) / MONTAGE_PX_PER_SEC
      const clip   = clips[clipIdx]
      const native = nativeDurations[clip.id] || 999
      if (side === 'left') {
        const newStart = Math.max(0, Math.min(startVal + delta, (clip.trim_end ?? native) - 0.2))
        updateClip(clipIdx, { trim_start: Math.round(newStart * 10) / 10 })
      } else {
        const newEnd = Math.max((clip.trim_start || 0) + 0.2, Math.min(startVal + delta, native))
        updateClip(clipIdx, { trim_end: Math.round(newEnd * 10) / 10 })
      }
    }
    const onMouseUp = () => { trimDrag.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [clips, nativeDurations])

  const selectedClip  = selectedIdx !== null ? clips[selectedIdx] : null
  const isExporting   = exportStatus === 'pending' || exportStatus === 'processing'
  const totalDuration = clips.reduce((acc, clip) => acc + effectiveDuration(clip), 0)
  const rulerTicks    = Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => i)
  const prevClip      = previewIdx !== null ? clips[previewIdx] : null
  const prevZoom      = prevClip?.zoom ?? 1
  const prevPanX      = prevClip?.pan_x ?? 0
  const prevPanY      = prevClip?.pan_y ?? 0

  return (
    <div style={{ marginTop: 40 }}>

      {/* Éléments vidéo invisibles pour détecter la durée native */}
      {clips.filter(c => c.resource_type === 'video').map(clip => (
        <video key={clip.id} src={getCloudinaryVideoUrl(clip.url)} style={{ display: 'none' }}
          onLoadedMetadata={e => setNativeDurations(prev => ({ ...prev, [clip.id]: e.target.duration }))} />
      ))}

      <div
        className="section-title"
        style={{ marginBottom: collapsed ? 0 : 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span>Montage {clips.length > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-3)' }}>({clips.length} clip{clips.length > 1 ? 's' : ''} — {totalDuration.toFixed(1)}s)</span>}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{collapsed ? '▶' : '▼'}</span>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 14px' }}
              onClick={() => setShowMediaPicker(true)}>
              + Ajouter un média
            </button>
            <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 14px' }}
              onClick={() => {
                if (clips.some(c => c.resource_type === 'image')) {
                  setShowExportWarning(true)
                } else {
                  startExport()
                }
              }}
              disabled={clips.length === 0 || isExporting}>
                {isExporting ? 'Export en cours…' : '⬇ Exporter'}
              </button>

              {/* Popup avertissement photos */}
              {showExportWarning && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => setShowExportWarning(false)}>
                  <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px 28px', maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>
                      Attention
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                      Les photos ne peuvent pas être exportées dans le mode &quot;montage&quot;, merci de n&apos;inclure que des vidéos mon gros pote (je fixerai ça plus tard)
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 18, width: '100%', fontSize: 12 }}
                      onClick={() => setShowExportWarning(false)}>
                      OK, j&apos;ai compris
                    </button>
                  </div>
                </div>
              )}
              {isExporting && <div className="progress-track" style={{ width: 80, margin: 0 }}><div className="progress-fill indeterminate" /></div>}
              {exportErr && <span style={{ fontSize: 11, color: 'var(--error)' }}>{exportErr}</span>}
              {exportUrl && (
                <a href={exportUrl} target="_blank" rel="noreferrer" className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '5px 14px', color: 'var(--success)', borderColor: 'var(--success)' }}>
                  ✓ Ouvrir le montage ↗
                </a>
              )}
            </div>

            {/* ── Timeline ── */}
            {clips.length === 0 ? (
              <div style={{ border: '2px dashed var(--accent)', borderRadius: 'var(--radius)', padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                Cliquez sur <strong style={{ color: 'var(--text-3)' }}>+ Ajouter un média</strong> pour commencer
              </div>
            ) : (
              <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>

                {/* Règle temporelle */}
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 22, borderBottom: '1px solid var(--border)', overflowX: 'auto', position: 'relative', background: 'var(--bg-1)' }}>
                  <div style={{ display: 'flex', paddingLeft: 8, minWidth: totalDuration * MONTAGE_PX_PER_SEC + 40 }}>
                    {rulerTicks.map(sec => (
                      <div key={sec} style={{ position: 'absolute', left: 8 + sec * MONTAGE_PX_PER_SEC, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 8, color: 'var(--text-3)', lineHeight: 1, marginBottom: 2 }}>{sec}s</span>
                        <div style={{ width: 1, height: 4, background: 'var(--border-2)' }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Piste clips */}
                <div
                  style={{ display: 'flex', alignItems: 'stretch', padding: '10px 8px', overflowX: 'auto', minHeight: 90, gap: 0, position: 'relative' }}
                  onClick={e => {
                    if (e.target === e.currentTarget) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      seekToTime((e.clientX - rect.left - 8 + e.currentTarget.scrollLeft) / MONTAGE_PX_PER_SEC)
                    }
                  }}>
                  {/* Playhead */}
                  <div style={{ position: 'absolute', left: 8 + playheadTime * MONTAGE_PX_PER_SEC - 1, top: 0, bottom: 0, width: 2, background: 'var(--accent)', zIndex: 10, pointerEvents: 'none' }}>
                    <div
                      style={{ position: 'absolute', top: 4, left: -5, width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', cursor: 'ew-resize', pointerEvents: 'auto', boxShadow: '0 0 0 2px rgba(0,0,0,0.4)' }}
                      onMouseDown={e => { e.stopPropagation(); e.preventDefault(); playheadDragRef.current = { startX: e.clientX, startTime: playheadTime } }}
                    />
                  </div>
                  {clips.map((clip, idx) => {
                    const clipW   = Math.max(40, effectiveDuration(clip) * MONTAGE_PX_PER_SEC)
                    const isSelected = selectedIdx === idx
                    return (
                      <div key={clip.id} style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
                        {/* Clip block */}
                        <div
                          draggable
                          onDragStart={e => { e.stopPropagation(); onDragStart(idx) }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => onDrop(idx)}
                          onClick={e => { e.stopPropagation(); setSelectedIdx(idx === selectedIdx ? null : idx) }}
                          style={{
                            width: clipW, height: 70, position: 'relative', cursor: 'grab',
                            borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border-2)'}`,
                            boxShadow: isSelected ? '0 0 0 1px var(--accent)' : 'none',
                          }}
                        >
                          {/* Thumbnail de fond */}
                          <div style={{ position: 'absolute', inset: 0 }}>
                            {clip.resource_type === 'video'
                              ? <video src={getCloudinaryVideoUrl(clip.url)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                              : <img src={getCloudinaryThumb(clip.url)} onError={e => { e.target.src = clip.url }} alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                            }
                            <div style={{ position: 'absolute', inset: 0, background: isSelected ? 'rgba(232,0,45,0.15)' : 'rgba(0,0,0,0.35)' }} />
                          </div>

                          {/* Label + durée */}
                          <div style={{ position: 'absolute', bottom: 4, left: 6, right: 6 }}>
                            <div style={{ fontSize: 9, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clip.label}</div>
                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)' }}>
                              {clip.resource_type === 'video'
                                ? `${clip.trim_start.toFixed(1)}s → ${clip.trim_end != null ? clip.trim_end.toFixed(1) + 's' : 'fin'}`
                                : `${(clip.duration || 3).toFixed(1)}s`
                              }
                              {clip.speed !== 1 && ` · ${clip.speed}x`}
                            </div>
                          </div>

                          {/* Bouton supprimer */}
                          <button onClick={e => { e.stopPropagation(); removeClip(idx) }}
                            style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 8, cursor: 'pointer', borderRadius: 3, padding: '1px 4px', lineHeight: 1.2 }}>
                            ✕
                          </button>

                          {/* Poignée trim gauche */}
                          {clip.resource_type === 'video' && (
                            <div
                              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); trimDrag.current = { clipIdx: idx, side: 'left', startX: e.clientX, startVal: clip.trim_start } }}
                              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 2, height: 20, background: 'rgba(255,255,255,0.6)', borderRadius: 1 }} />
                            </div>
                          )}

                          {/* Poignée trim droite */}
                          {clip.resource_type === 'video' && (
                            <div
                              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); trimDrag.current = { clipIdx: idx, side: 'right', startX: e.clientX, startVal: clip.trim_end ?? (nativeDurations[clip.id] || 5) } }}
                              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 2, height: 20, background: 'rgba(255,255,255,0.6)', borderRadius: 1 }} />
                            </div>
                          )}
                        </div>

                        {/* Indicateur de transition */}
                        {idx < clips.length - 1 && (
                          <div style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            title={clip.transition_after === 'fade' ? `Fondu ${clip.transition_duration}s` : 'Cut'}
                            onClick={() => updateClip(idx, { transition_after: clip.transition_after === 'cut' ? 'fade' : 'cut' })}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: clip.transition_after === 'fade' ? 'var(--accent)' : 'var(--border-2)',
                              border: `1px solid ${clip.transition_after === 'fade' ? 'var(--accent)' : 'var(--text-3)'}`,
                            }} title="Clic pour basculer cut/fondu" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Panneau propriétés (clip sélectionné) ── */}
            {selectedClip && (
              <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Clip sélectionné — {selectedClip.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>

                  {selectedClip.resource_type === 'video' && (
                    <>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Début (s)</label>
                        <input type="number" min="0" step="0.1" value={selectedClip.trim_start}
                          onChange={e => updateClip(selectedIdx, { trim_start: parseFloat(e.target.value) || 0 })}
                          style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '5px 8px', fontSize: 12 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Fin (s) — vide = jusqu'à la fin</label>
                        <input type="number" min="0" step="0.1" value={selectedClip.trim_end ?? ''}
                          placeholder="fin"
                          onChange={e => updateClip(selectedIdx, { trim_end: e.target.value === '' ? null : parseFloat(e.target.value) })}
                          style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '5px 8px', fontSize: 12 }} />
                      </div>
                    </>
                  )}

                  {selectedClip.resource_type === 'image' && (
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Durée (s)</label>
                      <input type="number" min="0.5" step="0.5" value={selectedClip.duration}
                        onChange={e => updateClip(selectedIdx, { duration: parseFloat(e.target.value) || 3 })}
                        style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '5px 8px', fontSize: 12 }} />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Vitesse — {selectedClip.speed}x</label>
                    <input type="range" min="0.25" max="4" step="0.25" value={selectedClip.speed}
                      onChange={e => updateClip(selectedIdx, { speed: parseFloat(e.target.value) })}
                      style={{ width: '100%' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-3)' }}>
                      <span>0.25x</span><span>1x</span><span>4x</span>
                    </div>
                  </div>

                  {selectedIdx < clips.length - 1 && (
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Transition après</label>
                      <div style={{ display: 'flex', gap: 6, marginBottom: selectedClip.transition_after === 'fade' ? 8 : 0 }}>
                        {['cut', 'fade'].map(t => (
                          <button key={t} className={`btn ${selectedClip.transition_after === t ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ fontSize: 10, padding: '4px 12px', flex: 1 }}
                            onClick={() => updateClip(selectedIdx, { transition_after: t })}>
                            {t === 'cut' ? 'Cut' : 'Fondu'}
                          </button>
                        ))}
                      </div>
                      {selectedClip.transition_after === 'fade' && (
                        <input type="number" min="0.1" max="3" step="0.1" value={selectedClip.transition_duration}
                          onChange={e => updateClip(selectedIdx, { transition_duration: parseFloat(e.target.value) || 0.5 })}
                          style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '5px 8px', fontSize: 12 }}
                          placeholder="Durée fondu (s)" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Preview player (automatique) ── */}
            {clips.length > 0 && (
              <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 12 }}>

                {/* Header : info + sélecteur de format */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {previewIdx !== null ? `Clip ${previewIdx + 1}/${clips.length} — ${clips[previewIdx]?.label}` : 'Preview'}
                    <span style={{ marginLeft: 8, opacity: 0.6 }}>{playheadTime.toFixed(1)}s / {clips.reduce((acc, c) => acc + effectiveDuration(c), 0).toFixed(1)}s</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Format</span>
                    {['16/9', '9/16', '1/1', '4/3'].map(fmt => (
                      <button key={fmt}
                        className={`btn ${previewFormat === fmt ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: 9, padding: '2px 8px' }}
                        onClick={() => { setPreviewFormat(fmt); if (previewIdx !== null) updateClip(previewIdx, { zoom: 1, pan_x: 0, pan_y: 0 }) }}>
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider zoom */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>Zoom</span>
                  <input type="range" min="1" max="3" step="0.05" value={prevZoom}
                    onChange={e => { if (previewIdx !== null) updateClip(previewIdx, { zoom: parseFloat(e.target.value) }) }}
                    style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-2)', minWidth: 32, textAlign: 'right' }}>{prevZoom.toFixed(1)}×</span>
                  {(prevZoom !== 1 || prevPanX !== 0 || prevPanY !== 0) && (
                    <button className="btn btn-ghost" style={{ fontSize: 9, padding: '2px 8px', flexShrink: 0 }}
                      onClick={() => { if (previewIdx !== null) updateClip(previewIdx, { zoom: 1, pan_x: 0, pan_y: 0 }) }}>
                      Réinit.
                    </button>
                  )}
                </div>

                {/* Zone vidéo avec zoom/pan */}
                <div ref={previewContainerRef} style={{ width: '100%', aspectRatio: previewFormat, background: '#000', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
                  {previewIdx !== null && clips[previewIdx] ? (
                    <div
                      style={{
                        position: 'absolute', inset: 0,
                        transform: `translate(${prevPanX}px, ${prevPanY}px) scale(${prevZoom})`,
                        transformOrigin: 'center',
                        cursor: prevZoom > 1 ? 'grab' : 'default',
                        userSelect: 'none',
                      }}
                      onMouseDown={e => {
                        if (prevZoom <= 1) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        if (e.clientY > rect.bottom - 48) return
                        e.preventDefault()
                        previewPanDragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: prevPanX, startPanY: prevPanY, clipIdx: previewIdx }
                      }}>
                      {/* Vidéo et image toujours montés — display bascule pour éviter tout flash */}
                      <video
                        ref={videoPreviewRef}
                        preload="auto"
                        controls
                        style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0, display: clips[previewIdx].resource_type === 'video' ? 'block' : 'none' }}
                        onLoadedMetadata={() => {
                          if (!videoPreviewRef.current) return
                          const clip = clips[previewIdx]
                          if (pendingSeekRef.current !== null) {
                            videoPreviewRef.current.currentTime = pendingSeekRef.current
                            pendingSeekRef.current = null
                          } else if ((clip?.trim_start || 0) > 0) {
                            videoPreviewRef.current.currentTime = clip.trim_start
                          }
                          videoPreviewRef.current.play().catch(() => {})
                        }}
                        onTimeUpdate={e => {
                          const clip = clips[previewIdx]
                          if (!clip) return
                          const currentTime = e.target.currentTime
                          if (clip.trim_end !== null && clip.trim_end !== undefined && currentTime >= clip.trim_end) {
                            e.target.pause()
                            const nextIdx = (previewIdx ?? 0) + 1
                            if (nextIdx < clips.length) {
                              setPlayheadTime(clips.slice(0, nextIdx).reduce((acc, c) => acc + effectiveDuration(c), 0))
                              setPreviewIdx(nextIdx)
                            }
                            return
                          }
                          const clipStart = clips.slice(0, previewIdx).reduce((acc, c) => acc + effectiveDuration(c), 0)
                          setPlayheadTime(clipStart + Math.max(0, (currentTime - (clip.trim_start || 0)) / (clip.speed || 1)))
                        }}
                        onEnded={() => {
                          const nextIdx = (previewIdx ?? 0) + 1
                          if (nextIdx < clips.length) {
                            setPlayheadTime(clips.slice(0, nextIdx).reduce((acc, c) => acc + effectiveDuration(c), 0))
                            setPreviewIdx(nextIdx)
                          }
                        }}
                      />
                      <img
                        src={clips[previewIdx].resource_type === 'image' ? clips[previewIdx].url : undefined}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0, display: clips[previewIdx].resource_type === 'image' ? 'block' : 'none' }}
                      />
                    </div>
                  ) : null}
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 10px' }}
                    onClick={() => { setPreviewIdx(0); setPlayheadTime(0) }}>⏮</button>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 10px' }}
                    onClick={() => { if (previewIdx > 0) { const prev = previewIdx - 1; const t = clips.slice(0, prev).reduce((acc, c) => acc + effectiveDuration(c), 0); setPreviewIdx(prev); setPlayheadTime(t) } }}
                    disabled={previewIdx === 0 || previewIdx === null}>◀</button>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 10px' }}
                    onClick={() => { if (previewIdx < clips.length - 1) { const next = previewIdx + 1; const t = clips.slice(0, next).reduce((acc, c) => acc + effectiveDuration(c), 0); setPreviewIdx(next); setPlayheadTime(t) } }}
                    disabled={previewIdx === null || previewIdx >= clips.length - 1}>▶</button>
                </div>

              </div>
            )}

          {/* ── Modale sélection médias ── */}
          {showMediaPicker && (
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowMediaPicker(false)}>
              <div
                style={{ background: 'var(--bg-1)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', width: 'min(90vw, 720px)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Choisir un média</span>
                  <button
                    onClick={() => setShowMediaPicker(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-3)', lineHeight: 1, padding: '2px 6px' }}>
                    ✕
                  </button>
                </div>

                {/* Grille médias */}
                <div style={{ overflowY: 'auto', padding: 20, flex: 1 }}>
                  {media.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: 40 }}>
                      Aucun média dans ce projet.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                      {media.map(item => (
                        <div
                          key={item.public_id}
                          onClick={() => { addClip(item); setShowMediaPicker(false) }}
                          style={{ borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--bg-2)', border: '2px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.02)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)' }}>
                          {/* Thumbnail 16/9 */}
                          <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', overflow: 'hidden', position: 'relative' }}>
                            {item.resource_type === 'video'
                              ? <video src={getCloudinaryVideoUrl(item.url)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <img src={getCloudinaryThumb(item.url)} onError={e => { e.target.src = item.url }} alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            }
                            <div style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.65)', borderRadius: 4, padding: '2px 7px', fontSize: 9, color: '#fff', fontWeight: 500 }}>
                              {item.resource_type === 'video' ? '▶ vidéo' : '⬜ image'}
                            </div>
                          </div>
                          {/* Label */}
                          <div style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label || item.public_id?.split('/').pop()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setShowMediaPicker(false)}>Fermer</button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}


// ── Main Dashboard ────────────────────────────

export default function ProjectDashboard({ onUpdate }) {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const [project, setProject]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [editName, setEditName]       = useState(false)
  const [nameVal, setNameVal]         = useState('')
  const [showModeModal, setShowModeModal] = useState(false)
  const [creating, setCreating]       = useState(false)
  const [confirmDel, setConfirmDel]   = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [evosOpen, setEvosOpen]       = useState(true)

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/projects/${id}`)
      if (!r.ok) throw new Error('Projet introuvable')
      const d = await r.json()
      setProject(d)
      setNameVal(d.name)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const saveName = async () => {
    if (!nameVal.trim()) return
    const r = await fetch(`${API}/api/projects/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameVal.trim(), direction: project.direction })
    })
    if (r.ok) { setEditName(false); load(); if (onUpdate) onUpdate() }
  }

  const createEvolution = async (mode) => {
    setShowModeModal(false)
    setCreating(true)
    await fetch(`${API}/api/projects/${id}/evolution`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    })
    await load()
    setCreating(false)
  }

  const deleteProject = async () => {
    setDeleting(true)
    await fetch(`${API}/api/projects/${id}`, { method: 'DELETE' })
    if (onUpdate) onUpdate()
    navigate('/create-project')
  }

  if (loading) return (
    <div style={{ padding: 40 }}>
      <div className="progress-track" style={{ maxWidth: 200 }}><div className="progress-fill indeterminate" /></div>
    </div>
  )

  if (error) return (
    <div style={{ padding: 40 }}><div className="validation-msg warn">{error}</div></div>
  )

  const evos = project.evolutions || []

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            {editName ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <input
                  value={nameVal} onChange={e => setNameVal(e.target.value)}
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '6px 10px', fontSize: 20, fontWeight: 600 }}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false) }}
                  autoFocus
                />
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={saveName}>✓</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setEditName(false)}>✕</button>
              </div>
            ) : (
              <h1 className="page-title" style={{ cursor: 'pointer' }} onClick={() => setEditName(true)}>
                {project.name} <span style={{ fontSize: 14, opacity: 0.3, fontWeight: 400 }}>✎</span>
              </h1>
            )}
            <p className="page-subtitle">Mode Projet — Pipeline Image → Vidéo → Extension</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '8px 18px' }}
              onClick={() => setShowModeModal(true)}
              disabled={creating}
            >
              {creating ? '…' : '+ Nouvelle évolution'}
            </button>
            {confirmDel ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Supprimer le projet ?</span>
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                  onClick={deleteProject} disabled={deleting}>{deleting ? '…' : 'Oui'}</button>
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }}
                  onClick={() => setConfirmDel(false)}>Non</button>
              </div>
            ) : (
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '8px 16px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                onClick={() => setConfirmDel(true)}>
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Direction artistique */}
      <DirectionPanel
        direction={project.direction} projectId={id}
        onSaved={() => { load(); if (onUpdate) onUpdate() }}
      />

      {/* Montage */}
      <MontageSection projectId={id} />

      {/* Médias du projet */}
      <div style={{ marginTop: 48 }}>
        <ProjectMediaSection projectId={id} />
      </div>

      {/* Évolutions */}
      <div
        className="section-title"
        style={{ marginBottom: evosOpen ? 20 : 0, fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        onClick={() => setEvosOpen(v => !v)}
      >
        <span>Évolutions {evos.length > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-3)', textTransform: 'none', letterSpacing: 0 }}>({evos.length})</span>}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{evosOpen ? '▼' : '▶'}</span>
      </div>

      {evosOpen && (evos.length === 0 ? (
        <div className="empty-state">
          <p>Aucune évolution. Cliquez sur « + Nouvelle évolution » pour commencer le pipeline.</p>
        </div>
      ) : (
        evos.map(evo => (
          <EvolutionCard
            key={evo.id} evo={evo} projectId={id}
            direction={project.direction} onUpdate={load} onDelete={load}
          />
        ))
      ))}

      {/* Mode selection modal */}
      {showModeModal && (
        <ModeSelectionModal
          onSelect={createEvolution}
          onClose={() => setShowModeModal(false)}
        />
      )}

    </>
  )
}
