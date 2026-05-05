import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Video Source Picker ──────────────────────────────────────────────────────
function VideoSourcePicker({ video, videoUrl, preview, onFile, onUrl, onClear, fileRef }) {
  const [tab, setTab]           = useState('ordi')
  const [dragOver, setDragOver] = useState(false)
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(false)

  const loadCreations = async () => {
    setLoading(true)
    setItems([])
    try {
      const r = await fetch(`${API}/api/creations/videos`)
      const d = await r.json()
      setItems(d.videos || [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }

  const switchTab = (t) => {
    setTab(t)
    if (t === 'creations') loadCreations()
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) onFile(file)
  }, [onFile])

  if (preview) {
    return (
      <div className="upload-preview">
        <video src={preview} controls style={{ width: '100%', maxHeight: 200, display: 'block' }} />
        <div className="upload-preview-name">
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {video ? video.name : 'Vidéo sélectionnée'}
          </span>
          <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }} onClick={onClear}>
            Changer
          </button>
        </div>
      </div>
    )
  }

  const tabStyle = (t) => ({
    flex: 1, padding: '8px 0', fontSize: 11,
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? 'var(--text)' : 'var(--text-3)',
    background: tab === t ? 'var(--bg-3)' : 'transparent',
    border: 'none',
    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
    cursor: 'pointer', transition: 'all 120ms',
  })

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <button style={tabStyle('ordi')}      onClick={() => switchTab('ordi')}>Depuis l'ordi</button>
        <button style={tabStyle('creations')} onClick={() => switchTab('creations')}>Mes Créations</button>
      </div>

      {tab === 'ordi' && (
        <div
          className={`upload-zone${dragOver ? ' drag-over' : ''}`}
          style={{ border: 'none', borderRadius: 0 }}
          onClick={() => fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="upload-icon">▶</div>
          <div className="upload-text">Glisser une vidéo ou cliquer pour parcourir</div>
          <div className="upload-hint">MP4 · MOV · WEBM · max 200 MB</div>
          <input
            ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]) }}
          />
        </div>
      )}

      {tab === 'creations' && (
        <div style={{ padding: 12, minHeight: 140 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text-3)' }}>
              Chargement...
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text-3)' }}>
              Aucune vidéo générée
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 8, maxHeight: 280, overflowY: 'auto',
            }}>
              {items.map((item, i) => (
                <div
                  key={i}
                  onClick={() => onUrl(item.url)}
                  style={{
                    aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden',
                    cursor: 'pointer', border: '2px solid transparent', transition: 'border-color 120ms',
                    background: 'var(--bg-3)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <video src={item.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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

export default function ExtendVideo() {
  const navigate = useNavigate()

  const [video, setVideo]           = useState(null)   // File | null
  const [videoUrl, setVideoUrl]     = useState(null)   // string | null
  const [videoPreview, setVideoPreview] = useState(null)
  const [prompt, setPrompt]         = useState('')
  const [duration, setDuration]     = useState(5)
  const [mode, setMode]             = useState('professional')

  const [status, setStatus]       = useState(null)
  const [jobId, setJobId]         = useState(null)
  const [resultPath, setResultPath] = useState(null)
  const [errorMsg, setErrorMsg]   = useState('')

  // Preset loader state
  const [presets, setPresets]               = useState([])
  const [presetsLoading, setPresetsLoading] = useState(false)
  const [showPresetPanel, setShowPresetPanel] = useState(false)
  const [loadedPreset, setLoadedPreset]     = useState(null)

  // Save-as-preset state
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveName, setSaveName]         = useState('')
  const [saveDesc, setSaveDesc]         = useState('')
  const [saveStatus, setSaveStatus]     = useState(null)
  const [saveError, setSaveError]       = useState('')

  const fileRef = useRef(null)

  const cost = mode === 'professional'
    ? (duration === 5 ? 0.33 : 0.66)
    : (duration === 5 ? 0.16 : 0.32)

  const canGenerate = (video || videoUrl) && status == null

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return
    setVideo(file)
    setVideoUrl(null)
    setVideoPreview(URL.createObjectURL(file))
  }

  const handleUrl = (url) => {
    setVideoUrl(url)
    setVideo(null)
    setVideoPreview(url)
  }

  const clearVideo = () => {
    setVideo(null)
    setVideoUrl(null)
    setVideoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }, [])

  // ── Preset loader ──
  const fetchPresets = useCallback(async () => {
    setPresetsLoading(true)
    try {
      const r = await fetch(`${API}/api/prompts`)
      const d = await r.json()
      const evPresets = (d.presets || [])
        .filter(p => p.type === 'extendvideo')
        .map(p => ({
          id: p.name,
          name: p.display_name || p.name,
          description: p.description,
          preview: p.base_preview,
          settings: { duration: p.duration, mode: p.mode },
        }))
      setPresets(evPresets)
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
      if (data.prompt !== undefined) setPrompt(data.prompt)
      if (rs.duration) setDuration(Number(rs.duration))
      if (rs.mode)     setMode(rs.mode)
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
      preset_id:   presetId,
      preset_type: 'extendvideo',
      name:        saveName,
      description: saveDesc,
      base_prompt: prompt,
      style_keywords: [],
      recommended_settings: {
        duration: Number(duration),
        mode,
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

  const poll = (id) => {
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/job/${id}`)
        const d = await r.json()
        if (d.status === 'completed') {
          clearInterval(interval)
          setResultPath(d.video_path)
          setStatus('done')
        } else if (d.status === 'failed') {
          clearInterval(interval)
          setErrorMsg(d.error || 'Extension échouée.')
          setStatus('error')
        }
      } catch {
        clearInterval(interval)
        setErrorMsg('Erreur réseau.')
        setStatus('error')
      }
    }, 4000)
  }

  const generate = async () => {
    if (!canGenerate) return
    setStatus('loading')
    setResultPath(null)
    setErrorMsg('')

    try {
      const body = new FormData()
      if (video) {
        body.append('video', video)
      } else if (videoUrl) {
        // Envoyer l'URL — le backend télécharge la vidéo (évite CORS)
        body.append('video_url', videoUrl)
      }
      if (prompt.trim()) body.append('continuation_prompt', prompt)
      body.append('duration', duration)
      body.append('mode', mode)

      const r = await fetch(`${API}/api/extend-video`, { method: 'POST', body })
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
    setStatus(null); setJobId(null); setResultPath(null); setErrorMsg('')
    clearVideo()
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Étendre Vidéo</h1>
        <p className="page-subtitle">Prolonge une vidéo existante via image-to-video chain</p>
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
                    <span>Aucun preset Extend Vidéo trouvé.</span>
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
                          {[`${p.settings.duration}s`, p.settings.mode].map(t => (
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

          {/* Vidéo source */}
          <div className="section">
            <div className="section-label section-title">Vidéo source</div>
            <VideoSourcePicker
              video={video}
              videoUrl={videoUrl}
              preview={videoPreview}
              onFile={handleFile}
              onUrl={handleUrl}
              onClear={clearVideo}
              fileRef={fileRef}
            />
          </div>

          <div className="section">
            <div className="section-label section-title">Paramètres</div>

            <div className="field">
              <label className="field-label">
                Prompt de continuation <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Décris comment la vidéo doit continuer..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Durée extension</label>
                <select className="select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Mode</label>
                <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="professional">Professional</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Résultat */}
          {status === 'done' && resultPath && (
            <div className="video-result">
              <div style={{ padding: '16px 16px 4px' }}>
                <div className="section-label">Vidéo étendue</div>
              </div>
              <div className="video-result-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                <span className="label" style={{ color: 'var(--success)' }}>Terminé</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{resultPath.split('/').pop()}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── DROITE ── */}
        <div>
          <div className="card">
            <div className="section-label" style={{ marginBottom: 12 }}>Estimation</div>
            <div className="cost-display">${cost.toFixed(2)}</div>
            <div className="cost-tag">↑ {duration}s {mode}</div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }} />

            {!video && !videoUrl && (
              <div className="validation-msg">Sélectionne une vidéo source</div>
            )}

            <button
              className="btn btn-primary btn-full"
              disabled={!canGenerate}
              onClick={generate}
            >
              Étendre la vidéo →
            </button>

            {status === 'done' && (
              <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={reset}>
                Nouvelle extension
              </button>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }} />

            {/* ── SAUVEGARDER COMME PRESET ── */}
            {!showSaveForm ? (
              <button
                className="btn btn-ghost btn-full"
                style={{ fontSize: 11 }}
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
                  <input className="input" placeholder="Ex: Continuation naturelle..." value={saveName}
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

          {(status === 'loading' || status === 'polling') && (
            <div className="status-bar" style={{ marginTop: 16 }}>
              <div className="status-label">
                {status === 'loading' ? 'Upload en cours' : 'Extension en cours'}
              </div>
              <div className="progress-track">
                <div className="progress-fill indeterminate" />
              </div>
              <div className="status-text">
                {status === 'loading' ? 'Envoi de la vidéo...' : `Job : ${jobId?.slice(0, 8)}...`}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="validation-msg warn" style={{ marginTop: 16 }}>
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
