# 🎨 ANALYSE DES RÉFÉRENCES VISUELLES

Ce document explique comment vos références ont été analysées et intégrées dans le système.

## Références Analysées

### 1. Architecture Brutalist Rose/Bordeaux
**Fichiers** : `4b743b94-5bde-4326-99f1-36058fe12397_copie.jpg`

**Caractéristiques détectées :**
- Architecture monumentale brutalist
- Palette rose/bordeaux désaturée
- Symétrie géométrique forte
- Échelle humaine vs structure (2 personnes au centre)
- Sol et murs ton sur ton
- Composition centrée, minimaliste

**Preset associé :** `human_contemplative`, `brutalist_architecture`

**Éléments de prompt générés :**
- "brutalist structure with geometric patterns"
- "rose and burgundy tones"
- "theatrical lighting, soft shadows"
- "centered composition, human at lower third"

---

### 2. Vaisseaux Spatiaux - Style "Arrival"
**Fichiers** : 
- `Capture_d_e_cran_2025-12-02_a__11_55_08.png` (vaisseaux flottants désert)
- `Capture_d_e_cran_2025-12-02_a__11_56_18.png` (vaisseaux + personnage silhouette)
- `premier-contact-1.jpg` (vaisseau elliptique océan)

**Caractéristiques détectées :**
- Vaisseaux massifs flottants
- Formes organiques/elliptiques
- Palette désaturée, tons brume/gris
- Échelle écrasante
- Atmosphère contemplative, mystérieuse
- Mouvements de caméra lents ou statiques

**Preset associé :** `arrival_minimal`, `spaceship_arrival`

**Éléments de prompt générés :**
- "massive geometric structure hovering"
- "muted gray-blue palette, diffused natural light"
- "slow upward tilt, static frame"
- "mysterious presence, sense of awe"
- "realistic physics, volumetric lighting"

---

### 3. Vaisseau Spatial Orbite
**Fichiers** : `Capture_d_e_cran_2025-12-02_a__11_57_22.png`

**Caractéristiques détectées :**
- Vue depuis l'espace, Terre en arrière-plan
- Vaisseau massif en orbite
- Contraste espace noir / Terre bleue
- Échelle cosmique
- Éclairage dramatique

**Preset associé :** `spaceship_arrival`

**Éléments de prompt générés :**
- "colossal alien spacecraft"
- "dramatic sky, volumetric lighting"
- "overwhelming scale, scientific realism"
- "8K, VFX quality, realistic physics"

---

### 4. Portal/Tunnel Cosmique
**Fichiers** : `Capture_d_e_cran_2025-11-26_a__14_50_57.png`

**Caractéristiques détectées :**
- Tunnel/vortex de nuages
- Lumière centrale brillante
- Textures organiques, tourbillonnantes
- Perspective profonde vers le centre
- Atmosphère mystique, transcendante

**Preset associé :** `portal_tunnel`

**Éléments de prompt générés :**
- "spiraling tunnel of clouds and light"
- "dramatic contrast, bright core"
- "forward movement through tunnel"
- "otherworldly journey, transcendent"
- "Interstellar aesthetic"

---

### 5. Personnage dans Environnement Naturel
**Fichiers** : 
- `IMG_1854.png` (homme à la mer, tons bleus)
- `IMG_1855.png` (vaisseau dans nuages)

**Caractéristiques détectées :**
- Personnage seul face à l'immensité
- Palette bleue saturée
- Corps humain détaillé, réaliste
- Environnement naturel dramatique
- Composition dynamique

**Éléments de prompt générés :**
- "lone figure standing before massive structure"
- "contemplative solitude"
- "photorealistic human anatomy"
- "natural environment, dramatic lighting"

---

### 6. Scène Urbaine/Architecturale
**Fichiers** : `Capture_d_e_cran_2025-12-02_a__12_20_05.png`

**Caractéristiques détectées :**
- Architecture moderne/brutaliste
- Noir et blanc/monochrome
- Perspective dramatique
- Composition géométrique forte
- Style graphique, contrasté

**Éléments de prompt générés :**
- "brutalist megastructure"
- "concrete grays, muted tones"
- "architectural photography"
- "modernist, imposing presence"

