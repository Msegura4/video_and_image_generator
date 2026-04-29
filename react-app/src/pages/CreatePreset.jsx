import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── OPTIONS CAMÉRA (identiques à GenerateImage) ──
const CAMERA_ANGLES = [
  { value: '', label: '—' },
  { value: 'straight camera angle', label: 'Frontal' },
  { value: 'slight low angle shot, looking up', label: 'Légère contre-plongée' },
  { value: 'low angle shot, strong counter-plunge', label: 'Contre-plongée forte' },
  { value: 'high angle, slight plunge', label: 'Légère plongée' },
  { value: 'high angle, steep plunge shot', label: 'Plongée forte' },
  { value: "overhead bird\'s eye view", label: 'Vue aérienne (top)' },
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
  { value: 'wide establishing shot', label: "Plan d\'ensemble" },
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

const RATIOS    = ['16:9', '9:16', '1:1', '4:3', '21:9']
const DURATIONS  = [5, 10]
const MODES      = [{ value: 'professional', label: 'Professional' }, { value: 'standard', label: 'Standard' }]
const VERSIONS   = [{ value: '2.5', label: 'Kling 2.5' }, { value: '2.0', label: 'Kling 2.0' }, { value: '1.6', label: 'Kling 1.6' }]

const DEFAULT_NEG_VIDEO   = 'people, text, UI, low quality, blurry, distorted'
const DEFAULT_NEG_IMAGE   = 'text, UI, watermark, low quality, blurry, distorted, deformed'
const DEFAULT_NEG_I2V     = 'motion blur, flickering, low quality, watermark, distorted'

// ── ÉTAT INITIAL ──
const initImage = () => ({
  style: 'Photorealistic and cinematic. Real textures, natural skin, realistic motion blur, physically plausible reflections.',
  camera_angle: '', shot_type: '', lens: '',
  composition: '', lighting: '', colors: '',
  negative_prompt: DEFAULT_NEG_IMAGE, keywords: 'cinematic, photorealistic',
})

const initVideo = () => ({
  base_prompt: '',
  negative_prompt: DEFAULT_NEG_VIDEO,
  keywords: 'cinematic, epic',
  aspect_ratio: '16:9', duration: 5, mode: 'professional',
})

const initI2V = () => ({
  prompt: '',
  negative_prompt: DEFAULT_NEG_I2V,
  keywords: 'cinematic, smooth motion',
  aspect_ratio: '16:9', duration: 5, mode: 'professional', model_version: '2.5',
})

const initExtend = () => ({
  prompt: '',
  keywords: 'seamless, cinematic',
  duration: 5, mode: 'professional',
})

export default function CreatePreset() {
  const navigate  = useNavigate()
  const [type, setType] = useState(null)

  const [identity, setIdentity] = useState({ preset_id: '', name: '', description: '' })
  const [imgFields, setImgFields]     = useState(initImage())
  const [vidFields, setVidFields]     = useState(initVideo())
  const [i2vFields, setI2VFields]     = useState(initI2V())
  const [extFields, setExtFields]     = useState(initExtend())

  const [status, setStatus]   = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const setId  = (key) => (e) => setIdentity(f => ({ ...f, [key]: e.target.value }))
  const setImg = (key) => (e) => setImgFields(f => ({ ...f, [key]: e.target.value }))
  const setVid = (key) => (e) => setVidFields(f => ({ ...f, [key]: e.target.value }))
  const setI2V = (key) => (e) => setI2VFields(f => ({ ...f, [key]: e.target.value }))
  const setExt = (key) => (e) => setExtFields(f => ({ ...f, [key]: e.target.value }))

  const handleNameChange = (e) => {
    const name = e.target.value
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    setIdentity(f => ({ ...f, name, preset_id: id }))
  }

  const selectType = (t) => {
    setType(t)
    setStatus(null)
    setErrorMsg('')
  }

  const canSubmit = type && identity.preset_id && identity.name && (
    type === 'image'       ? (imgFields.style || imgFields.composition) :
    type === 'img2video'   ? i2vFields.prompt :
    type === 'extendvideo' ? true :
    vidFields.base_prompt
  ) && status == null

  const submit = async () => {
    if (!canSubmit) return
    setStatus('loading')
    setErrorMsg('')

    const rawKeywords = type === 'image'       ? imgFields.keywords
      : type === 'img2video'   ? i2vFields.keywords
      : type === 'extendvideo' ? extFields.keywords
      : vidFields.keywords
    const keywords = rawKeywords.split(',').map(k => k.trim()).filter(Boolean)

    const body = {
      preset_id:    identity.preset_id,
      preset_type:  type,
      name:         identity.name,
      description:  identity.description,
      style_keywords: keywords,
      ...(type === 'image' ? {
        style:           imgFields.style,
        camera_angle:    imgFields.camera_angle,
        shot_type:       imgFields.shot_type,
        lens:            imgFields.lens,
        composition:     imgFields.composition,
        lighting:        imgFields.lighting,
        colors:          imgFields.colors,
        negative_prompt: imgFields.negative_prompt,
      } : type === 'img2video' ? {
        base_prompt:     i2vFields.prompt,
        negative_prompt: i2vFields.negative_prompt,
        recommended_settings: {
          aspect_ratio:  i2vFields.aspect_ratio,
          duration:      Number(i2vFields.duration),
          mode:          i2vFields.mode,
          model_version: i2vFields.model_version,
        },
      } : type === 'extendvideo' ? {
        base_prompt: extFields.prompt,
        recommended_settings: {
          duration: Number(extFields.duration),
          mode:     extFields.mode,
        },
      } : {
        base_prompt:     vidFields.base_prompt,
        negative_prompt: vidFields.negative_prompt,
        recommended_settings: {
          aspect_ratio: vidFields.aspect_ratio,
          duration:     Number(vidFields.duration),
          mode:         vidFields.mode,
        },
      }),
    }

    try {
      const r = await fetch(`${API}/api/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur API')
      setStatus('success')
    } catch (e) {
      setErrorMsg(e.message)
      setStatus('error')
    }
  }

  const reset = () => {
    setType(null)
    setIdentity({ preset_id: '', name: '', description: '' })
    setImgFields(initImage())
    setVidFields(initVideo())
    setI2VFields(initI2V())
    setExtFields(initExtend())
    setStatus(null)
    setErrorMsg('')
  }

  // ── SUCCÈS ──
  if (status === 'success') {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Preset créé</h1>
        </div>
        <div className="card" style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{identity.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
            <span className="pill">
              {type === 'image' ? 'Image ◻'
                : type === 'img2video'   ? 'Image → Vidéo ▷'
                : type === 'extendvideo' ? 'Extend Vidéo ⟳'
                : 'Vidéo ◈'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 24 }}>
            ID : <code style={{ background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 4 }}>{identity.preset_id}</code>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/prompts')}>
              Voir les presets →
            </button>
            {type === 'image' && (
              <button className="btn btn-ghost" onClick={() => navigate('/generate-image')}>
                Générer une image
              </button>
            )}
            {type === 'img2video' && (
              <button className="btn btn-ghost" onClick={() => navigate('/image-to-video')}>
                Image → Vidéo
              </button>
            )}
            {type === 'extendvideo' && (
              <button className="btn btn-ghost" onClick={() => navigate('/extend-video')}>
                Étendre Vidéo
              </button>
            )}
            <button className="btn btn-ghost" onClick={reset}>Créer un autre</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Créer un Preset</h1>
        <p className="page-subtitle">Nouveau style réutilisable pour tes générations</p>
      </div>

      {/* ── SÉLECTEUR DE TYPE ── */}
      <div style={{ marginBottom: 40 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>Catégorie</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { value: 'image',       label: 'Image',           icon: '◻', desc: 'Preset pour générer des images avec FLUX' },
            { value: 'img2video',   label: 'Image → Vidéo',   icon: '▷', desc: 'Preset de mouvement pour Kling (image-to-video)' },
            { value: 'extendvideo', label: 'Extend Vidéo',    icon: '⟳', desc: 'Preset de continuation pour étendre une vidéo' },
            { value: 'video',       label: 'Vidéo (texte)',   icon: '◈', desc: 'Preset de style pour génération vidéo' },
          ].map(opt => (
            <div
              key={opt.value}
              onClick={() => selectType(opt.value)}
              style={{
                flex: 1, maxWidth: 220,
                padding: '20px 24px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${type === opt.value ? 'var(--text)' : 'var(--border)'}`,
                background: type === opt.value ? 'var(--bg-2)' : 'var(--bg-1)',
                cursor: 'pointer',
                transition: 'border-color 150ms, background 150ms',
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.7 }}>{opt.icon}</div>
              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{opt.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FORMULAIRE (affiché seulement si type sélectionné) ── */}
      {type && (
        <div className="two-col">
          {/* ── GAUCHE ── */}
          <div>
            {/* Identité — commune aux deux types */}
            <div className="section">
              <div className="section-label section-title">Identité</div>
              <div className="field">
                <label className="field-label">Nom du preset</label>
                <input className="input" placeholder="Ex: Nuit Tokyo, Désert Épique..." value={identity.name} onChange={handleNameChange} />
              </div>
              <div className="field">
                <label className="field-label">ID <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(auto-généré)</span></label>
                <input className="input" value={identity.preset_id} onChange={setId('preset_id')}
                  style={{ fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div className="field">
                <label className="field-label">Description <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span></label>
                <input className="input" placeholder="Brève description..." value={identity.description} onChange={setId('description')} />
              </div>
            </div>

            {/* ── CHAMPS IMAGE ── */}
            {type === 'image' && (
              <>
                <div className="section">
                  <div className="section-label section-title">Style visuel</div>
                  <div className="field">
                    <label className="field-label">Style général</label>
                    <textarea className="textarea" rows={3}
                      placeholder="Ex: Photorealistic and cinematic, film grain, real textures..."
                      value={imgFields.style} onChange={setImg('style')} />
                  </div>
                </div>

                <div className="section">
                  <div className="section-label section-title">Caméra</div>
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">Angle</label>
                      <select className="select" value={imgFields.camera_angle} onChange={setImg('camera_angle')}>
                        {CAMERA_ANGLES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Type de plan</label>
                      <select className="select" value={imgFields.shot_type} onChange={setImg('shot_type')}>
                        {SHOT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Objectif</label>
                    <select className="select" value={imgFields.lens} onChange={setImg('lens')}>
                      {LENSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="section">
                  <div className="section-label section-title">Composition & Lumière</div>
                  <div className="field">
                    <label className="field-label">Composition</label>
                    <textarea className="textarea" rows={4}
                      placeholder={"Premier plan : ...\nPlan intermédiaire : ...\nArrière-plan : ..."}
                      value={imgFields.composition} onChange={setImg('composition')} />
                  </div>
                  <div className="field">
                    <label className="field-label">Éclairage</label>
                    <textarea className="textarea" rows={2}
                      placeholder="Ex: Golden hour, soft lateral light, warm highlights..."
                      value={imgFields.lighting} onChange={setImg('lighting')} />
                  </div>
                  <div className="field">
                    <label className="field-label">Couleurs & tons</label>
                    <input className="input" placeholder="Ex: Desaturated earth tones, warm amber..."
                      value={imgFields.colors} onChange={setImg('colors')} />
                  </div>
                </div>

                <div className="section">
                  <div className="section-label section-title">Prompt négatif & mots-clés</div>
                  <div className="field">
                    <label className="field-label">Negative prompt</label>
                    <textarea className="textarea" rows={2} value={imgFields.negative_prompt} onChange={setImg('negative_prompt')} />
                  </div>
                  <div className="field">
                    <label className="field-label">Mots-clés <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(séparés par des virgules)</span></label>
                    <input className="input" placeholder="cinematic, epic, moody..." value={imgFields.keywords} onChange={setImg('keywords')} />
                    {imgFields.keywords && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {imgFields.keywords.split(',').map(k => k.trim()).filter(Boolean).map(k => (
                          <span key={k} className="pill">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── CHAMPS IMAGE → VIDÉO ── */}
            {type === 'img2video' && (
              <>
                <div className="section">
                  <div className="section-label section-title">Prompt de mouvement</div>
                  <div className="field">
                    <label className="field-label">Prompt principal</label>
                    <textarea className="textarea" rows={5} style={{ minHeight: 120 }}
                      placeholder={"Décris le mouvement de caméra et l\'ambiance...\nEx: Slow zoom in, cinematic lighting,\nsmooth dolly forward, epic scale"}
                      value={i2vFields.prompt} onChange={setI2V('prompt')} />
                  </div>
                  <div className="field">
                    <label className="field-label">Negative prompt</label>
                    <textarea className="textarea" rows={2} value={i2vFields.negative_prompt} onChange={setI2V('negative_prompt')} />
                  </div>
                  <div className="field">
                    <label className="field-label">Mots-clés <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(séparés par des virgules)</span></label>
                    <input className="input" placeholder="cinematic, smooth, epic..." value={i2vFields.keywords} onChange={setI2V('keywords')} />
                    {i2vFields.keywords && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {i2vFields.keywords.split(',').map(k => k.trim()).filter(Boolean).map(k => (
                          <span key={k} className="pill">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="section">
                  <div className="section-label section-title">Paramètres recommandés</div>
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">Format</label>
                      <select className="select" value={i2vFields.aspect_ratio} onChange={setI2V('aspect_ratio')}>
                        {RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Durée</label>
                      <select className="select" value={i2vFields.duration} onChange={(e) => setI2VFields(f => ({ ...f, duration: Number(e.target.value) }))}>
                        {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">Modèle</label>
                      <select className="select" value={i2vFields.model_version} onChange={setI2V('model_version')}>
                        {VERSIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Mode</label>
                      <select className="select" value={i2vFields.mode} onChange={setI2V('mode')}>
                        {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── CHAMPS EXTEND VIDÉO ── */}
            {type === 'extendvideo' && (
              <>
                <div className="section">
                  <div className="section-label section-title">Prompt de continuation</div>
                  <div className="field">
                    <label className="field-label">
                      Prompt <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span>
                    </label>
                    <textarea className="textarea" rows={4}
                      placeholder={"Décris comment la vidéo doit continuer...\nEx: Camera continues to pull back, revealing the vast landscape,\nsmooth seamless continuation"}
                      value={extFields.prompt} onChange={setExt('prompt')} />
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
                      Laisse vide pour une continuation naturelle sans instruction.
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Mots-clés <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(séparés par des virgules)</span></label>
                    <input className="input" placeholder="seamless, cinematic..." value={extFields.keywords} onChange={setExt('keywords')} />
                    {extFields.keywords && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {extFields.keywords.split(',').map(k => k.trim()).filter(Boolean).map(k => (
                          <span key={k} className="pill">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="section">
                  <div className="section-label section-title">Paramètres recommandés</div>
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">Durée extension</label>
                      <select className="select" value={extFields.duration} onChange={(e) => setExtFields(f => ({ ...f, duration: Number(e.target.value) }))}>
                        {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Mode</label>
                      <select className="select" value={extFields.mode} onChange={setExt('mode')}>
                        {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── CHAMPS VIDÉO ── */}
            {type === 'video' && (
              <>
                <div className="section">
                  <div className="section-label section-title">Prompt</div>
                  <div className="field">
                    <label className="field-label">Prompt principal</label>
                    <textarea className="textarea" rows={5} style={{ minHeight: 120 }}
                      placeholder={"Décris le style visuel en détail...\nEx: Vast desert landscape, golden hour light,\ncinematic wide angle, 8K"}
                      value={vidFields.base_prompt} onChange={setVid('base_prompt')} />
                  </div>
                  <div className="field">
                    <label className="field-label">Negative prompt</label>
                    <textarea className="textarea" rows={2} value={vidFields.negative_prompt} onChange={setVid('negative_prompt')} />
                  </div>
                  <div className="field">
                    <label className="field-label">Mots-clés <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(séparés par des virgules)</span></label>
                    <input className="input" placeholder="cinematic, epic, moody..." value={vidFields.keywords} onChange={setVid('keywords')} />
                    {vidFields.keywords && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {vidFields.keywords.split(',').map(k => k.trim()).filter(Boolean).map(k => (
                          <span key={k} className="pill">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="section">
                  <div className="section-label section-title">Paramètres recommandés</div>
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">Format</label>
                      <select className="select" value={vidFields.aspect_ratio} onChange={setVid('aspect_ratio')}>
                        {RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Durée</label>
                      <select className="select" value={vidFields.duration} onChange={(e) => setVidFields(f => ({ ...f, duration: Number(e.target.value) }))}>
                        {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Mode</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {MODES.map(m => (
                        <button key={m.value}
                          className={`btn ${vidFields.mode === m.value ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ flex: 1 }}
                          onClick={() => setVidFields(f => ({ ...f, mode: m.value }))}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── DROITE — APERÇU + ACTION ── */}
          <div>
            <div className="card">
              <div className="section-label" style={{ marginBottom: 16 }}>Aperçu</div>

              {identity.name ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className="pill">
                      {type === 'image'       ? 'Image ◻'
                        : type === 'img2video'   ? 'Img→Vid ▷'
                        : type === 'extendvideo' ? 'Extend ⟳'
                        : 'Vidéo ◈'}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{identity.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', marginBottom: 12 }}>
                    {identity.preset_id || '—'}
                  </div>
                  {identity.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>{identity.description}</div>
                  )}
                </>
              ) : (
                <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 16 }}>
                  Commence à remplir le formulaire...
                </div>
              )}

              {/* Aperçu du prompt image */}
              {type === 'image' && (imgFields.style || imgFields.composition) && (
                <div style={{ marginBottom: 16 }}>
                  <div className="field-label" style={{ marginBottom: 6 }}>Prompt assemblé</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', maxHeight: 120, overflowY: 'auto' }}>
                    {[imgFields.style, imgFields.shot_type, imgFields.camera_angle, imgFields.lens, imgFields.composition, imgFields.lighting, imgFields.colors].filter(Boolean).join(', ').slice(0, 300)}
                    {[imgFields.style, imgFields.composition].join('').length > 300 ? '...' : ''}
                  </div>
                </div>
              )}

              {/* Aperçu img2video */}
              {type === 'img2video' && i2vFields.prompt && (
                <div style={{ marginBottom: 16 }}>
                  <div className="field-label" style={{ marginBottom: 6 }}>Prompt de mouvement</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    {i2vFields.prompt.slice(0, 200)}{i2vFields.prompt.length > 200 ? '...' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {[`Kling ${i2vFields.model_version}`, `${i2vFields.duration}s`, i2vFields.mode, i2vFields.aspect_ratio].map(tag => (
                      <span key={tag} className="pill" style={{ fontSize: 10 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Aperçu extendvideo */}
              {type === 'extendvideo' && (
                <div style={{ marginBottom: 16 }}>
                  {extFields.prompt ? (
                    <>
                      <div className="field-label" style={{ marginBottom: 6 }}>Prompt de continuation</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        {extFields.prompt.slice(0, 200)}{extFields.prompt.length > 200 ? '...' : ''}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                      Continuation naturelle (sans prompt)
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {[`${extFields.duration}s`, extFields.mode].map(tag => (
                      <span key={tag} className="pill" style={{ fontSize: 10 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Aperçu du prompt vidéo */}
              {type === 'video' && vidFields.base_prompt && (
                <div style={{ marginBottom: 16 }}>
                  <div className="field-label" style={{ marginBottom: 6 }}>Prompt</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    {vidFields.base_prompt.slice(0, 200)}{vidFields.base_prompt.length > 200 ? '...' : ''}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 12 }} />

              {!identity.name && <div className="validation-msg">Entre un nom pour le preset</div>}
              {type === 'image' && !imgFields.style && !imgFields.composition && (
                <div className="validation-msg">Remplis au moins le style ou la composition</div>
              )}
              {type === 'img2video' && !i2vFields.prompt && (
                <div className="validation-msg">Entre le prompt de mouvement</div>
              )}
              {type === 'video' && !vidFields.base_prompt && (
                <div className="validation-msg">Entre le prompt principal</div>
              )}

              <button className="btn btn-primary btn-full" disabled={!canSubmit} onClick={submit}>
                {status === 'loading' ? 'Création...' : `Créer le preset ${
                  type === 'image'       ? 'Image'
                    : type === 'img2video'   ? 'Img→Vidéo'
                    : type === 'extendvideo' ? 'Extend'
                    : 'Vidéo'
                } →`}
              </button>
            </div>

            {status === 'error' && (
              <div className="validation-msg warn" style={{ marginTop: 12 }}>{errorMsg}</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
