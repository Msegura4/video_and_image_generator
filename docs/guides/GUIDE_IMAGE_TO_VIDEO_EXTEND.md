# 🔄 EXTENSION DE VIDÉOS - IMAGE-TO-VIDEO CHAIN

## 🎯 Principe

Au lieu d'utiliser l'API Kling officielle (coûteuse), on utilise la méthode **Image-to-Video Chain** :

```
Vidéo 5s → Extraire dernière frame → Générer 5s suite → Concaténer → Vidéo ~10s
```

## ✅ Avantages

- ✅ **Une seule API** : PiAPI uniquement (pas besoin API Kling officielle)
- ✅ **Moins cher** : $0.33 vs extend natif
- ✅ **Plus flexible** : Contrôle du prompt de continuation
- ✅ **Accessible** : Pas de setup complexe

## ⚠️ Prérequis

### 1. FFmpeg (Obligatoire)

```bash
# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg

# Vérifier installation
ffmpeg -version
```

### 2. PiAPI configuré

Dans votre `.env` :
```
PIAPI_API_KEY=sk_votre_cle_ici
```

---

## 🚀 Utilisation

### **Méthode 1 : Via le Menu (Simple)** ⭐

```bash
python3 main.py

# Menu → 13 (Étendre vidéo - Image Chain)
```

**Workflow interactif :**
1. Liste des vidéos disponibles
2. Choisir la vidéo
3. Prompt de continuation (optionnel)
4. Durée (5s ou 10s)
5. Mode (professional/standard)
6. Type de transition (cut/fade/blend)
7. Confirmation
8. ✅ Vidéo étendue !

### **Méthode 2 : Script Direct**

```bash
python3 image_to_video_extend.py
```

### **Méthode 3 : Python Code**

```python
from image_to_video_extend import ImageToVideoExtender

extender = ImageToVideoExtender()

# Extension simple
extended = extender.extend_video(
    video_path="outputs/dune_epic_123.mp4",
    duration=5,
    mode="professional"
)

print(f"Vidéo étendue : {extended}")
```

---

## 🎬 Options Disponibles

### **continuation_prompt** (optionnel)

Guider la suite de la vidéo :

```python
# Prompt automatique (recommandé)
extended = extender.extend_video("video.mp4")

# Prompt personnalisé
extended = extender.extend_video(
    "video.mp4",
    continuation_prompt="camera moves forward through the structure"
)
```

### **duration** (5 ou 10)

Durée de la continuation :

```python
# 5s (moins cher)
extended = extender.extend_video("video.mp4", duration=5)  # $0.33

# 10s (plus long)
extended = extender.extend_video("video.mp4", duration=10)  # $0.66
```

### **mode** (professional/standard)

Qualité de génération :

```python
# Professional (meilleure qualité)
extended = extender.extend_video("video.mp4", mode="professional")

# Standard (moins cher)
extended = extender.extend_video("video.mp4", mode="standard")
```

### **transition** (cut/fade/blend)

Type de transition entre les clips :

```python
# Cut (direct, recommandé)
extended = extender.extend_video("video.mp4", transition="cut")

# Fade (fondu 0.5s)
extended = extender.extend_video("video.mp4", transition="fade")

# Blend (mélange progressif)
extended = extender.extend_video("video.mp4", transition="blend")
```

---

## 💰 Tarification

| Configuration | Coût |
|--------------|------|
| **5s Standard** | $0.16 |
| **5s Professional** | $0.33 ⭐ |
| **10s Standard** | $0.32 |
| **10s Professional** | $0.66 |

**Recommandé** : 5s Professional = $0.33

---

## 📊 Processus Complet

### Étape 1 : Extraction Frame

```
📹 Video 5s → 📸 Dernière frame (JPG)
```

- FFmpeg extrait la toute dernière frame
- Qualité maximale (q:v 1)
- Sauvegarde temporaire

### Étape 2 : Upload Frame

```
📸 Frame → 📤 Upload 0x0.st → 🔗 URL publique
```

- Upload gratuit vers 0x0.st
- Disponible 30 jours
- URL directe pour PiAPI

### Étape 3 : Génération Continuation

```
🔗 URL + 📝 Prompt → 🎬 PiAPI → 📹 Video 5s continuation
```

- PiAPI génère 5s à partir de la frame
- Image-to-video avec prompt de continuation
- Qualité professionnelle

### Étape 4 : Concaténation

```
📹 Video originale + 📹 Continuation → ✂️ FFmpeg → 📹 Video ~10s
```

- Concat avec FFmpeg
- Options : cut, fade, blend
- Ré-encodage si nécessaire

---

## 🎯 Exemples d'Usage

### Exemple 1 : Extension Simple

```python
from image_to_video_extend import ImageToVideoExtender

extender = ImageToVideoExtender()

# Extension par défaut (5s pro, cut)
video = extender.extend_video("outputs/dune_epic_123.mp4")
```

**Résultat :**
```
📹 Vidéo originale : 5.2s
📹 Continuation : 5.0s
📹 Vidéo finale : 10.2s
💰 Coût : $0.33
📁 outputs/extended_dune_epic_123_1733456789.mp4
```

### Exemple 2 : Avec Prompt Personnalisé