---

## Vidéo de Référence

**Fichier** : `Copie_de_Sans_titre.MP4`

**À analyser pour :**
- Type de mouvements de caméra préférés
- Rythme des transitions
- Style de montage
- Durée des plans

*(Note : Le système ne traite pas encore la vidéo automatiquement, mais vous pouvez ajuster les paramètres de caméra dans les presets)*

---

## Synthèse des Patterns Visuels

### Palette Colorimétrique Dominante
1. **Tons désaturés** : Rose, bordeaux, gris, bleu atténué
2. **Contraste faible à moyen**
3. **Atmosphère brumeuse, diffuse**
4. **Couleurs terreuses** (désert, sable, pierre)

### Composition
1. **Symétrie centrale** fréquente
2. **Échelle monumentale** (structure vs humain)
3. **Espaces vides importants**
4. **Plans larges, establishing shots**

### Style Cinématographique
1. **Denis Villeneuve / Arrival / Dune**
2. **Science-fiction contemplative**
3. **Réalisme physique** (gravité, lumière)
4. **Mouvements de caméra lents**
5. **Ambiance mystérieuse, épique**

### Thématiques Récurrentes
- Architecture monumentale
- Vaisseaux spatiaux massifs
- Solitude humaine face à l'immensité
- Premier contact / exploration
- Structures géométriques brutalist
- Environnements désertiques ou aquatiques

---

## Comment Ces Analyses Sont Utilisées

### 1. Dans les Presets
Chaque preset combine ces éléments :
```python
"dune_epic": {
    "base": "structure monumentale + désert",
    "color": "tons terreux désaturés",
    "camera": "mouvement lent contemplatif",
    "mood": "échelle épique, solitude",
    "quality": "Denis Villeneuve, 35mm"
}
```

### 2. Dans les Prompts Automatiques
Le système ajoute automatiquement :
- Les mots-clés stylistiques appropriés
- Les références techniques (35mm, anamorphic)
- Les références d'artistes (Denis Villeneuve)
- Les qualificatifs techniques (photorealistic, 8K)

### 3. Dans les Paramètres Kling AI
- Mode : `professional` (qualité maximale)
- Aspect ratio : `16:9` (format cinéma)
- Durée : 5-10s (plans contemplatifs)

---

## Personnaliser Selon Vos Références

Pour ajouter votre propre style :

1. **Ajoutez vos images** dans `/references/`
2. **Analysez visuellement** :
   - Quelles couleurs dominent ?
   - Quel type de composition ?
   - Quel mouvement de caméra ?
3. **Créez un nouveau preset** dans `prompts/prompt_templates.py`
4. **Testez et ajustez**

Exemple :
```python
"mon_style_custom": {
    "base": "votre description de base",
    "color": "votre palette",
    "camera": "votre mouvement caméra",
    "mood": "votre ambiance",
    "quality": "vos références techniques"
}
```

---

## Exemples de Prompts Finaux Générés

### À partir de "dune_epic"
```
Cinematic wide shot, monumental brutalist structure in vast desert landscape, 
desaturated earth tones with rose and burgundy hues, warm golden hour lighting, 
static camera, slight drift forward, 35mm anamorphic lens, 
epic scale, contemplative atmosphere, photorealistic, 
8K, film grain, Denis Villeneuve cinematography. 
professional mode | cinematic quality | high fidelity | 5 seconds duration
```

### À partir de "arrival_minimal"
```
Minimalist composition, massive geometric structure hovering in misty atmosphere, 
muted gray-blue palette, diffused natural light, atmospheric haze, 
slow upward tilt, static frame, wide angle lens, 
mysterious presence, sense of awe, lonely human figure for scale, 
photorealistic, cinematic, high detail. 
professional mode | cinematic quality | high fidelity | 5 seconds duration
```

---

## Notes Techniques

- **Format optimal** : 16:9 pour style cinéma
- **Durée recommandée** : 5s pour tests, 10s pour plans contemplatifs
- **Mode Kling** : Professional (meilleure qualité)
- **Negative prompts** : Automatiquement ajoutés pour éviter les artefacts

---

**Ce document est mis à jour au fur et à mesure que vous ajoutez de nouvelles références.**
