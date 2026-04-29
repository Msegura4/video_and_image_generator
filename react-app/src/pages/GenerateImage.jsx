import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SIZES = [
  { label: '1024 × 1024', value: '1024x1024', w: 1024, h: 1024 },
  { label: '1024 × 768',  value: '1024x768',  w: 1024, h: 768  },
  { label: '768 × 1024',  value: '768x1024',  w: 768,  h: 1024 },
]

const CAMERA_ANGLES = [
  { value: '', label: '—' },
  { value: 'straight camera angle', label: 'Frontal' },
  { value: 'slight low angle shot, looking up', label: 'Légère contre-plongée' },
  { value: 'low angle shot, strong counter-plunge', label: 'Contre-plongée forte' },
  { value: 'high angle, slight plunge', label: 'Légère plongée' },
  { value: 'high angle, steep plunge shot', label: 'Plongée forte' },
  { value: 'overhead bird\'s eye view', label: 'Vue aérienne (top)' },
  { value: 'drone shot angle', label: 'Drone' },
  { value: 'dutch angle, tilted frame', label: 'Angle néerlandais (tilt)' },
]

const SHOT_TYPES = [
  { value: '', label: '—' },
  { value: 'extreme close-up shot', label: 'Très gros plan' },
  { value: 'close-up shot', label: 'Gros plan' },
  { value: 'medium close-up shot', label: 'Plan rapproché' },
  { value: 'medium shot', label: 'Plan moyen' },
  { value: 'medium full shot', label: 'Plan américain' },
  { value: 'full shot', label: 'Plan pied' },
  { value: 'long shot', label: 'Plan large' },
  { value: 'extreme long shot', label: 'Plan très large' },
  { value: 'wide establishing shot', label: 'Plan d\'ensemble' },
]

const LENSES = [
  { value: '', label: '—' },
  { value: '14mm ultra-wide lens', label: '14mm — Ultra grand angle' },
  { value: '24mm wide-angle lens', label: '24mm — Grand angle' },
  { value: '35mm lens', label: '35mm — Semi grand angle' },
  { value: '50mm standard lens', label: '50mm — Standard' },
  { value: '85mm portrait lens', label: '85mm — Portrait' },
  { value: '135mm telephoto lens', label: '135mm — Télé court' },
  { value: '200mm telephoto lens', label: '200mm — Télé' },
  { value: '400mm super telephoto lens', label: '400mm — Super télé' },
]

// Construit le prompt final à partir des champs
function buildPrompt(fields) {
  const parts = []

  if (fields.style)       parts.push(fields.style)
  if (fields.shotType)    parts.push(fields.shotType)
  if (fields.cameraAngle) parts.push(fields.cameraAngle)
  if (fields.lens)        parts.push(fields.lens)
  if (fields.composition) parts.push(fields.composition)
  if (fields.lighting)    parts.push(fields.lighting)
  if (fields.colors)      parts.push(fields.colors)
  if (fields.extra)       parts.push(fields.extra)

  return parts.join(', ')
}

