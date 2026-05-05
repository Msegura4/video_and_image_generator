import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CAMERA_ANGLES = [
  { value: '', label: '—' },
  { value: 'straight camera angle', label: 'Frontal' },
  { value: 'slight low angle shot, looking up', label: 'Légère contre-plongée' },
  { value: 'low angle shot, strong counter-plunge', label: 'Contre-plongée forte' },
  { value: 'high angle, slight plunge', label: 'Légère plongée' },
  { value: 'high angle, steep plunge shot', label: 'Plongée forte' },
  { value: "overhead bird's eye view", label: 'Vue aérienne (top)' },
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
  { value: 'wide establishing shot', label: "Plan d'ensemble" },
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

const RATIOS   = ['16:9', '9:16', '1:1', '4:3', '21:9']
const DURATIONS = [5, 10]
const MODES    = [{ value: 'professional', label: 'Professional' }, { value: 'standard', label: 'Standard' }]
const VERSIONS = [{ value: '2.5', label: 'Kling 2.5' }, { value: '2.0', label: 'Kling 2.0' }, { value: '1.6', label: 'Kling 1.6' }]

const TYPE_FILTERS = [
  { value: 'image',       label: 'Image',        icon: '◻', desc: 'Prompt image' },
  { value: 'img2video',   label: 'Img → Vidéo',  icon: '▷', desc: 'Prompt de mouvement' },
  { value: 'extendvideo', label: 'Extend Vidéo', icon: '⟳', desc: 'Prompte de Continuation' },
  { value: 'video',       label: 'Vidéo texte',  icon: '◈', desc: 'Prompt vidéo' },
]

export default function Prompts() {
  const [presets, setPresets]       = useState([])
  const [selected, setSelected]     = useState(null)
  const [detail, setDetail]         = useState(null)
  const [negative, setNegative]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [tab, setTab]               = useState('overview')
  const [typeFilter, setTypeFilter] = useState('image')
  const [editFields, setEditFields] = useState({})
  const [saving, setSaving]         = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError]   = useState('')
  const [deleting, setDeleting]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/prompts`)
      .then(r => r.json())
      .then(d => { setPresets(d.presets || []); setLoading(false) })
      .catch(() => { setError('Impossible de charger les presets.'); setLoading(false) })
  }, [])

  const filteredPresets = presets.filter(p => (p.type || 'video') === typeFilter)

  const buildEditFields = (d, neg) => {
    const t  = d.type
    const rs = d.recommended_settings || {}
    const base = {
      preset_type:    t,
      name:           d.name || '',
      description:    d.description || '',
      style_keywords: (d.style_keywords || []).join(', '),
    }
    if (t === 'image') return {
      ...base,
      style:          d.style || '',
      camera_angle:   d.camera_angle || '',
      shot_type:      d.shot_type || '',
      lens:           d.lens || '',
      composition:    d.composition || '',
      lighting:       d.lighting || '',
      colors:         d.colors || '',
      negative_prompt: d.negative_prompt || neg || '',
    }
    if (t === 'img2video') return {
      ...base,
      base_prompt:     d.prompt || '',
      negative_prompt: d.negative_prompt || neg || '',
      aspect_ratio:    rs.aspect_ratio  || '16:9',
      duration:        rs.duration      || 5,
      mode:            rs.mode          || 'professional',
      model_version:   rs.model_version || '2.5',
    }
    if (t === 'extendvideo') return {
      ...base,
      base_prompt: d.prompt || '',
      duration:    rs.duration || 5,
      mode:        rs.mode    || 'professional',
    }
    // video (legacy)
    return {
      ...base,
      base_prompt:     d.base || '',
      color:           d.color   || '',
      camera:          d.camera  || '',
      quality:         d.quality || '',
      negative_prompt: d.negative_prompt || neg || '',
      aspect_ratio:    rs.aspect_ratio || '16:9',
      duration:        rs.duration     || 5,
      mode:            rs.mode         || 'professional',
    }
  }

  const selectPreset = async (name) => {
    setSelected(name)
    setDetail(null)
    setNegative(null)
    setTab('overview')
    setSaveSuccess(false)
    setSaveError('')
    setEditFields({})
    setConfirmDelete(false)

    const [detailRes, negRes] = await Promise.all([
      fetch(`${API}/api/prompts/${name}`).then(r => r.json()),
      fetch(`${API}/api/prompts/${name}/negative`).then(r => r.json()),
    ])
    setDetail(detailRes.data)
    setNegative(negRes.negative_prompt)
    setEditFields(buildEditFields(detailRes.data, negRes.negative_prompt))
  }

  const setEdit = (key) => (e) => setEditFields(f => ({ ...f, [key]: e.target.value }))

  const savePreset = async () => {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    const t = editFields.preset_type
    const keywords = (editFields.style_keywords || '').split(',').map(k => k.trim()).filter(Boolean)

    const body = {
      preset_id:    selected,
      preset_type:  t,
      name:         editFields.name,
      description:  editFields.description || '',
      style_keywords: keywords,
      negative_prompt: editFields.negative_prompt || '',
      base_prompt:  editFields.base_prompt  || '',
      recommended_settings: {
        aspect_ratio:  editFields.aspect_ratio  || '16:9',
        duration:      Number(editFields.duration) || 5,
        mode:          editFields.mode          || 'professional',
        model_version: editFields.model_version || '2.5',
      },
      style:        editFields.style        || '',
      camera_angle: editFields.camera_angle || '',
      shot_type:    editFields.shot_type    || '',
      lens:         editFields.lens         || '',
      composition:  editFields.composition  || '',
      lighting:     editFields.lighting     || '',
      colors:       editFields.colors       || '',
      color:        editFields.color        || '',
      camera:       editFields.camera       || '',
      quality:      editFields.quality      || '',
    }

    try {
      const r = await fetch(`${API}/api/prompts/${selected}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur API')
      setSaveSuccess(true)
      // Refresh
      const [dr, nr] = await Promise.all([
        fetch(`${API}/api/prompts/${selected}`).then(r => r.json()),
        fetch(`${API}/api/prompts/${selected}/negative`).then(r => r.json()),
      ])
      setDetail(dr.data)
      setNegative(nr.negative_prompt)
      setEditFields(buildEditFields(dr.data, nr.negative_prompt))
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const deletePreset = async () => {
    setDeleting(true)
    try {
      const r = await fetch(`${API}/api/prompts/${selected}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur API')
      // Retirer de la liste locale et désélectionner
      setPresets(ps => ps.filter(p => p.name !== selected))
      setSelected(null)
      setDetail(null)
      setConfirmDelete(false)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  // ── helpers ──
  const fieldBox = (key, label, val) => val ? (
    <div key={key} style={{ marginBottom: 14 }}>
      <div className="field-label" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
        {typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
      </div>
    </div>
  ) : null

  const copyBtn = (text) => (
    <button className="btn btn-ghost" style={{ marginTop: 8, fontSize: 11, padding: '5px 12px' }}
      onClick={() => navigator.clipboard.writeText(text)}>
      Copier ↗
    </button>
  )

  if (loading) return (
    <div style={{ padding: 48, color: 'var(--text-3)' }}>
      <div className="progress-track" style={{ maxWidth: 200 }}>
        <div className="progress-fill indeterminate" />
      </div>
    </div>
  )

  if (error) return (
    <div className="validation-msg warn" style={{ maxWidth: 400 }}>{error}</div>
  )

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Presets Prompts</h1>
        <p className="page-subtitle">{presets.length} preset{presets.length > 1 ? 's' : ''} disponible{presets.length > 1 ? 's' : ''}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>

        {/* ── LISTE ── */}
        <div>
          {/* Filtre par type — cartes */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {TYPE_FILTERS.map(f => (
              <div
                key={f.value}
                onClick={() => { setTypeFilter(f.value); setSelected(null) }}
                style={{
                  flex: '1 1 80px', minWidth: 76,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${typeFilter === f.value ? 'var(--text)' : 'var(--border)'}`,
                  background: typeFilter === f.value ? 'var(--bg-2)' : 'var(--bg-1)',
                  cursor: 'pointer',
                  transition: 'border-color 150ms, background 150ms',
                  userSelect: 'none',
                }}
              >
                <div style={{ fontSize: 15, marginBottom: 5, opacity: 0.7 }}>{f.icon}</div>
                <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {filteredPresets.length === 0 ? (
            <div className="empty-state">
              <p>Aucun preset {typeFilter} trouvé.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredPresets.map(p => (
                <div
                  key={p.name}
                  className={`preset-card${selected === p.name ? ' selected' : ''}`}
                  onClick={() => selectPreset(p.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div className="preset-name" style={{ flex: 1 }}>
                      {p.display_name || p.name.replace(/_/g, ' ')}
                    </div>
                    <span className="pill" style={{ fontSize: 9, padding: '2px 6px' }}>
                      {p.type === 'image' ? 'Image ◻' : p.type === 'img2video' ? 'Img→Vid ▷' : p.type === 'extendvideo' ? 'Extend ⟳' : 'Vidéo ◈'}
                    </span>
                  </div>
                  {p.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>{p.description}</div>
                  )}
                  {p.color && (
                    <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      {p.color}
                    </div>
                  )}
                  <div className="preset-preview">{p.base_preview}</div>
                  {p.camera && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="pill">{p.camera.slice(0, 40)}{p.camera.length > 40 ? '...' : ''}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── DÉTAIL ── */}
        <div>
          {!selected ? (
            <div className="empty-state">
              <p>Sélectionne un preset pour voir les détails</p>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div className="page-title" style={{ fontSize: 20 }}>
                    {detail?.name || selected.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', marginTop: 4 }}>
                    {selected}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {confirmDelete ? (
                    <>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Supprimer ?</span>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '4px 10px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                        disabled={deleting}
                        onClick={deletePreset}
                      >
                        {deleting ? '...' : 'Oui'}
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => setConfirmDelete(false)}
                      >
                        Non
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 11, padding: '4px 10px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>

              {/* ── TABS ── */}
              <div className="tabs">
                {[
                  { id: 'overview', label: 'Aperçu' },
                  { id: 'edit',     label: 'Modifier' },
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

              {/* ── APERÇU ── */}
              {tab === 'overview' && detail && (() => {
                const t = detail.type
                return (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <span className="pill">
                        {t === 'image' ? 'Image ◻' : t === 'img2video' ? 'Image → Vidéo ▷' : t === 'extendvideo' ? 'Extend Vidéo ⟳' : 'Vidéo ◈'}
                      </span>
                    </div>

                    {/* Image */}
                    {t === 'image' && <>
                      {[
                        ['style',        'Style visuel'],
                        ['camera_angle', 'Angle caméra'],
                        ['shot_type',    'Type de plan'],
                        ['lens',         'Objectif'],
                        ['composition',  'Composition'],
                        ['lighting',     'Éclairage'],
                        ['colors',       'Couleurs & tons'],
                      ].map(([key, label]) => fieldBox(key, label, detail[key]))}
                    </>}

                    {/* Img → Vidéo */}
                    {t === 'img2video' && <>
                      {fieldBox('prompt', 'Prompt de mouvement', detail.prompt)}
                      {detail.recommended_settings && (
                        <div style={{ marginBottom: 14 }}>
                          <div className="field-label" style={{ marginBottom: 8 }}>Paramètres</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[
                              `Kling ${detail.recommended_settings.model_version || '2.5'}`,
                              `${detail.recommended_settings.duration || 5}s`,
                              detail.recommended_settings.mode || 'professional',
                              detail.recommended_settings.aspect_ratio || '16:9',
                            ].map(tag => <span key={tag} className="pill">{tag}</span>)}
                          </div>
                        </div>
                      )}
                    </>}

                    {/* Extend Vidéo */}
                    {t === 'extendvideo' && <>
                      {fieldBox('prompt', 'Prompt de continuation', detail.prompt || '(sans prompt)')}
                      {detail.recommended_settings && (
                        <div style={{ marginBottom: 14 }}>
                          <div className="field-label" style={{ marginBottom: 8 }}>Paramètres</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[
                              `${detail.recommended_settings.duration || 5}s`,
                              detail.recommended_settings.mode || 'professional',
                            ].map(tag => <span key={tag} className="pill">{tag}</span>)}
                          </div>
                        </div>
                      )}
                    </>}

                    {/* Vidéo legacy */}
                    {(t === 'video' || !t) && Object.entries(detail)
                      .filter(([k]) => k !== 'type')
                      .map(([key, val]) => fieldBox(key, key, val))}

                    {/* Negative prompt — toujours en dernier */}
                    {negative && (
                      <div style={{ marginBottom: 14 }}>
                        <div className="field-label" style={{ marginBottom: 6 }}>Negative prompt</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
                          {negative}
                        </div>
                        {copyBtn(negative)}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── MODIFIER ── */}
              {tab === 'edit' && detail && (
                <div>
                  {/* Identité */}
                  <div className="section">
                    <div className="section-title">Identité</div>
                    <div className="field">
                      <label className="field-label">Nom</label>
                      <input className="input" value={editFields.name || ''} onChange={setEdit('name')} />
                    </div>
                    <div className="field">
                      <label className="field-label">Description <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span></label>
                      <input className="input" value={editFields.description || ''} onChange={setEdit('description')} />
                    </div>
                  </div>

                  {/* ── CHAMPS IMAGE ── */}
                  {editFields.preset_type === 'image' && (
                    <>
                      <div className="section">
                        <div className="section-title">Style visuel</div>
                        <div className="field">
                          <label className="field-label">Style général</label>
                          <textarea className="textarea" rows={3} value={editFields.style || ''} onChange={setEdit('style')} />
                        </div>
                      </div>
                      <div className="section">
                        <div className="section-title">Caméra</div>
                        <div className="field-row">
                          <div className="field">
                            <label className="field-label">Angle</label>
                            <select className="select" value={editFields.camera_angle || ''} onChange={setEdit('camera_angle')}>
                              {CAMERA_ANGLES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                          <div className="field">
                            <label className="field-label">Type de plan</label>
                            <select className="select" value={editFields.shot_type || ''} onChange={setEdit('shot_type')}>
                              {SHOT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="field">
                          <label className="field-label">Objectif</label>
                          <select className="select" value={editFields.lens || ''} onChange={setEdit('lens')}>
                            {LENSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="section">
                        <div className="section-title">Composition & Lumière</div>
                        <div className="field">
                          <label className="field-label">Composition</label>
                          <textarea className="textarea" rows={4} value={editFields.composition || ''} onChange={setEdit('composition')} />
                        </div>
                        <div className="field">
                          <label className="field-label">Éclairage</label>
                          <textarea className="textarea" rows={2} value={editFields.lighting || ''} onChange={setEdit('lighting')} />
                        </div>
                        <div className="field">
                          <label className="field-label">Couleurs & tons</label>
                          <input className="input" value={editFields.colors || ''} onChange={setEdit('colors')} />
                        </div>
                      </div>
                      <div className="section">
                        <div className="section-title">Prompt négatif & mots-clés</div>
                        <div className="field">
                          <label className="field-label">Negative prompt</label>
                          <textarea className="textarea" rows={2} value={editFields.negative_prompt || ''} onChange={setEdit('negative_prompt')} />
                        </div>
                        <div className="field">
                          <label className="field-label">Mots-clés</label>
                          <input className="input" value={editFields.style_keywords || ''} onChange={setEdit('style_keywords')} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── CHAMPS IMG2VIDEO ── */}
                  {editFields.preset_type === 'img2video' && (
                    <>
                      <div className="section">
                        <div className="section-title">Prompt de mouvement</div>
                        <div className="field">
                          <label className="field-label">Prompt principal</label>
                          <textarea className="textarea" rows={5} value={editFields.base_prompt || ''} onChange={setEdit('base_prompt')} />
                        </div>
                        <div className="field">
                          <label className="field-label">Negative prompt</label>
                          <textarea className="textarea" rows={2} value={editFields.negative_prompt || ''} onChange={setEdit('negative_prompt')} />
                        </div>
                        <div className="field">
                          <label className="field-label">Mots-clés</label>
                          <input className="input" value={editFields.style_keywords || ''} onChange={setEdit('style_keywords')} />
                        </div>
                      </div>
                      <div className="section">
                        <div className="section-title">Paramètres recommandés</div>
                        <div className="field-row">
                          <div className="field">
                            <label className="field-label">Format</label>
                            <select className="select" value={editFields.aspect_ratio || '16:9'} onChange={setEdit('aspect_ratio')}>
                              {RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div className="field">
                            <label className="field-label">Durée</label>
                            <select className="select" value={editFields.duration || 5} onChange={(e) => setEditFields(f => ({ ...f, duration: Number(e.target.value) }))}>
                              {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="field-row">
                          <div className="field">
                            <label className="field-label">Modèle</label>
                            <select className="select" value={editFields.model_version || '2.5'} onChange={setEdit('model_version')}>
                              {VERSIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                            </select>
                          </div>
                          <div className="field">
                            <label className="field-label">Mode</label>
                            <select className="select" value={editFields.mode || 'professional'} onChange={setEdit('mode')}>
                              {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── CHAMPS EXTENDVIDEO ── */}
                  {editFields.preset_type === 'extendvideo' && (
                    <>
                      <div className="section">
                        <div className="section-title">Prompt de continuation</div>
                        <div className="field">
                          <label className="field-label">Prompt <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span></label>
                          <textarea className="textarea" rows={4} placeholder="Laisse vide pour une continuation naturelle..."
                            value={editFields.base_prompt || ''} onChange={setEdit('base_prompt')} />
                        </div>
                        <div className="field">
                          <label className="field-label">Mots-clés</label>
                          <input className="input" value={editFields.style_keywords || ''} onChange={setEdit('style_keywords')} />
                        </div>
                      </div>
                      <div className="section">
                        <div className="section-title">Paramètres recommandés</div>
                        <div className="field-row">
                          <div className="field">
                            <label className="field-label">Durée</label>
                            <select className="select" value={editFields.duration || 5} onChange={(e) => setEditFields(f => ({ ...f, duration: Number(e.target.value) }))}>
                              {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                            </select>
                          </div>
                          <div className="field">
                            <label className="field-label">Mode</label>
                            <select className="select" value={editFields.mode || 'professional'} onChange={setEdit('mode')}>
                              {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── CHAMPS VIDÉO LEGACY ── */}
                  {(editFields.preset_type === 'video' || !editFields.preset_type) && (
                    <>
                      <div className="section">
                        <div className="section-title">Contenu</div>
                        <div className="field">
                          <label className="field-label">Base</label>
                          <textarea className="textarea" rows={5} placeholder="Description principale de la scène..." value={editFields.base_prompt || ''} onChange={setEdit('base_prompt')} />
                        </div>
                        <div className="field">
                          <label className="field-label">Color</label>
                          <input className="input" placeholder="Ex: desaturated earth tones, warm golden hour..." value={editFields.color || ''} onChange={setEdit('color')} />
                        </div>
                        <div className="field">
                          <label className="field-label">Camera</label>
                          <input className="input" placeholder="Ex: slow dolly forward, 35mm anamorphic lens..." value={editFields.camera || ''} onChange={setEdit('camera')} />
                        </div>
                        <div className="field">
                          <label className="field-label">Quality</label>
                          <input className="input" placeholder="Ex: 8K, film grain, cinematic..." value={editFields.quality || ''} onChange={setEdit('quality')} />
                        </div>
                        <div className="field">
                          <label className="field-label">Negative prompt</label>
                          <textarea className="textarea" rows={2} value={editFields.negative_prompt || ''} onChange={setEdit('negative_prompt')} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── SAVE ── */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                    {saveSuccess && (
                      <div style={{ fontSize: 12, color: 'var(--success, #4ade80)', marginBottom: 10 }}>
                        ✓ Preset mis à jour
                      </div>
                    )}
                    {saveError && (
                      <div className="validation-msg warn" style={{ marginBottom: 10 }}>{saveError}</div>
                    )}
                    <button
                      className="btn btn-primary btn-full"
                      disabled={saving || !editFields.name}
                      onClick={savePreset}
                    >
                      {saving ? 'Sauvegarde...' : 'Enregistrer les modifications →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
