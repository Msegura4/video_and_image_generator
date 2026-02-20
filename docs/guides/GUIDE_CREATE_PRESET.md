# ➕ CRÉER VOS PROPRES PRESETS

## 🎯 Nouvelle Fonctionnalité

**Option 10** du menu principal : Créer un nouveau preset personnalisé

---

## 🚀 Comment Utiliser

### **Méthode 1 : Depuis le Menu (Recommandé)**

```bash
python3 main.py
```

**Menu :**
```
10. ➕ Créer un nouveau preset
```

L'assistant vous guidera à travers 7 étapes :

1. **ID du preset** (ex: `mon_style`, `cyber_city`)
2. **Nom du preset** (ex: "Mon Style Cyberpunk")
3. **Description** courte
4. **Prompt principal** (détaillé)
5. **Negative prompt** (optionnel)
6. **Mots-clés de style** (séparés par virgules)
7. **Paramètres recommandés** (ratio, durée, mode)

---

### **Méthode 2 : Directement**

```bash
python3 create_preset.py
```

---

## 📝 Exemple de Création

### **Scénario : Créer un preset "Cyberpunk Nuit"**

```
1️⃣  ID du preset : cyber_night

2️⃣  Nom : Cyberpunk Nuit

3️⃣  Description : Ville cyberpunk avec néons la nuit

4️⃣  PROMPT PRINCIPAL :
    Cyberpunk city at night, neon lights reflecting on wet streets,
    rain, purple and blue lighting, cinematic 8K, blade runner
    atmosphere, moody and atmospheric, photorealistic

5️⃣  NEGATIVE PROMPT :
    people, daylight, low quality, blurry

6️⃣  MOTS-CLÉS :
    cyberpunk, neon, moody, cinematic, atmospheric

7️⃣  PARAMÈTRES :
    Ratio : 16:9
    Durée : 10s
    Mode : professional

✅ Créer ce preset ? O
```

**Résultat :**
- ✅ Preset ajouté à `src/prompt_templates.py`
- ✅ Visible dans le menu Option 1
- ✅ Réutilisable immédiatement

---

## 🎬 Utiliser Votre Nouveau Preset

### **1. Générer une Vidéo**

```bash
python3 main.py
→ Option 1 (Générer avec preset)
→ Votre preset "cyber_night" apparaît dans la liste !
→ Choisir durée, ratio
→ Générer
```

### **2. L'Enrichir avec des Images**

```bash
# Créer dossier d'inspirations
mkdir -p inspirations/cyber_night

# Ajouter des images cyberpunk
# (glisser-déposer dans Finder)

# Analyser
python3 analyze_inspirations.py cyber_night

# Enrichir depuis le menu
python3 main.py → Option 5
```

### **3. Le Voir en Détail**

```bash
python3 view_prompts.py
→ Choisir votre preset
→ Voir tous les détails
```

---

## 🎨 Conseils pour un Bon Preset

### **✅ Bon Prompt de Base**

```
Cyberpunk city at night, neon lights, rain-soaked streets,
purple and blue lighting, moody atmosphere, cinematic
composition, blade runner aesthetic, 8K photorealistic,
volumetric fog, dramatic lighting
```

**Inclut :**
- Sujet principal ✅
- Style visuel ✅
- Éclairage ✅
- Ambiance ✅
- Qualité technique ✅

### **❌ Prompt Trop Simple**

```
Cyberpunk city
```

**Manque :**
- Détails de style
- Qualité
- Ambiance

---

## 💡 Exemples de Presets à Créer

### **1. Forêt Mystique**
```
ID: mystic_forest
Prompt: Enchanted forest with magical lighting, ethereal
        atmosphere, misty rays of light, ancient trees,
        fantasy mood, cinematic composition, 8K photorealistic
```

### **2. Désert Post-Apocalyptique**
```
ID: post_apoc_desert
Prompt: Post-apocalyptic desert wasteland, abandoned
        structures, dust storms, orange and brown tones,
        dramatic lighting, desolate atmosphere, mad max
        aesthetic, cinematic 8K
```

### **3. Laboratoire Futuriste**
```
ID: future_lab
Prompt: Futuristic laboratory, holographic displays, blue
        and white lighting, clean minimalist design,
        high-tech equipment, sci-fi atmosphere, cinematic
        composition, 8K photorealistic
```

---

## 🔄 Modifier un Preset Existant

Si vous voulez modifier un preset que vous avez créé :

```bash
nano src/prompt_templates.py
```

Cherchez votre preset par son ID et modifiez directement.

---

## 📦 Partager Vos Presets

Pour partager un preset avec quelqu'un :

1. Ouvrez `src/prompt_templates.py`
2. Copiez la section de votre preset (de `"mon_preset": {` à `},`)
3. Envoyez-le par email/message
4. L'autre personne le colle dans son fichier

---

## 🆘 Dépannage

### **"Preset déjà existant"**
Le preset avec cet ID existe déjà. Choisissez un autre ID ou écrasez.

### **"Fichier introuvable"**
Le fichier `src/prompt_templates.py` n'existe pas. Vérifiez le chemin.

### **Preset ne s'affiche pas**
Redémarrez le programme :
```bash
# Quitter avec Option 0
# Relancer
python3 main.py
```

---

## 🎯 Workflow Complet

```
1. CRÉER
   python3 main.py → Option 10
   → Suivre l'assistant
   → Confirmer

2. TESTER
   python3 main.py → Option 1
   → Choisir votre preset
   → Générer vidéo test (5s, standard)

3. AFFINER
   mkdir -p inspirations/mon_preset
   # Ajouter images
   python3 analyze_inspirations.py mon_preset

4. ENRICHIR
   python3 main.py → Option 5
   → Appliquer suggestions

5. PRODUIRE
   python3 main.py → Option 1
   → Mode professional, 10s
   → Vidéo finale !
```

---

## 📊 Résumé des Nouvelles Options Menu

| Option | Fonction | Fichier Lancé |
|--------|----------|---------------|
| 5 | Enrichir presets | `apply_suggestions.py` |
| 6 | Restaurer preset | `restore_prompt.py` |
| 7 | Voir presets | (interne) |
| 10 | Créer preset | `create_preset.py` |

---

**Créez vos propres styles uniques !** 🎨✨