export default function GenerateImage() {
  const navigate = useNavigate()
  const [size, setSize]     = useState('1024x1024')
  const [useRef_, setUseRef] = useState(false)
  const [refImage, setRefImage] = useState(null)
  const [refPreview, setRefPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const [fields, setFields] = useState({
    style:       'Photorealistic and cinematic. Real textures, natural skin, realistic motion blur, physically plausible reflections.',
    cameraAngle: '',
    shotType:    '',
    lens:        '',
    composition: '',
    lighting:    '',
    colors:      '',
    extra:       '',
  })

  // Preset loader state
  const [presets, setPresets]           = useState([])          // image presets list
  const [presetsLoading, setPresetsLoading] = useState(false)
  const [showPresetPanel, setShowPresetPanel] = useState(false)
  const [loadedPreset, setLoadedPreset] = useState(null)        // { id, name }

  const [showPrompt, setShowPrompt] = useState(false)
  const [status, setStatus]     = useState(null)
  const [jobId, setJobId]       = useState(null)
  const [imagePath, setImagePath] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const fileRef = useRef(null)

  // Fetch image presets on demand
  const fetchPresets = useCallback(async () => {
    setPresetsLoading(true)
    try {
      const r = await fetch(`${API}/api/prompts`)
      const d = await r.json()
      // d is { presets: [...], count: N }
      const imagePresets = (d.presets || [])
        .filter(p => p.type === 'image')
        .map(p => ({ id: p.name, name: p.display_name || p.name, description: p.description, preview: p.base_preview }))
      setPresets(imagePresets)
    } catch {
      setPresets([])
    } finally {
      setPresetsLoading(false)
    }
  }, [])

  const togglePresetPanel = () => {
    if (!showPresetPanel && presets.length === 0) fetchPresets()
    setShowPresetPanel(v => !v)
  }

  const applyPreset = async (preset) => {
    try {
      // Fetch full preset detail
      const r = await fetch(`${API}/api/prompts/${preset.id}`)
      const d = await r.json()
      const data = d.data || {}
      setFields(f => ({
        ...f,
        style:       data.style        || f.style,
        cameraAngle: data.camera_angle  || '',
        shotType:    data.shot_type     || '',
        lens:        data.lens          || '',
        composition: data.composition   || '',
        lighting:    data.lighting      || '',
        colors:      data.colors        || '',
      }))
      setLoadedPreset({ id: preset.id, name: preset.name })
      setShowPresetPanel(false)
    } catch {
      // silently fail — fields keep their current values
    }
  }

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }))

  const selectedSize = SIZES.find(s => s.value === size)
  const finalPrompt  = buildPrompt(fields)
  const canGenerate  = finalPrompt.length > 10 && status == null

  const handleRefFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setRefImage(file)
    setRefPreview(URL.createObjectURL(file))
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleRefFile(e.dataTransfer.files[0])
  }, [handleRefFile])

  const poll = (id) => {
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/job/${id}`)
        const d = await r.json()
        if (d.status === 'completed') {
          clearInterval(interval)
          setImagePath(d.image_path)
          setStatus('done')
        } else if (d.status === 'failed') {
          clearInterval(interval)
          setErrorMsg(d.error || 'Génération échouée.')
          setStatus('error')
        }
      } catch {
        clearInterval(interval)
        setErrorMsg('Erreur réseau.')
        setStatus('error')
      }
    }, 3000)
  }

  const generate = async () => {
    if (!canGenerate) return
    setStatus('loading')
    setImagePath(null)
    setErrorMsg('')

    const body = new FormData()
    body.append('prompt', finalPrompt)
    body.append('model', 'flux-schnell')
    body.append('width', selectedSize.w)
    body.append('height', selectedSize.h)

    try {
      const r = await fetch(`${API}/api/generate-image`, { method: 'POST', body })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur API')
      setJobId(d.job_id)
      setStatus('polling')
      poll(d.job_id)
    } catch (e) {
      setErrorMsg(e.message)
      setStatus('error')
    }
  }

  const reset = () => {
    setStatus(null); setJobId(null); setImagePath(null); setErrorMsg('')
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Générer Image</h1>
        <p className="page-subtitle">Génération FLUX.1 — construis ton prompt couche par couche</p>
      </div>

      <div className="two-col">
        {/* ── GAUCHE — PARAMÈTRES ── */}
        <div>

          {/* ── LOADER PRESET ── */}
          <div className="section" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className={`btn ${showPresetPanel ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 11, padding: '6px 14px' }}
                onClick={togglePresetPanel}
              >
                {showPresetPanel ? 'Fermer les presets' : 'Charger un preset →'}
              </button>
              {loadedPreset && (
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  Preset chargé : <strong style={{ color: 'var(--text-2)' }}>{loadedPreset.name}</strong>
                  <button
                    style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                    onClick={() => setLoadedPreset(null)}
                  >✕</button>
                </span>
              )}
            </div>

            {showPresetPanel && (
              <div style={{ marginTop: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {presetsLoading ? (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-3)' }}>Chargement...</div>
                ) : presets.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span>Aucun preset image trouvé.</span>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 12px', alignSelf: 'flex-start' }}
                      onClick={() => navigate('/create-preset')}>
                      Créer un preset →
                    </button>
                  </div>
                ) : (
                  presets.map(p => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                        borderBottom: '1px solid var(--border)', cursor: 'pointer',
                        textAlign: 'left', gap: 2,
                        transition: 'background 120ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</span>
                      {p.description && (
                        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{p.description}</span>
                      )}
                      {p.preview && (
                        <span style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5 }}>{p.preview}</span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace', marginTop: 2 }}>{p.id}</span>
                    </button>
                  ))
                )}
                <button
                  style={{
                    display: 'flex', width: '100%', padding: '10px 16px', background: 'none',
                    border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-3)',
                    justifyContent: 'center', gap: 4,
                  }}
                  onClick={fetchPresets}
                >
                  ↺ Rafraîchir
                </button>
              </div>
            )}
          </div>

          {/* Style */}
          <div className="section">
            <div className="section-label section-title">Style visuel</div>
            <div className="field">
              <label className="field-label">Style général</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Ex: Photorealistic and cinematic, film grain, real textures..."
                value={fields.style}
                onChange={set('style')}
              />
            </div>
          </div>

          {/* Caméra */}
          <div className="section">
            <div className="section-label section-title">Caméra</div>
            <div className="field-row">
              <div className="field">
                <label className="field-label">Angle</label>
                <select className="select" value={fields.cameraAngle} onChange={set('cameraAngle')}>
                  {CAMERA_ANGLES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Type de plan</label>
                <select className="select" value={fields.shotType} onChange={set('shotType')}>
                  {SHOT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Objectif</label>
              <select className="select" value={fields.lens} onChange={set('lens')}>
                {LENSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Composition */}
          <div className="section">
            <div className="section-label section-title">Composition</div>
            <div className="field">
              <label className="field-label">
                Composition
                <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>
                  — du général au particulier
                </span>
              </label>
              <textarea
                className="textarea"
                rows={5}
                style={{ minHeight: 110 }}
                placeholder={"Premier plan : ...\nPlan intermédiaire : ...\nArrière-plan : ...\nLignes directrices : ..."}
                value={fields.composition}
                onChange={set('composition')}
              />
            </div>
          </div>

          {/* Lumière */}
          <div className="section">
            <div className="section-label section-title">Lumière & Couleurs</div>
            <div className="field">
              <label className="field-label">Éclairage</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder={"Ex: Golden hour, soft lateral light, long shadows,\nwarm highlights, deep shadow contrast..."}
                value={fields.lighting}
                onChange={set('lighting')}
              />
            </div>
            <div className="field">
              <label className="field-label">Couleurs & tons</label>
              <input
                className="input"
                placeholder="Ex: Desaturated earth tones, warm amber highlights, cold shadows..."
                value={fields.colors}
                onChange={set('colors')}
              />
            </div>
          </div>

          {/* Extra */}
          <div className="section">
            <div className="section-label section-title">Détails supplémentaires <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span></div>
            <div className="field">
              <input
                className="input"
                placeholder="Ex: 8K, film grain, cinematic, hyper-detailed..."
                value={fields.extra}
                onChange={set('extra')}
              />
            </div>
          </div>

          {/* Image de référence */}
          <div className="section">
            <div className="section-label section-title">Image de référence <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: useRef_ ? 12 : 0 }}>
              <button
                className={`btn ${useRef_ ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 11, padding: '6px 14px' }}
                onClick={() => { setUseRef(!useRef_); if (useRef_) { setRefImage(null); setRefPreview(null) } }}
              >
                {useRef_ ? 'Activée' : 'Ajouter une référence'}
              </button>
              {useRef_ && refImage && (
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{refImage.name}</span>
              )}
            </div>

            {useRef_ && !refPreview && (
              <div
                className={`upload-zone${dragOver ? ' drag-over' : ''}`}
                onClick={() => fileRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                style={{ padding: '20px 16px' }}
              >
                <div className="upload-icon" style={{ fontSize: 20 }}>↑</div>
                <div className="upload-text">Glisser ou cliquer</div>
                <div className="upload-hint">PNG · JPG · WEBP</div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => handleRefFile(e.target.files[0])} />
              </div>
            )}

            {useRef_ && refPreview && (
              <div className="upload-preview">
                <img src={refPreview} alt="ref" style={{ maxHeight: 140, objectFit: 'cover' }} />
                <div className="upload-preview-name">
                  <span>{refImage.name}</span>
                  <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }}
                    onClick={() => { setRefImage(null); setRefPreview(null) }}>Changer</button>
                </div>
              </div>
            )}
          </div>

          {/* Résultat */}
          {status === 'done' && imagePath && (
            <div className="image-result">
              <img
                src={`${API}/outputs/images/${imagePath.split('/').pop()}`}
                alt="generated"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div className="video-result-footer">
                <span className="label" style={{ color: 'var(--success)' }}>Image générée</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{imagePath.split('/').pop()}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── DROITE — APERÇU + ACTION ── */}
        <div>
          <div className="card">
            <div className="section-label" style={{ marginBottom: 12 }}>Estimation</div>
            <div className="cost-display">$0.003</div>
            <div className="cost-tag">↑ FLUX Schnell</div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 12 }} />

            {/* Dimensions */}
            <div className="field">
              <label className="field-label">Dimensions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SIZES.map(s => (
                  <button
                    key={s.value}
                    className={`btn ${size === s.value ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 11, padding: '7px 12px', justifyContent: 'flex-start' }}
                    onClick={() => setSize(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4, marginBottom: 12 }} />

            {/* Prompt preview toggle */}
            <button
              className="btn btn-ghost btn-full"
              style={{ fontSize: 11, marginBottom: 12 }}
              onClick={() => setShowPrompt(v => !v)}
            >
              {showPrompt ? 'Masquer le prompt' : 'Voir le prompt final →'}
            </button>

            {showPrompt && (
              <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 12, maxHeight: 160, overflowY: 'auto', wordBreak: 'break-word' }}>
                {finalPrompt || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Prompt vide</span>}
              </div>
            )}

            {finalPrompt.length <= 10 && (
              <div className="validation-msg">Remplis au moins un champ de paramètre</div>
            )}

            <button
              className="btn btn-primary btn-full"
              disabled={!canGenerate}
              onClick={generate}
            >
              Générer l'image →
            </button>

            {status === 'done' && (
              <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={reset}>
                Nouvelle image
              </button>
            )}
          </div>

          {(status === 'loading' || status === 'polling') && (
            <div className="status-bar" style={{ marginTop: 16 }}>
              <div className="status-label">
                {status === 'loading' ? 'Lancement' : 'Génération en cours'}
              </div>
              <div className="progress-track">
                <div className="progress-fill indeterminate" />
              </div>
              <div className="status-text">
                {status === 'loading' ? 'Envoi...' : `Job : ${jobId?.slice(0, 8)}...`}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="validation-msg warn" style={{ marginTop: 16 }}>{errorMsg}</div>
          )}

          {/* Guide */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="section-label" style={{ marginBottom: 12 }}>Guide prompt</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 8 }}>Décris <strong style={{ color: 'var(--text-2)' }}>du général au particulier</strong> — commence par ce qui saute aux yeux, affine couche par couche.</p>
              <p>Utilise des <strong style={{ color: 'var(--text-2)' }}>repères spatiaux concrets</strong> : « en haut à gauche », « au premier tiers », « centré légèrement vers le bas » — jamais « à côté » ou « au milieu ».</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
