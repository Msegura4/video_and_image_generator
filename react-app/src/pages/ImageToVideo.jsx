import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4']
const DURATIONS     = [5, 10]
const MODES         = [{ value: 'professional', label: 'Professional' }, { value: 'standard', label: 'Standard' }]
const VERSIONS      = [{ value: '2.5', label: 'Kling 2.5' }, { value: '2.0', label: 'Kling 2.0' }, { value: '1.6', label: 'Kling 1.6' }]

function computeCost(version, mode, duration) {
  if (version === '2.5') return duration === 5 ? 0.33 : 0.66
  if (mode === 'professional') return duration === 5 ? 0.46 : 0.92
  return duration === 5 ? 0.26 : 0.52
}

// ── Source Image Picker ──────────────────────────────────────────────────────
function ImageSourcePicker({ image, imageUrl, preview, onFile, onUrl, onClear, fileRef }) {
  const [tab, setTab]               = useState('ordi')
  const [dragOver, setDragOver]     = useState(false)
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(false)

  const loadTab = async (t) => {
    setTab(t)
    if (t === 'ordi') return
    setLoading(true)
    setItems([])
    try {
      if (t === 'creations') {
        const r = await fetch(`${API}/api/creations/images`)
        const d = await r.json()
        setItems((d.images || []).map(img => ({ url: img.url, thumb: img.url })))
      } else if (t === 'inspirations') {
        const r = await fetch(`${API}/api/inspirations`)
        const d = await r.json()
        setItems((d.inspirations || []).map(ins => ({ url: ins.url, thumb: ins.url })))
      }
    } catch { setItems([]) }
    finally { setLoading(false) }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) onFile(file)
  }, [onFile])

  // If already has an image selected, show preview
  if (preview) {
    return (
      <div className="upload-preview">
        <img src={preview} alt="preview" />
        <div className="upload-preview-name">
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {image ? image.name : 'Image sélectionnée'}
          </span>
          <button
            className="btn btn-ghost"
            style={{ padding: '4px 12px', fontSize: 11 }}
            onClick={onClear}
          >
            Changer
          </button>
        </div>
      </div>
    )
  }

  // Tab bar
  const tabStyle = (t) => ({
    flex: 1,
    padding: '8px 0',
    fontSize: 11,
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? 'var(--text)' : 'var(--text-3)',
    background: tab === t ? 'var(--bg-3)' : 'transparent',
    border: 'none',
    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 120ms',
  })

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <button style={tabStyle('ordi')}        onClick={() => loadTab('ordi')}>Depuis l'ordi</button>
        <button style={tabStyle('creations')}   onClick={() => loadTab('creations')}>Mes Créations</button>
        <button style={tabStyle('inspirations')} onClick={() => loadTab('inspirations')}>Inspirations</button>
      </div>

      {/* Tab content */}
      {tab === 'ordi' && (
        <div
          className={`upload-zone${dragOver ? ' drag-over' : ''}`}
          style={{ border: 'none', borderRadius: 0 }}
          onClick={() => fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="upload-icon">↑</div>
          <div className="upload-text">Glisser une image ou cliquer pour parcourir</div>
          <div className="upload-hint">PNG · JPG · WEBP · max 200 MB</div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]) }}
          />
        </div>
      )}

      {(tab === 'creations' || tab === 'inspirations') && (
        <div style={{ padding: 12, minHeight: 140 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text-3)' }}>
              Chargement...
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text-3)' }}>
              {tab === 'creations' ? 'Aucune image générée' : 'Aucune inspiration'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 8,
              maxHeight: 280,
              overflowY: 'auto',
            }}>
              {items.map((item, i) => (
                <div
                  key={i}
                  onClick={() => onUrl(item.url)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 6,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    transition: 'border-color 120ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <img
                    src={item.thumb}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

export default function ImageToVideo() {
  const navigate = useNavigate()

  const [image, setImage]         = useState(null)   // File | null
  const [imageUrl, setImageUrl]   = useState(null)   // string | null (for media picked by URL)
  const [preview, setPreview]     = useState(null)
  const [prompt, setPrompt]       = useState('')
  const [negPrompt, setNegPrompt] = useState('')
  const [duration, setDuration]   = useState(5)
  const [ratio, setRatio]         = useState('16:9')
  const [mode, setMode]           = useState('professional')
  const [version, setVersion]     = useState('2.5')

  const [status, setStatus]     = useState(null) // null | 'loading' | 'polling' | 'done' | 'error'
  const [taskId, setTaskId]     = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Preset loader state
  const [presets, setPresets]               = useState([])
  const [presetsLoading, setPresetsLoading] = useState(false)
  const [showPresetPanel, setShowPresetPanel] = useState(false)
  const [loadedPreset, setLoadedPreset]     = useState(null)

  // Save-as-preset state
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveName, setSaveName]         = useState('')
  const [saveDesc, setSaveDesc]         = useState('')
  const [saveStatus, setSaveStatus]     = useState(null) // null | 'loading' | 'ok' | 'error'
  const [saveError, setSaveError]       = useState('')

  const fileRef = useRef(null)
  const pollRef = useRef(null)

  // ── Preset loader ──
  const fetchPresets = useCallback(async () => {
    setPresetsLoading(true)
    try {
      const r = await fetch(`${API}/api/prompts`)
      const d = await r.json()
      const i2vPresets = (d.presets || [])
        .filter(p => p.type === 'img2video')
        .map(p => ({
          id: p.name,
          name: p.display_name || p.name,
          description: p.description,
          preview: p.base_preview,
          settings: { model_version: p.model_version, duration: p.duration, aspect_ratio: p.aspect_ratio, mode: p.mode },
        }))
      setPresets(i2vPresets)
    } catch { setPresets([]) }
    finally { setPresetsLoading(false) }
  }, [])

  const togglePresetPanel = () => {
    if (!showPresetPanel && presets.length === 0) fetchPresets()
    setShowPresetPanel(v => !v)
  }

  const applyPreset = async (preset) => {
    try {
      const r = await fetch(`${API}/api/prompts/${preset.id}`)
      const d = await r.json()
      const data = d.data || {}
      const rs   = data.recommended_settings || {}
      if (data.prompt)          setPrompt(data.prompt)
      if (data.negative_prompt) setNegPrompt(data.negative_prompt)
      if (rs.aspect_ratio)      setRatio(rs.aspect_ratio)
      if (rs.duration)          setDuration(Number(rs.duration))
      if (rs.mode)              setMode(rs.mode)
      if (rs.model_version)     setVersion(rs.model_version)
      setLoadedPreset({ id: preset.id, name: preset.name })
      setShowPresetPanel(false)
    } catch { /* silently fail */ }
  }

  // ── Save as preset ──
  const saveAsPreset = async () => {
    if (!saveName.trim()) return
    setSaveStatus('loading')
    setSaveError('')
    const presetId = saveName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const body = {
      preset_id:      presetId,
      preset_type:    'img2video',
      name:           saveName,
      description:    saveDesc,
      base_prompt:    prompt,
      negative_prompt: negPrompt,
      style_keywords: [],
      recommended_settings: {
        aspect_ratio:  ratio,
        duration:      Number(duration),
        mode,
        model_version: version,
      },
    }
    try {
      const r = await fetch(`${API}/api/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur API')
      setSaveStatus('ok')
      setLoadedPreset({ id: presetId, name: saveName })
    } catch (e) {
      setSaveError(e.message)
      setSaveStatus('error')
    }
  }

  const cost = computeCost(version, mode, duration)

  // ── Image selection handlers ──
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImage(file)
    setImageUrl(null)
    setPreview(URL.createObjectURL(file))
  }

  const handleUrl = (url) => {
    setImageUrl(url)
    setImage(null)
    setPreview(url)
  }

  const clearImage = () => {
    setImage(null)
    setImageUrl(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Polling ──
  const poll = (id) => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/task/${id}`)
        const d = await r.json()
        if (d.status === 'completed') {
          clearInterval(pollRef.current)
          setVideoUrl(d.video_url)
          setStatus('done')
        } else if (d.status === 'failed') {
          clearInterval(pollRef.current)
          setErrorMsg('La génération a échoué.')
          setStatus('error')
        }
      } catch {
        clearInterval(pollRef.current)
        setErrorMsg('Erreur réseau lors du polling.')
        setStatus('error')
      }
    }, 4000)
  }

  // ── Generate ──
  const generate = async () => {
    if ((!image && !imageUrl) || !prompt.trim()) return
    setStatus('loading')
    setVideoUrl(null)
    setErrorMsg('')

    try {
      let imageFile = image

      // If selected from app media (URL), fetch and convert to File
      if (!imageFile && imageUrl) {
        const res = await fetch(imageUrl)
        const blob = await res.blob()
        const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
        imageFile = new File([blob], `source.${ext}`, { type: blob.type })
      }

      const body = new FormData()
      body.append('image', imageFile)
      body.append('prompt', prompt)
      body.append('duration', duration)
      body.append('aspect_ratio', ratio)
      body.append('mode', mode)
      body.append('model_version', version)
      if (negPrompt.trim()) body.append('negative_prompt', negPrompt)

      const r = await fetch(`${API}/api/image-to-video`, { method: 'POST', body })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur API')
      setTaskId(d.task_id)
      setStatus('polling')
      poll(d.task_id)
    } catch (e) {
      setErrorMsg(e.message)
      setStatus('error')
    }
  }

  const reset = () => {
    clearInterval(pollRef.current)
    setStatus(null); setTaskId(null); setVideoUrl(null); setErrorMsg('')
    clearImage()
  }

  const canGenerate = (image || imageUrl) && prompt.trim() && status == null

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Image → Vidéo</h1>
        <p className="page-subtitle">Génère une vidéo à partir d'une image avec Kling AI</p>
      </div>

      <div className="two-col">
        {/* ── GAUCHE ── */}
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
                  Preset : <strong style={{ color: 'var(--text-2)' }}>{loadedPreset.name}</strong>
                  <button style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                    onClick={() => setLoadedPreset(null)}>✕</button>
                </span>
              )}
            </div>

            {showPresetPanel && (
              <div style={{ marginTop: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {presetsLoading ? (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-3)' }}>Chargement...</div>
                ) : presets.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span>Aucun preset Image→Vidéo trouvé.</span>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 12px', alignSelf: 'flex-start' }}
                      onClick={() => navigate('/create-preset')}>
                      Créer un preset →
                    </button>
                  </div>
                ) : (
                  presets.map(p => (
                    <button key={p.id} onClick={() => applyPreset(p)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                        borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', gap: 2,
                        transition: 'background 120ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</span>
                      {p.description && <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{p.description}</span>}
                      {p.settings && (
                        <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                          {[`Kling ${p.settings.model_version}`, `${p.settings.duration}s`, p.settings.mode, p.settings.aspect_ratio].map(t => (
                            <span key={t} className="pill" style={{ fontSize: 9, padding: '2px 5px' }}>{t}</span>
                          ))}
                        </div>
                      )}
                      {p.preview && <span style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5, marginTop: 4 }}>{p.preview}</span>}
                    </button>
                  ))
                )}
                <button style={{ display: 'flex', width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-3)', justifyContent: 'center' }}
                  onClick={fetchPresets}>↺ Rafraîchir</button>
              </div>
            )}
          </div>

          {/* ── IMAGE SOURCE ── */}
          <div className="section">
            <div className="section-label section-title">Image source</div>
            <ImageSourcePicker
              image={image}
              imageUrl={imageUrl}
              preview={preview}
              onFile={handleFile}
              onUrl={handleUrl}
              onClear={clearImage}
              fileRef={fileRef}
            />
          </div>

          {/* Prompt */}
          <div className="section">
            <div className="section-label section-title">Paramètres</div>

            <div className="field">
              <label className="field-label">Prompt de mouvement</label>
              <textarea
                className="textarea"
                rows={4}
                placeholder={"Ex: Slow camera zoom in, cinematic lighting\nSmooth pan from left to right\nCamera moving forward, epic scale"}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">Negative prompt <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span></label>
              <input
                className="input"
                placeholder="Ex: motion blur, low quality, watermark..."
                value={negPrompt}
                onChange={(e) => setNegPrompt(e.target.value)}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Durée</label>
                <select className="select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Format</label>
                <select className="select" value={ratio} onChange={(e) => setRatio(e.target.value)}>
                  {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Modèle</label>
                <select className="select" value={version} onChange={(e) => setVersion(e.target.value)}>
                  {VERSIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Mode</label>
                <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                  {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── DROITE ── */}
        <div>
          <div className="card">
            <div className="section-label" style={{ marginBottom: 12 }}>Estimation</div>
            <div className="cost-display">${cost.toFixed(2)}</div>
            <div className="cost-tag">
              ↑ {duration}s {mode}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }} />

            {!image && !imageUrl && (
              <div className="validation-msg">Sélectionne une image source</div>
            )}
            {!prompt.trim() && (
              <div className="validation-msg">Entre un prompt de mouvement</div>
            )}

            <button
              className="btn btn-primary btn-full"
              disabled={!canGenerate}
              onClick={generate}
            >
              Générer la vidéo →
            </button>

            {status === 'done' && (
              <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={reset}>
                Nouvelle génération
              </button>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }} />

            {/* ── SAUVEGARDER COMME PRESET ── */}
            {!showSaveForm ? (
              <button
                className="btn btn-ghost btn-full"
                style={{ fontSize: 11 }}
                disabled={!prompt.trim()}
                onClick={() => { setShowSaveForm(true); setSaveStatus(null); setSaveError('') }}
              >
                Sauvegarder comme preset ↓
              </button>
            ) : saveStatus === 'ok' ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>
                  Preset <strong>{saveName}</strong> créé
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: 11 }}
                    onClick={() => navigate('/prompts')}>Voir les presets</button>
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: 11 }}
                    onClick={() => { setShowSaveForm(false); setSaveName(''); setSaveDesc(''); setSaveStatus(null) }}>
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label className="field-label" style={{ marginBottom: 4 }}>Nom du preset</label>
                  <input className="input" placeholder="Ex: Zoom lent épique..." value={saveName}
                    onChange={e => setSaveName(e.target.value)} />
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label className="field-label" style={{ marginBottom: 4 }}>Description <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span></label>
                  <input className="input" placeholder="..." value={saveDesc}
                    onChange={e => setSaveDesc(e.target.value)} />
                </div>
                {saveError && <div className="validation-msg warn" style={{ marginBottom: 10 }}>{saveError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 11 }}
                    disabled={!saveName.trim() || saveStatus === 'loading'}
                    onClick={saveAsPreset}>
                    {saveStatus === 'loading' ? 'Sauvegarde...' : 'Sauvegarder →'}
                  </button>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '0 12px' }}
                    onClick={() => { setShowSaveForm(false); setSaveName(''); setSaveDesc('') }}>
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          {(status === 'loading' || status === 'polling') && (
            <div className="status-bar" style={{ marginTop: 16 }}>
              <div className="status-label">
                {status === 'loading' ? 'Envoi en cours' : 'Génération en cours'}
              </div>
              <div className="progress-track">
                <div className="progress-fill indeterminate" />
              </div>
              <div className="status-text">
                {status === 'loading' ? "Traitement de l'image..." : `Task ID : ${taskId?.slice(0, 8)}...`}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="validation-msg warn" style={{ marginTop: 16 }}>
              {errorMsg}
            </div>
          )}

          {status === 'done' && videoUrl && (
            <div className="video-result">
              <video src={videoUrl} controls autoPlay loop />
              <div className="video-result-footer">
                <span className="label" style={{ color: 'var(--success)' }}>Terminé</span>
                <a href={videoUrl} download className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 11 }}>
                  Télécharger ↓
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
