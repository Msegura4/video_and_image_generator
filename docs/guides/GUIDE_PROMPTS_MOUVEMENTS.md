# 🎬 GUIDE : PROMPTS AVEC MOUVEMENTS CAMÉRA

## 🎯 Pourquoi C'est Important

Pour que l'**extension** préserve la vitesse et le mouvement, le **prompt original** doit **décrire explicitement** :

1. **Type de mouvement** : dolly forward, pan, zoom, orbit...
2. **Vitesse** : slow, steady, fast...
3. **Direction** : forward, left, up...

---

## 📝 DUNE_EPIC : Amélioration du Prompt

### ❌ AVANT (Prompt actuel)

```
Vast desert landscape under a massive sun, towering sand dunes stretching 
to infinity, monumental scale, golden sand, deep blue sky, dramatic shadows, 
epic composition, sense of scale and majesty, cinematic wide shot...
```

**Problème :** Aucune mention du mouvement caméra !

---

### ✅ APRÈS (Prompt optimisé)

```
First-person POV steadily moving forward through vast desert landscape, 
smooth dolly tracking shot advancing across golden sand dunes, 
constant forward velocity, walking pace camera movement, 
towering dunes stretching to infinity under massive sun, 
monumental scale, deep blue sky, dramatic shadows, epic composition, 
cinematic wide composition, heat haze, dust particles in air, 
ultra-wide angle, panoramic vista
```

**Ajouts :**
- ✅ `First-person POV` → Type de vue
- ✅ `steadily moving forward` → Direction + rythme
- ✅ `smooth dolly tracking shot` → Type technique
- ✅ `constant forward velocity` → Vitesse constante
- ✅ `walking pace` → Référence de vitesse
- ✅ `advancing across` → Mouvement continu

---

## 🎥 VOCABULAIRE MOUVEMENTS CAMÉRA

### Direction & Type

| Mouvement | Prompt Keywords | Résultat |
|-----------|----------------|----------|
| **Forward dolly** | `steady forward dolly movement, advancing camera, moving ahead, first-person POV walking` | Avance vers l'avant |
| **Backward dolly** | `steady backward dolly, pulling back, camera retreating, moving away` | Recule |
| **Pan left** | `smooth pan left, steady leftward movement, horizontal tracking left` | Panoramique gauche |
| **Pan right** | `smooth pan right, steady rightward movement, horizontal tracking right` | Panoramique droite |
| **Tilt up** | `smooth tilt up, upward camera movement, looking up gradually` | Inclinaison vers le haut |
| **Tilt down** | `smooth tilt down, downward camera movement, looking down gradually` | Inclinaison vers le bas |
| **Zoom in** | `smooth zoom in, gradually closer, steady magnification` | Zoom avant |
| **Zoom out** | `smooth zoom out, gradually wider, steady widening` | Zoom arrière |
| **Orbital** | `smooth orbital movement, circling around, steady circular motion` | Rotation autour sujet |
| **Static** | `static camera, locked frame, no camera movement` | Plan fixe |

---

### Vitesse

| Vitesse | Keywords | Usage |
|---------|----------|-------|
| **Très lent** | `very slow, glacial pace, contemplative movement` | Scènes méditatives |
| **Lent** | `slow, leisurely pace, gentle movement` | Ambiance posée |
| **Modéré** | `steady pace, walking speed, moderate velocity` | ⭐ Le plus naturel |
| **Rapide** | `fast movement, quick pace, rapid motion` | Action, dynamisme |
| **Très rapide** | `very fast, high speed, racing movement` | Courses, poursuites |

---

### Fluidité

| Qualité | Keywords | Effet |
|---------|----------|-------|
| **Fluide** | `smooth, fluid, seamless` | Professionnel |
| **Stable** | `steady, stable, constant velocity` | Cinématique |
| **Glissant** | `gliding, floating, effortless` | Éthéré |
| **Saccadé** | `handheld, shaky, unstable` | Réaliste/nerveux |

---

## 🎯 EXEMPLES COMPLETS PAR PRESET

### 1. DUNE EPIC (Forward Dolly POV)

```python
"base_prompt": (
    "First-person POV steadily moving forward through vast desert landscape, "
    "smooth forward dolly tracking shot, constant walking pace velocity, "
    "advancing across towering golden sand dunes under massive sun, "
    "monumental scale, deep blue sky, dramatic shadows, epic composition, "
    "heat haze, dust particles in air, ultra-wide angle panoramic vista, "
    "cinematic wide composition, golden hour lighting"
)
```

**Pour extension :** Le système détectera "forward", "walking pace" et continuera à cette vitesse.

---

### 2. ARRIVAL MINIMAL (Slow Reveal)

```python
"base_prompt": (
    "Slow upward tilt revealing massive geometric alien structure, "
    "smooth vertical camera movement, contemplative pace, "
    "mysterious minimalist architecture emerging gradually, "
    "vast empty space, fog and mist, sense of wonder, "
    "muted gray-blue palette, cinematic composition"
)
```

**Pour extension :** Continuera le tilt up lent.

---

### 3. SPACESHIP ARRIVAL (Orbital Reveal)

```python
"base_prompt": (
    "Smooth orbital camera movement circling around massive hovering spacecraft, "
    "steady circular motion, constant angular velocity, "
    "monumental scale alien vessel, epic reveal moment, "
    "dramatic lighting, imposing presence, cinematic wide shot, "
    "science fiction atmosphere"
)
```

