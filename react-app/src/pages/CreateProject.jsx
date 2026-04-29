import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
  h = Math.round(h * 360); s = Math.round(s * 100); const lp = Math.round(l * 100)
  if (s < 12) { if (lp < 15) return 'black'; if (lp > 88) return 'white'; if (lp < 40) return 'dark gray'; if (lp > 65) return 'light gray'; return 'gray' }
  const mod = lp < 18 ? 'deep ' : lp < 33 ? 'dark ' : lp > 82 ? 'bright ' : lp > 68 ? 'light ' : lp > 58 ? 'pale ' : ''
  const hue = h < 15 || h >= 345 ? 'red' : h < 30 ? 'vermilion' : h < 50 ? 'orange' : h < 65 ? 'amber' : h < 80 ? 'yellow' : h < 130 ? 'green' : h < 155 ? 'emerald' : h < 175 ? 'teal' : h < 195 ? 'cyan' : h < 220 ? 'sky blue' : h < 250 ? 'blue' : h < 265 ? 'indigo' : h < 285 ? 'violet' : h < 310 ? 'purple' : h < 330 ? 'magenta' : 'rose'
  return `${mod}${hue}`
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Field({ label, value, onChange, placeholder, textarea, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{
            width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '10px 12px',
            fontSize: 13, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5,
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '10px 12px',
            fontSize: 13, fontFamily: 'inherit',
          }}
        />
      )}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export default function CreateProject({ onCreated }) {
  const navigate = useNavigate()

  const [name, setName]                   = useState('')
  const [colorimetry, setColorimetry]     = useState('')
  const [ambiance, setAmbiance]           = useState('')
  const [camera, setCamera]               = useState('')
  const [colorDominant, setColorDominant]   = useState('')
  const [colorSecondary, setColorSecondary] = useState('')
  const [colorAccent, setColorAccent]       = useState('')
  const [negPrompt, setNegPrompt]         = useState('')
  const [imgPrompt, setImgPrompt]         = useState('')
  const [motionPrompt, setMotionPrompt]   = useState('')
  const [extendPrompt, setExtendPrompt]   = useState('')
  const [showDefaults, setShowDefaults]   = useState(false)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')

  const canSave = name.trim().length > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const r = await fetch(`${API}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          direction: {
            colorimetry:           colorimetry.trim(),
            ambiance:              ambiance.trim(),
            camera:                camera.trim(),
            color_dominant:        colorDominant,
            color_secondary:       colorSecondary,
            color_accent:          colorAccent,
            negative_prompt:       negPrompt.trim(),
            default_image_prompt:  imgPrompt.trim(),
            default_motion_prompt: motionPrompt.trim(),
            default_extend_prompt: extendPrompt.trim(),
          }
        })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur API')
      if (onCreated) onCreated()
      navigate(`/project/${d.id}`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Nouveau Projet</h1>
        <p className="page-subtitle">Définissez la direction artistique commune à toutes les générations du projet</p>
      </div>

      <div style={{ maxWidth: 660 }}>

        {/* Nom */}
        <div style={{ marginBottom: 32 }}>
          <div className="section-title" style={{ marginBottom: 20 }}>Identité du projet</div>
          <Field
            label="Nom du projet"
            value={name}
            onChange={setName}
            placeholder="ex. Rose Sauvage, Forêt Noire..."
          />
        </div>

        {/* Direction artistique */}
        <div style={{ marginBottom: 32 }}>
          <div className="section-title" style={{ marginBottom: 20 }}>Direction artistique</div>

          <Field
            label="Colorimétrie"
            value={colorimetry}
            onChange={setColorimetry}
            placeholder="ex. warm golden hour light, amber and teal tones, cinematic contrast..."
            textarea
            hint="Éclairage, palette de couleurs, tonalité — communs à toutes les générations"
          />

          <Field
            label="Ambiance"
            value={ambiance}
            onChange={setAmbiance}
            placeholder="ex. mysterious and dreamy, melancholic, raw and intimate..."
            textarea
            hint="Atmosphère, émotion, style narratif du projet"
          />

          <Field
            label="Caméra"
            value={camera}
            onChange={setCamera}
            placeholder="ex. handheld, slow dolly push, wide angle, shallow depth of field..."
            textarea
            hint="Mouvement de caméra, cadrage, optique — appliqué à toutes les étapes"
          />

          {/* Palette 60/30/10 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>
              Palette couleur 60 / 30 / 10
            </label>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
              Règle cinéma : 60% dominante · 30% secondaire · 10% accent — appliqué automatiquement aux 3 étapes
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: '60% Dominante',  value: colorDominant,  set: setColorDominant },
                { label: '30% Secondaire', value: colorSecondary, set: setColorSecondary },
                { label: '10% Accent',     value: colorAccent,    set: setColorAccent },
              ].map(({ label, value, set }) => (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>{label}</div>
                  <label style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
                    <div style={{
                      height: 40, borderRadius: 8, border: '2px solid var(--border)',
                      background: value || 'var(--bg-2)', transition: 'border-color 120ms',
                    }} />
                    <input type="color" value={value || '#000000'} onChange={e => set(e.target.value)}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                  </label>
                  <input
                    type="text" value={value}
                    onChange={e => { const v = e.target.value; if (v === '' || /^#[0-9A-Fa-f]{0,6}$/.test(v)) set(v) }}
                    placeholder="#000000" maxLength={7}
                    style={{
                      width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '5px 6px',
                      fontSize: 11, fontFamily: 'monospace', textAlign: 'center',
                    }}
                  />
                  {value && value.length === 7 && (
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{hexToColorName(value)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Field
            label="Prompt négatif (partagé)"
            value={negPrompt}
            onChange={setNegPrompt}
            placeholder="ex. blurry, ugly, deformed, watermark, text, oversaturated..."
            textarea
            hint="Ce négatif sera appliqué à toutes les générations du projet"
          />
        </div>

        {/* Prompts par défaut — section optionnelle */}
        <div style={{ marginBottom: 32 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '7px 14px', marginBottom: showDefaults ? 20 : 0 }}
            onClick={() => setShowDefaults(v => !v)}
          >
            {showDefaults ? '▼' : '▶'} Prompts par défaut (optionnel)
          </button>

          {showDefaults && (
            <>
              <div className="section-title" style={{ marginBottom: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                Prompts par défaut par type
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
                Ces prompts pré-rempliront les champs lors des évolutions. Vous pourrez les modifier à chaque étape.
              </div>

              <Field
                label="Image FLUX (défaut)"
                value={imgPrompt}
                onChange={setImgPrompt}
                placeholder="ex. cinematic portrait, soft bokeh, film grain..."
                textarea
              />

              <Field
                label="Image → Vidéo (mouvement défaut)"
                value={motionPrompt}
                onChange={setMotionPrompt}
                placeholder="ex. slow camera push in, gentle wind movement..."
                textarea
              />

              <Field
                label="Extension vidéo (continuité défaut)"
                value={extendPrompt}
                onChange={setExtendPrompt}
                placeholder="ex. continuous smooth movement, same atmosphere..."
                textarea
              />
            </>
          )}
        </div>

        {error && (
          <div className="validation-msg warn" style={{ marginBottom: 20 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!canSave || saving}
            style={{ fontSize: 13, padding: '10px 28px' }}
          >
            {saving ? 'Création...' : 'Créer le projet →'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => navigate(-1)}
            style={{ fontSize: 13, padding: '10px 20px' }}
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  )
}
