# 🍎 INSTALLATION SUR MAC

Guide spécifique pour macOS (votre configuration Intel avec AMD GPU).

## Prérequis

- macOS (testé sur votre configuration)
- Python 3.8+ (normalement préinstallé)
- Compte Kling AI

## Installation Complète

### 1. Extraire le projet

```bash
# Depuis le dossier où vous avez téléchargé video-generator/
cd video-generator
```

### 2. Activer votre environnement virtuel

```bash
# Si vous avez déjà un venv
source venv/bin/activate

# Sinon, créez-en un
python3 -m venv venv
source venv/bin/activate
```

### 3. Installer les dépendances

```bash
pip install -r requirements.txt --break-system-packages
```

**Note :** Le flag `--break-system-packages` est nécessaire sur macOS récent.

### 4. Obtenir votre clé API Kling

**🔑 ÉTAPE CRUCIALE**

Votre compte Google Kling ne donne PAS automatiquement accès à l'API.

**Procédure :**

1. Allez sur https://klingai.com
2. Connectez-vous avec votre compte Google existant
3. Cliquez sur votre avatar/profil (en haut à droite)
4. Cherchez une option **"API"**, **"Developer"** ou **"API Keys"**

**⚠️ IMPORTANT :** 

- Si vous ne voyez pas d'option API : L'accès API peut être limité aux plans payants
- Plan FREE web ≠ Accès API
- Vous devrez peut-être upgrader vers un plan Pro ($25.99/mois) pour avoir l'API

**Alternative si pas d'accès API :**
- Utilisez Kling via l'interface web pour tester
- Ce code sera prêt quand vous aurez l'API
- Ou utilisez une autre API (Runway, mais plus cher)

5. Si vous avez l'accès API, générez une clé
6. Copiez la clé (format : `kling_xxxxx...`)

### 5. Configurer votre clé API

```bash
# Copier le template
cp .env.example .env

# Éditer le fichier .env
nano .env
# ou
open -e .env
```

Remplacez `votre_cle_api_ici` par votre vraie clé :

```
KLING_API_KEY=kling_votre_vraie_cle_ici
```

Sauvegardez et fermez.

### 6. Tester l'installation

```bash
python main.py
```

Si tout fonctionne, vous verrez le menu principal. 🎉

## Problèmes Courants sur Mac

### "Command not found: python"

Essayez `python3` au lieu de `python` :

```bash
python3 main.py
```

### "No module named 'requests'"

Réinstallez les dépendances :

```bash
pip3 install -r requirements.txt --break-system-packages
```

### "Permission denied"

Rendez les scripts exécutables :

```bash
chmod +x main.py
```

### "API Key invalid"

Vérifications :
1. Votre clé est bien dans `.env` (pas `.env.example`)
2. Pas d'espaces autour du `=`
3. La clé commence bien par `kling_` ou le préfixe correct
4. Vous avez bien l'accès API (voir notes ci-dessus)

### Kling API pas disponible ?

**Plan B - Tester sans API immédiatement :**

Vous pouvez tester les prompts générés sans API :

```python
from prompts.prompt_templates import build_prompt, EXAMPLE_PROMPTS

# Voir les prompts optimisés
for name, prompt in EXAMPLE_PROMPTS.items():
    print(f"\n{name}:\n{prompt}\n")
```

Ces prompts fonctionnent aussi sur :
- Interface web Kling
- Runway Gen-3
- Autres APIs de génération vidéo

## Utilisation sur Mac

### Mode Interface (Recommandé)

```bash
python3 main.py
```

Suivez les menus interactifs.

### Mode Script

```python
from src.video_generator import VideoGenerator

gen = VideoGenerator()
gen.list_presets()
video = gen.generate(preset="dune_epic", duration=5)
```

### Vérifier les crédits

```bash
python3 -c "from src.kling_api import KlingAPI; KlingAPI().get_account_info()"
```

## Optimisations Mac

### Dossier Outputs

Les vidéos sont sauvegardées dans :
```
video-generator/outputs/
```

Vous pouvez ouvrir rapidement :
```bash
open outputs/
```

### Ouvrir une vidéo générée

```bash
open outputs/dune_epic_1234567890.mp4
```

### Performance

Votre Mac Intel/AMD :
- ✅ Peut exécuter le code Python sans problème
- ✅ Téléchargement/upload de vidéos rapide
- ❌ Ne peut PAS générer localement (nécessite GPU NVIDIA)
- ✅ Parfait pour orchestration via API cloud

## Structure du Projet sur Mac

```
video-generator/
├── main.py                 ← Lancer ceci
├── requirements.txt        ← Dépendances
├── .env                    ← Votre clé API (créer)
├── .env.example           ← Template
├── README.md              ← Doc complète
├── QUICKSTART.md          ← Guide rapide
├── INSTALL_MAC.md         ← Ce fichier
├── REFERENCE_ANALYSIS.md  ← Analyse de vos références
├── config/
├── references/            ← Vos images de référence
├── prompts/
│   ├── prompt_templates.py   ← Templates basés sur vos refs
│   ├── examples.json
│   └── examples.txt
├── src/
│   ├── kling_api.py         ← Client API
│   ├── video_generator.py   ← Générateur principal
│   └── batch_processor.py   ← Batch
└── outputs/                 ← VOS VIDÉOS ICI
```

## Workflow Recommandé

1. **Tester les presets**
   ```bash
   python3 main.py
   # Menu → Option 5 (voir presets)
   ```

2. **Générer une vidéo test**
   ```bash
   # Menu → Option 1 (preset)
   # Choisir "dune_epic"
   # Durée 5s pour tester
   ```

3. **Vérifier le résultat**
   ```bash
   open outputs/
   ```

4. **Ajuster et itérer**
   - Modifier les prompts dans `prompts/prompt_templates.py`
   - Créer vos propres presets
   - Tester différentes durées et ratios

## Coûts à Prévoir

### Plan FREE (si accès API)
- 66 crédits/jour
- ~6 vidéos de 5s/jour
- Gratuit
- Parfait pour tests

### Plan Pro ($25.99/mois)
- Plus de crédits
- Génération prioritaire
- Pour production régulière

## Support & Aide

### Problème d'API
→ Contactez support Kling : https://klingai.com/support

### Problème de code
→ Vérifiez les commentaires dans les fichiers source
→ Tous les modules sont documentés

### Questions fréquentes
→ Consultez README.md pour détails

## Alternatives si Pas d'API Kling

Si vous n'avez pas accès à l'API Kling, vous pouvez :

1. **Modifier pour Runway API** (fichier `src/kling_api.py` à adapter)
2. **Modifier pour Replicate API** (plus simple, bien documenté)
3. **Utiliser les prompts via interface web** (copier/coller les prompts générés)

Le système de prompts fonctionne avec n'importe quelle plateforme de génération vidéo.

## Next Steps

1. ✅ Obtenir l'accès API Kling
2. ✅ Configurer `.env`
3. ✅ Tester avec `python3 main.py`
4. ✅ Générer votre première vidéo
5. ✅ Personnaliser les presets selon vos besoins

---

**Besoin d'aide ?** Tout est documenté dans le code avec des commentaires détaillés.

**Bon film ! 🎬**