**Pour extension :** Continuera l'orbite à vitesse constante.

---

### 4. PORTAL TUNNEL (Forward Zoom)

```python
"base_prompt": (
    "First-person POV flying forward through mysterious cosmic tunnel, "
    "fast forward movement, accelerating camera, rushing through space, "
    "spiraling corridor of light and clouds, depth perspective, "
    "surreal atmosphere, dramatic contrast, bright core ahead, "
    "transformative journey, cinematic speed"
)
```

**Pour extension :** Continuera le mouvement rapide vers l'avant.

---

## 🔧 MODIFIER UN PRESET EXISTANT

### Méthode 1 : Éditer prompt_templates.py

```bash
cd ~/Desktop/"ROSE PANAMA"/videos/video_generator

# Ouvrir l'éditeur
nano prompts/prompt_templates.py
# ou
code prompts/prompt_templates.py
```

Chercher `"dune_epic"` et modifier `"base_prompt"`.

---

### Méthode 2 : Créer un Nouveau Preset

```bash
python3 main.py
→ Option 10 (Créer preset)
```

**Exemple pour Dune avec mouvement :**

```
ID : dune_forward_pov
Nom : Dune Forward POV
Prompt : First-person POV steadily moving forward through vast desert, 
         smooth dolly tracking, walking pace, golden sand dunes...
```

---

## 💡 CONSEILS POUR EXTENSION FLUIDE

### ✅ À FAIRE

1. **Être explicite sur le mouvement**
   ```
   "steady forward dolly movement"  ← Bon
   vs
   "cinematic shot"  ← Vague
   ```

2. **Mentionner la vitesse**
   ```
   "walking pace", "constant velocity", "steady speed"
   ```

3. **Utiliser des mots de continuité**
   ```
   "advancing", "progressing", "moving through"
   ```

4. **Cohérence temporelle**
   ```
   "same lighting", "consistent atmosphere"
   ```

---

### ❌ À ÉVITER

1. **Mouvements contradictoires**
   ```
   ❌ "pan left while zooming in while tilting up"
   → Trop complexe, l'extension sera saccadée
   ```

2. **Changements de direction**
   ```
   ❌ "camera starts moving forward then turns right"
   → La continuation ne saura pas où vous en êtes
   ```

3. **Actions avec fin**
   ```
   ❌ "landing sequence", "door opening"
   → Implique un arrêt
   ```

4. **Vitesse variable**
   ```
   ❌ "accelerating camera", "slowing down"
   → Vitesse incohérente dans l'extension
   ```

---

## 🎬 WORKFLOW COMPLET

### 1. Génération Initiale

```bash
python3 main.py
→ Option 1 (Preset)
→ dune_epic (ou votre preset modifié)
→ 5s, professional
```

**Prompt utilisé :**
```
First-person POV steadily moving forward through vast desert, 
smooth dolly tracking, walking pace...
```

---

### 2. Extension

```bash
python3 image_to_video_extend.py
```

**Le système :**
1. ✅ Lit le metadata → trouve le prompt original
2. ✅ Détecte "forward", "walking pace", "first-person POV"
3. ✅ Génère : `"continuing forward dolly movement, steady forward tracking, same speed and velocity, constant pace..."`
4. ✅ Résultat : Extension fluide à la même vitesse !

---

## 📊 TAUX DE RÉUSSITE PAR TYPE

| Type Mouvement | Fluidité Extension | Facilité |
|----------------|-------------------|----------|
| **Forward dolly constant** | ⭐⭐⭐⭐⭐ | Facile |
| **Pan horizontal constant** | ⭐⭐⭐⭐⭐ | Facile |
| **Zoom constant** | ⭐⭐⭐⭐⭐ | Facile |
| **Static shot** | ⭐⭐⭐⭐⭐ | Facile |
| **Tilt vertical** | ⭐⭐⭐⭐ | Moyen |
| **Orbital constant** | ⭐⭐⭐⭐ | Moyen |
| **Backward dolly** | ⭐⭐⭐ | Difficile |
| **Mouvements combinés** | ⭐⭐ | Très difficile |

**Recommandation :** Mouvements simples, unidirectionnels, à vitesse constante.

---

## 🔍 VÉRIFIER LA FLUIDITÉ

```bash
# Ouvrir la vidéo étendue
open outputs/extended_123.mp4

# Visionner autour du point de jonction (à ~5s)
ffplay -ss 4 -t 3 outputs/extended_123.mp4
```

**Bon signe :**
- Pas de saccade visible
- Vitesse cohérente
- Direction maintenue
- Pas de "saut" dans le mouvement

**Mauvais signe :**
- Ralentissement/accélération soudaine
- Changement de direction
- "Cut" visible dans le mouvement
- Incohérence de vitesse

---

## ✅ CHECKLIST PROMPT OPTIMAL

Pour un prompt qui s'étend bien :

- [ ] Mentionne le **type de mouvement** (dolly, pan, zoom...)
- [ ] Indique la **direction** (forward, left, up...)
- [ ] Précise la **vitesse** (walking pace, steady, slow...)
- [ ] Utilise des **mots de continuité** (advancing, moving, progressing...)
- [ ] **Évite** les mouvements complexes ou contradictoires
- [ ] **Évite** les actions avec début/fin claire
- [ ] Maintient **cohérence atmosphérique** (lighting, weather...)

---

**Avec ces principes, vos extensions seront fluides à 90% ! 🎬✨**
