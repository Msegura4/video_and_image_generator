# 🎥 Analyse Vidéo - POV & Mouvements Caméra

Ce système analyse vos **vidéos d'inspiration** pour détecter automatiquement:
- **POV** (Point de vue)
- **Mouvements de caméra** (pan, tilt, zoom, dolly)
- **Vitesse de mouvement**
- **Paramètres Kling** (générés automatiquement)

---

## 🚀 Usage Rapide

```bash
# Analyser les vidéos d'un preset
python3 analyze_video_inspirations.py dune_epic

# Analyser tous les presets
python3 analyze_video_inspirations.py
```

---

## 📊 Ce que l'Analyseur Détecte

### 🎬 **Mouvements de Caméra**

L'analyseur détecte automatiquement:

| Mouvement | Description |
|-----------|-------------|
| **pan_left / pan_right** | Panoramique horizontal |
| **tilt_up / tilt_down** | Inclinaison verticale |
| **zoom_in / zoom_out** | Zoom avant/arrière |
| **dolly_movement** | Travelling (caméra se déplace) |
| **static_shot** | Plan fixe |
| **handheld_shake** | Caméra portée (léger tremblement) |

### ⚡ **Vitesse de Mouvement**

- **very_slow** - Mouvement très lent, contemplatif
- **slow** - Mouvement lent, posé
- **medium** - Vitesse modérée
- **fast** - Mouvement rapide, dynamique
- **very_fast** - Très rapide, action

### 👁️ **Point de Vue (POV)**

| POV | Description | Exemple |
|-----|-------------|---------|
| **first_person** | Vue subjective | FPS games, POV driver |
| **third_person** | Vue externe | Film traditionnel |
| **aerial** | Vue aérienne | Drone, bird's eye |
| **ground_level** | Vue au ras du sol | Low angle dramatique |
| **eye_level** | Hauteur d'yeux | Vue naturelle |

---

## 🎯 Paramètres Kling Générés

L'analyseur génère **automatiquement les paramètres de caméra pour Kling**:

```json
{
  "type": "simple",
  "horizontal": 5,    // -10 à +10 (gauche/droite)
  "vertical": -3,     // -10 à +10 (haut/bas)
  "zoom": 2,          // -10 à +10 (zoom out/in)
  "pan": 10,          // -10 à +10 (panoramique)
  "tilt": -5,         // -10 à +10 (inclinaison)
  "roll": 0           // -10 à +10 (rotation, rare)
}
```

### Correspondance:
- **horizontal > 0** → Mouvement vers la droite
- **horizontal < 0** → Mouvement vers la gauche
- **vertical > 0** → Mouvement vers le bas
- **vertical < 0** → Mouvement vers le haut
- **zoom > 0** → Zoom in
- **zoom < 0** → Zoom out

---

## 📝 Exemple de Résultat

### Input:
Vous placez 3 vidéos de Dune (2021) montrant des plans lents panoramiques du désert.

### Output:
```
📊 SYNTHÈSE VIDÉO: DUNE_EPIC
======================================================================

📹 Vidéos analysées: 3

🎬 Mouvements détectés:
   • pan right
   • static shot
   • dolly movement

⚡ Vitesse dominante: slow
👁️  POV dominant: eye_level

🎯 PARAMÈTRES KLING SUGGÉRÉS:
   horizontal: 3
   vertical: 0
   zoom: 1
   pan: 6
   tilt: 0

💡 DESCRIPTION:
   slow smooth pan to the right, dolly camera movement
   eye-level perspective
```

---

## 🎬 Formats Vidéo Supportés

- `.mp4` ✅ (recommandé)
- `.mov` ✅
- `.avi` ✅
- `.mkv` ✅
- `.webm` ✅

**Recommandation**: MP4 H.264, 1080p minimum

---

## 💡 Conseils pour de Meilleures Analyses

### ✅ **Bonnes Pratiques**

1. **Durée**: 5-30 secondes par vidéo
2. **Qualité**: 1080p minimum (4K si possible)
3. **Variété**: 3-5 vidéos par preset
4. **Cohérence**: Même style de mouvement
5. **Netteté**: Vidéos bien exposées et nettes

### ❌ **À Éviter**

- Vidéos trop courtes (<2 secondes)
- Vidéos trop longues (>60 secondes)
- Compression excessive
- Mouvements trop rapides/chaotiques (sauf si voulu)
- Vidéos floues ou mal exposées

---

## 🔄 Workflow Complet

