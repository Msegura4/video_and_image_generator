# 🔧 INSTALLATION - IMAGE-TO-VIDEO EXTEND

Guide complet pour installer la fonctionnalité d'extension de vidéos.

---

## 📦 FICHIERS À INSTALLER

Vous avez reçu 4 fichiers :

```
1. image_to_video_extend.py        # Module principal
2. video_utils.py                  # Utilitaires vidéo
3. GUIDE_IMAGE_TO_VIDEO_EXTEND.md  # Documentation
4. INTEGRATION_MENU.txt            # Instructions intégration
```

---

## ⚡ INSTALLATION RAPIDE (5 MINUTES)

### Étape 1 : Copier les fichiers

```bash
cd ~/Desktop/"ROSE PANAMA"/videos/video_generator

# Copier les 2 modules Python
cp ~/Downloads/image_to_video_extend.py .
cp ~/Downloads/video_utils.py .

# Copier la documentation
cp ~/Downloads/GUIDE_IMAGE_TO_VIDEO_EXTEND.md .
```

### Étape 2 : Installer FFmpeg

```bash
# macOS (Homebrew)
brew install ffmpeg

# Linux
sudo apt install ffmpeg

# Vérifier installation
ffmpeg -version
```

**Important** : FFmpeg est **obligatoire** pour extraire frames et concaténer vidéos.

### Étape 3 : Tester l'installation

```bash
# Test des utilitaires
python3 video_utils.py

# Si succès, vous verrez :
# ✅ FFmpeg détecté
# ... (tests)
```

### Étape 4 : Intégrer au menu (optionnel)

Voir le fichier `INTEGRATION_MENU.txt` pour les instructions détaillées.

---

## 🔍 INSTALLATION DÉTAILLÉE

### 1. Vérifier les prérequis

```bash
# Python 3.8+
python3 --version

# PiAPI configuré
cat .env | grep PIAPI_API_KEY

# Doit afficher :
# PIAPI_API_KEY=sk_xxxxx...
```

### 2. Installer FFmpeg

#### macOS (via Homebrew)

```bash
# Si Homebrew pas installé
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer FFmpeg
brew install ffmpeg

# Vérifier
ffmpeg -version
ffprobe -version
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install ffmpeg

# Vérifier
ffmpeg -version
```

#### Vérification complète

```bash
# Tester extraction frame
ffmpeg -sseof -1 -i outputs/ma_video.mp4 -update 1 -q:v 1 test_frame.jpg

# Si succès, frame créée
ls -lh test_frame.jpg
rm test_frame.jpg
```

### 3. Copier les fichiers

```bash
# Vérifier que vous êtes dans le bon dossier
pwd
# Devrait afficher : .../video_generator

# Copier les modules
cp ~/Downloads/image_to_video_extend.py .
cp ~/Downloads/video_utils.py .

# Vérifier
ls -l image_to_video_extend.py video_utils.py
```

### 4. Rendre exécutables

```bash
chmod +x image_to_video_extend.py
chmod +x video_utils.py
```

### 5. Test système

```bash
# Test 1 : Utilitaires
python3 video_utils.py

# Résultat attendu :
# ✅ FFmpeg détecté
# 🧪 TEST DES UTILITAIRES VIDÉO
# ... (si vidéos dans outputs/)

# Test 2 : Extendeur
python3 image_to_video_extend.py

# Résultat attendu :
# ✅ PiAPI (Kling AI) initialisé
# 🔄 EXTENSION VIDÉO - IMAGE-TO-VIDEO CHAIN
# 📹 VIDÉOS DISPONIBLES POUR EXTENSION
# ... (liste des vidéos)
```

---

## 🎯 INTÉGRATION AU MENU

### Option A : Modification Manuelle (Recommandée)

1. **Ouvrir main.py**

```bash
nano main.py
# ou
open -e main.py
```

2. **Ajouter l'import** (ligne ~15)

```python
from image_to_video_extend import ImageToVideoExtender
```

3. **Ajouter dans print_menu()** (ligne ~50)

```python
print(" 13. 🔄 Étendre vidéo - Image Chain (Nouveau !)")
```

4. **Ajouter la fonction** (ligne ~450, avant `def main()`)

```python
def extend_image_chain_menu():
    """Menu pour étendre une vidéo via image-to-video chain."""
    
    print("\n" + "="*70)
    print("🔄 EXTENSION VIDÉO - IMAGE-TO-VIDEO CHAIN")
    print("="*70)
    print("\n💡 Méthode : Dernière frame → Génération continuation → Concat")
    print("\n✅ Avantages :")
    print("   • Une seule API (PiAPI)")
    print("   • Moins cher ($0.33 vs points Kling)")
    print("   • Plus flexible (contrôle prompt)")
    print("\n⚠️  Prérequis : FFmpeg installé")
    print("   macOS : brew install ffmpeg")
    print("   Linux : sudo apt install ffmpeg")
    print()
    print("="*70)
    
    input("\n⏎  Appuyez sur Entrée pour continuer...")
    
    try:
        extender = ImageToVideoExtender()
        extender.interactive_extend()
    
    except FileNotFoundError as e:
        print(f"\n❌ Erreur : {e}")
        print("\n📥 Installez FFmpeg :")
        print("   macOS : brew install ffmpeg")
        print("   Linux : sudo apt install ffmpeg")
    
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
    
    input("\n⏎  Appuyez sur Entrée pour revenir au menu...")
```

5. **Ajouter dans la boucle** (ligne ~600, dans `def main()`)

```python
elif choice == '13':
    extend_image_chain_menu()
```