```python
video = extender.extend_video(
    "outputs/spaceship_arrival_456.mp4",
    continuation_prompt="spaceship slowly descends towards the planet surface",
    duration=5,
    mode="professional"
)
```

### Exemple 3 : Avec Fade

```python
video = extender.extend_video(
    "outputs/portal_tunnel_789.mp4",
    duration=5,
    transition="fade"  # Fondu 0.5s
)
```

### Exemple 4 : Budget Mode

```python
video = extender.extend_video(
    "outputs/test_video.mp4",
    duration=5,
    mode="standard",  # Moins cher
    transition="cut"
)
# Coût : $0.16
```

---

## 📂 Fichiers Générés

### Structure

```
outputs/
├── dune_epic_123.mp4                    # Original 5s
├── dune_epic_123_metadata.json          # Metadata original
├── extended_dune_epic_123_456.mp4       # Étendu ~10s
├── extended_dune_epic_123_456_metadata.json  # Metadata extension
└── temp/
    ├── last_frame_789.jpg               # (temporaire, supprimé)
    └── continuation_789.mp4             # (temporaire, supprimé)
```

### Metadata Extension

```json
{
  "type": "extended_video",
  "method": "image_to_video_chain",
  "source_video": "outputs/dune_epic_123.mp4",
  "continuation_prompt": "continue the scene...",
  "continuation_duration": 5,
  "mode": "professional",
  "extended_at": 1733456789.123,
  "final_path": "outputs/extended_dune_epic_123_456.mp4"
}
```

---

## 🔍 Comparaison Méthodes

| Critère | Image-to-Video Chain | Extend Kling Natif |
|---------|---------------------|-------------------|
| **APIs requises** | PiAPI uniquement | PiAPI + API Kling |
| **Coût 5s** | $0.33 | Points Kling |
| **Setup** | Simple | Complexe |
| **Qualité transition** | Très bonne | Excellente |
| **Flexibilité prompt** | Totale | Limitée |
| **Temps génération** | ~2 min | ~1 min |

**Verdict** : Image-to-Video Chain = Meilleur rapport qualité/prix/simplicité

---

## 🆘 Dépannage

### "FFmpeg not found"

```bash
# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg

# Tester
ffmpeg -version
```

### "Erreur extraction frame"

- Vérifiez que la vidéo n'est pas corrompue
- Essayez avec une autre vidéo
- Vérifiez les permissions du dossier outputs/

### "Upload failed"

- Vérifiez votre connexion internet
- 0x0.st peut être temporairement indisponible
- Retry automatique prévu

### "Concat failed"

- FFmpeg peut nécessiter ré-encodage
- Le système retry automatiquement
- Vérifiez l'espace disque

### "Mauvaise transition"

- Utilisez `transition="cut"` (plus fiable)
- Fade/blend peuvent échouer selon codecs
- Le système fallback sur cut automatiquement

---

## 💡 Conseils

### ✅ Bonnes Pratiques

1. **Prompt de continuation cohérent**
   - Gardez le même style que l'original
   - Utilisez "continue", "maintain", "smooth"

2. **Durée optimale**
   - 5s = Meilleur rapport qualité/prix
   - 10s si vraiment besoin de longueur

3. **Mode professional**
   - Différence de qualité notable
   - Vaut les $0.17 supplémentaires

4. **Transition cut**
   - Plus fiable que fade/blend
   - Kling génère déjà des continuités fluides

### ❌ À Éviter

- Prompts trop différents de l'original
- Étendre des vidéos déjà étendues (qualité baisse)
- Mode standard si qualité importante
- Fade/blend sur des clips très différents

---

## 🎓 Workflow Recommandé

### Production Typique

```python
# 1. Générer vidéo initiale
from src.video_generator import VideoGenerator
gen = VideoGenerator()

video_5s = gen.generate(
    preset="dune_epic",
    duration=5,
    mode="professional"
)

# 2. Si besoin d'extension
from image_to_video_extend import ImageToVideoExtender
extender = ImageToVideoExtender()

video_10s = extender.extend_video(
    video_5s,
    duration=5,
    mode="professional"
)

# Résultat : Vidéo ~10s pour $0.33 + $0.33 = $0.66
```

### Extension Multiple

```python
# Étendre plusieurs fois (attention qualité)
video_1 = extender.extend_video("original_5s.mp4")  # → 10s
video_2 = extender.extend_video(video_1)             # → 15s
video_3 = extender.extend_video(video_2)             # → 20s

# Coût : 3 × $0.33 = $0.99
# Mais qualité diminue à chaque extension
```

---

## 🔮 Améliorations Futures

- [ ] Multi-frame seeding (3 dernières frames)
- [ ] Détection auto de mouvement caméra
- [ ] Transitions avancées (wipe, slide)
- [ ] Support batch (étendre plusieurs vidéos)
- [ ] Preview avant génération
- [ ] Optimisation prompt auto

---

## 📞 Support

Si problèmes :
1. Vérifiez FFmpeg installé
2. Vérifiez clé PiAPI dans .env
3. Testez avec `python3 video_utils.py`
4. Consultez les logs d'erreur

---

**Créez des vidéos longues sans API complexe !** 🎬✨