### 1. **Collecte**
```bash
# Téléchargez des clips de films/references
# Exemples: scènes de Dune, Blade Runner 2049, Arrival
```

### 2. **Organisation**
```bash
# Placez-les dans le bon dossier
mv ~/Downloads/dune_clip1.mp4 inspirations/dune_epic/
mv ~/Downloads/dune_clip2.mp4 inspirations/dune_epic/
```

### 3. **Analyse**
```bash
python3 analyze_video_inspirations.py dune_epic
```

### 4. **Intégration**
Les paramètres caméra détectés sont sauvegardés dans:
```
prompts/dune_epic_video_analysis.json
```

### 5. **Utilisation**
Copiez les paramètres Kling suggérés et utilisez-les lors de la génération:
```python
# Ces paramètres seront bientôt auto-intégrés dans main.py
camera_control = {
    "type": "simple",
    "horizontal": 3,
    "vertical": 0,
    "zoom": 1,
    # ... etc
}
```

---

## 🎯 Cas d'Usage

### **Scène Contemplative Lente (Arrival-style)**
```bash
# 1. Ajoutez 3-5 clips d'Arrival montrant les plans lents
cp ~/Movies/arrival_clips/*.mp4 inspirations/arrival_minimal/

# 2. Analysez
python3 analyze_video_inspirations.py arrival_minimal

# Résultat attendu:
# - Vitesse: very_slow / slow
# - Mouvements: static_shot, dolly_movement
# - POV: eye_level
# - Paramètres Kling: mouvements subtils (±2)
```

### **Action Spatiale Dynamique**
```bash
# 1. Ajoutez clips de vaisseaux en mouvement
cp ~/Downloads/spaceship_action/*.mp4 inspirations/spaceship_arrival/

# 2. Analysez
python3 analyze_video_inspirations.py spaceship_arrival

# Résultat attendu:
# - Vitesse: fast / very_fast
# - Mouvements: pan, zoom_in, dolly
# - POV: third_person
# - Paramètres Kling: mouvements marqués (±7-10)
```

---

## 🔧 Paramètres Avancés

### Modifier les Seuils de Détection

Éditez `analyze_video_inspirations.py`:

```python
# Ligne ~42-45
self.MOTION_THRESHOLD = 2.0   # Sensibilité mouvement
self.ZOOM_THRESHOLD = 0.05    # Sensibilité zoom
self.PAN_THRESHOLD = 5.0      # Sensibilité pan
self.TILT_THRESHOLD = 5.0     # Sensibilité tilt
```

**Plus faible** = Plus sensible (détecte mouvements subtils)
**Plus élevé** = Moins sensible (ignore micro-mouvements)

---

## 📂 Fichiers Générés

Après analyse:
```
prompts/
├── dune_epic_video_analysis.json
├── arrival_minimal_video_analysis.json
└── ...
```

Contenu:
- Propriétés vidéo (durée, FPS, résolution)
- Analyse mouvement frame par frame
- POV détecté
- Paramètres Kling suggérés
- Descriptions textuelles

---

## 🆘 Dépannage

### "Erreur: OpenCV not found"
```bash
pip3 install opencv-python --break-system-packages
```

### "Pas assez de frames pour analyser"
- Vérifiez que la vidéo fait au moins 2-3 secondes
- Essayez avec une autre vidéo

### "Vidéo non supportée"
- Convertissez en MP4:
```bash
ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4
```

### Analyse trop longue
- Limitez la durée des vidéos (15-30s max)
- Réduisez le nombre de vidéos par preset

---

## 🎨 Combinaison Images + Vidéos

**Workflow optimal:**

```bash
# 1. Analysez d'abord les IMAGES (style, couleurs, lighting)
python3 analyze_inspirations.py dune_epic

# 2. Puis analysez les VIDÉOS (mouvements, POV)
python3 analyze_video_inspirations.py dune_epic

# 3. Combinez les deux pour générer
python3 main.py
```

Les deux analyses se complètent:
- **Images** → Style visuel, ambiance, éclairage
- **Vidéos** → Dynamique, mouvements, POV

---

## 🔮 Fonctionnalités Futures

- [ ] Auto-intégration des paramètres caméra dans `main.py`
- [ ] Détection de depth of field
- [ ] Analyse de motion blur
- [ ] Détection de framing (rule of thirds, etc.)
- [ ] Timeline de mouvements (début/milieu/fin)

---

**Créez des vidéos avec les mouvements de caméra parfaits !** 🎬✨