6. **Sauvegarder** et tester

```bash
python3 main.py
# Menu → 13 → Devrait fonctionner !
```

### Option B : Utilisation Standalone

Si vous ne voulez pas modifier main.py :

```bash
# Lancer directement
python3 image_to_video_extend.py

# Workflow interactif complet
```

---

## 📊 STRUCTURE FINALE

Après installation, vous devriez avoir :

```
video_generator/
├── main.py                              # (modifié avec option 13)
├── image_to_video_extend.py            # ← Nouveau
├── video_utils.py                      # ← Nouveau
├── GUIDE_IMAGE_TO_VIDEO_EXTEND.md      # ← Nouveau
├── INTEGRATION_MENU.txt                # ← Nouveau
├── .env                                 # (avec PIAPI_API_KEY)
├── src/
│   ├── kling_api.py
│   ├── video_generator.py
│   └── batch_processor.py
├── outputs/
│   ├── dune_epic_123.mp4               # Vidéos existantes
│   └── temp/                           # (créé automatiquement)
└── ... (autres fichiers)
```

---

## ✅ CHECKLIST D'INSTALLATION

- [ ] Python 3.8+ installé
- [ ] FFmpeg installé et fonctionnel
- [ ] PiAPI_API_KEY configuré dans .env
- [ ] image_to_video_extend.py copié
- [ ] video_utils.py copié
- [ ] Test `python3 video_utils.py` → ✅
- [ ] Test `python3 image_to_video_extend.py` → ✅
- [ ] (Optionnel) main.py modifié avec option 13
- [ ] Test complet extension vidéo → ✅

---

## 🧪 TEST COMPLET

### Test 1 : Génération vidéo de base

```bash
python3 main.py
→ Option 1 (Générer avec preset)
→ Choisir dune_epic
→ 5s, 16:9
→ Attendre génération
→ Vidéo dans outputs/dune_epic_XXX.mp4
```

### Test 2 : Extension via menu

```bash
python3 main.py
→ Option 13 (Étendre vidéo - Image Chain)
→ Choisir la vidéo générée
→ Prompt auto (Entrée)
→ Durée 5s
→ Mode professional
→ Transition cut
→ Confirmer
→ Attendre ~2 minutes
→ Vidéo étendue dans outputs/extended_XXX.mp4
```

### Test 3 : Vérification

```bash
# Vidéo originale
ffprobe outputs/dune_epic_XXX.mp4 2>&1 | grep Duration

# Vidéo étendue
ffprobe outputs/extended_dune_epic_XXX_YYY.mp4 2>&1 | grep Duration

# La durée doit être ~2× plus longue
```

---

## 🆘 DÉPANNAGE

### "FFmpeg not found"

```bash
# Vérifier PATH
which ffmpeg

# Si vide, réinstaller
brew install ffmpeg  # macOS
sudo apt install ffmpeg  # Linux

# Tester
ffmpeg -version
```

### "Module not found: image_to_video_extend"

```bash
# Vérifier présence
ls -l image_to_video_extend.py

# Si absent, recopier
cp ~/Downloads/image_to_video_extend.py .

# Vérifier permissions
chmod +x image_to_video_extend.py
```

### "Erreur extraction frame"

```bash
# Vérifier que la vidéo existe
ls -l outputs/*.mp4

# Tester manuellement
ffmpeg -sseof -1 -i outputs/ma_video.mp4 -update 1 test.jpg

# Si erreur, vidéo corrompue ou codec non supporté
```

### "Upload failed"

```bash
# Tester connexion internet
curl https://0x0.st

# Si échec, problème réseau
# Retry automatique dans le code
```

### "Concat failed"

```bash
# FFmpeg peut nécessiter certains codecs
brew install ffmpeg --with-all  # macOS

# Ou le système va fallback sur ré-encodage
# (plus lent mais fonctionne toujours)
```

---

## 💡 CONSEILS POST-INSTALLATION

### 1. Première utilisation

Commencez avec les réglages par défaut :
- Duration : 5s
- Mode : professional
- Transition : cut

### 2. Organisation fichiers

Les vidéos étendues ont le préfixe `extended_` :

```
outputs/
├── dune_epic_123.mp4          # Original 5s
└── extended_dune_epic_123_456.mp4  # Étendu 10s
```

### 3. Nettoyage

Les fichiers temporaires sont dans `outputs/temp/` et supprimés automatiquement.

Si besoin de les garder :

```python
extender.extend_video(
    "video.mp4",
    keep_temp=True  # Garder les fichiers intermédiaires
)
```

### 4. Documentation

Consultez `GUIDE_IMAGE_TO_VIDEO_EXTEND.md` pour :
- Exemples d'usage avancés
- Tarification détaillée
- Comparaison des méthodes
- Workflows recommandés

---

## 🎓 PROCHAINES ÉTAPES

1. ✅ Installation complète
2. ✅ Test avec une vidéo
3. 📖 Lire GUIDE_IMAGE_TO_VIDEO_EXTEND.md
4. 🎬 Créer vos premières extensions
5. 🚀 Intégrer dans votre workflow

---

## 📞 SUPPORT

Si problèmes persistent :

1. Vérifier FFmpeg installé : `ffmpeg -version`
2. Vérifier PiAPI configuré : `cat .env | grep PIAPI`
3. Tester utilitaires : `python3 video_utils.py`
4. Consulter les logs d'erreur complets
5. Vérifier permissions fichiers

---

**Installation terminée ! Prêt à étendre vos vidéos ! 🎬✨**
