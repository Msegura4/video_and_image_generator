# 🚀 GUIDE PIAPI - PAY-AS-YOU-GO

## Pourquoi PiAPI au lieu de l'API officielle Kling ?

### ✅ Avantages PiAPI

| Critère | **PiAPI** | API Officielle Kling |
|---------|-----------|---------------------|
| **Frais minimum** | **$0** ✅ | $4,200 (3 mois) ❌ |
| **Paiement** | **Pay-as-you-go** ✅ | Forfait uniquement |
| **Accès** | **Immédiat** ✅ | Approbation requise |
| **Prix/vidéo 5s pro** | **$0.33-0.46** ✅ | $0.49-0.98 |
| **Setup** | **Simple** ✅ | Complexe |

### 💰 Tarification PiAPI (Décembre 2025)

#### Kling 2.5 (Nouveau, meilleur prix ⭐)
- **5 secondes Pro** : $0.33
- **10 secondes Pro** : $0.66

#### Kling 1.6 / 2.1
- **5s Standard** : $0.26
- **5s Professional** : $0.46
- **10s Standard** : $0.52
- **10s Professional** : $0.92

**Recommandation** : Utilisez Kling 2.5 pour le meilleur rapport qualité/prix !

---

## 📝 Inscription PiAPI (5 minutes)

### Étape 1 : Créer un compte

1. Allez sur https://piapi.ai
2. Cliquez sur **"Sign Up"**
3. Inscrivez-vous avec :
   - Email
   - OU Google
   - OU GitHub

### Étape 2 : Obtenir votre API Key

1. Une fois connecté, allez dans **"Dashboard"**
2. Cliquez sur **"API Keys"** dans le menu
3. Cliquez sur **"Create New API Key"**
4. Donnez-lui un nom (ex: "video-generator")
5. **Copiez la clé** (format: `sk-xxxxx...`)

⚠️ **Important** : Sauvegardez cette clé immédiatement, elle ne sera plus affichée !

### Étape 3 : Recharger votre compte

1. Allez dans **"Billing"** ou **"Balance"**
2. Cliquez sur **"Add Credits"**
3. Choisissez un montant :
   - **$5 minimum** (≈15 vidéos 5s en Kling 2.5 Pro)
   - **$10** (≈30 vidéos)
   - **$20** (≈60 vidéos)
   - Plus si vous voulez

4. Payez avec :
   - Carte bancaire
   - PayPal
   - Crypto (selon disponibilité)

💡 **Conseil** : Commencez avec $10 pour tester

---

## ⚙️ Configuration dans le Système

### Méthode 1 : Fichier .env (Recommandé)

```bash
# Copier le template
cp .env.example .env

# Éditer .env
nano .env
# ou
open -e .env
```

Ajoutez votre clé :
```
PIAPI_API_KEY=sk_votre_vraie_cle_ici
```

### Méthode 2 : Via l'interface

```bash
python3 main.py
# Menu → 7 (Configuration API)
# Entrez votre clé PiAPI
```

### Méthode 3 : En Python direct

```python
from src.video_generator import VideoGenerator

# Passer la clé directement
gen = VideoGenerator(api_key="sk_votre_cle")
```

---

## 🧪 Tester la Configuration

```bash
python3 test_system.py
```

Vous devriez voir :
```
✅ PiAPI (Kling AI) initialisé - Mode Pay-as-you-go
💳 Balance PiAPI : $10.00
💡 Environ 30 vidéos 5s en mode pro (Kling 2.5)
```

---

## 🎬 Première Génération

### Test Simple

```bash
python3 main.py
→ Menu 1 (preset)
→ Choisir 1 (dune_epic)
→ Durée 5
→ Ratio 1 (16:9)
```

**Coût** : $0.33 (Kling 2.5 Pro)

### En Python

```python
from src.video_generator import VideoGenerator

gen = VideoGenerator()

# Générer avec Kling 2.5 (meilleur prix)
video = gen.generate(
    preset="dune_epic",
    duration=5,
    mode="professional"
)

print(f"Vidéo : {video}")
```

---

## 💡 Optimiser les Coûts

### 1. Choisir le bon modèle

| Besoin | Modèle | Prix 5s | Quand utiliser |
|--------|--------|---------|----------------|
| **Test rapide** | Kling 2.5 Pro | **$0.33** | Itérations, tests |
| **Qualité max** | Kling 2.1 Pro | $0.46 | Production finale |
| **Budget serré** | Kling 1.6 Std | $0.26 | Brouillons |

### 2. Stratégie de production

```
1. Brouillon → Kling 2.5 Pro ($0.33) 
2. Ajuster prompt
3. Test final → Kling 2.1 Pro ($0.46)
4. Valider
5. Production → Kling 2.5 Pro en batch
```

### 3. Utiliser le mode Standard pour tests

```python
video = gen.generate(
    preset="dune_epic",
    duration=5,
    mode="standard"  # $0.26 au lieu de $0.46
)
```

---

## 📊 Suivre sa Consommation

### Via l'interface

```bash
python3 main.py
→ Menu 6 (Vérifier crédits)
```

### Via Python

```python
from src.kling_api import KlingAPI

api = KlingAPI()
api.get_account_info()
```

Affiche :
```
💳 Balance PiAPI : $7.68
💡 Environ 23 vidéos 5s en mode pro (Kling 2.5)
```

---

## 🎯 Cas d'Usage & Budgets

### Projet Test (10 vidéos)
- Modèle : Kling 2.5 Pro
- Durée : 5s
- **Budget** : $3.30

### Court-métrage (30 scènes)
- Modèle : Mix Kling 2.5 Pro (tests) + Kling 2.1 Pro (finales)
- Durée : 5-10s
- **Budget** : $15-25

### Production mensuelle (100 vidéos)
- Modèle : Kling 2.5 Pro
- Durée : 5s moyenne
- **Budget** : $33/mois

---

## ⚡ Fonctionnalités PiAPI

### 1. Text-to-Video
```python
video = gen.generate(
    prompt="Massive brutalist pyramid in desert",
    duration=5
)
```

### 2. Image-to-Video
```python
video = api.generate_video(
    prompt="Camera slowly pans around the structure",
    image_url="https://votre-image.jpg",
    duration=5
)
```

### 3. Multiple Versions Kling
```python
# Kling 2.5 (nouveau, moins cher)
video = api.generate_video(
    prompt="...",
    model_version="2.5"
)

# Kling 2.1 (qualité max)
video = api.generate_video(
    prompt="...",
    model_version="2.1"
)
```

---

## 🔧 Paramètres Avancés

### Tous les paramètres disponibles

```python
video = api.generate_video(
    prompt="Massive alien structure",
    negative_prompt="blurry, low quality",  # Optionnel
    duration=10,                             # 5 ou 10
    aspect_ratio="16:9",                     # "16:9", "9:16", "1:1"
    mode="professional",                     # "professional" ou "standard"
    model_version="2.5",                     # "1.5", "1.6", "2.0", "2.1", "2.5"
    image_url=None,                          # Pour image-to-video
    callback_url=None                        # Webhook (optionnel)
)
```

---

## 🆘 Dépannage

### "API Key invalid"
→ Vérifiez que votre clé est bien dans `.env`
→ Format : `PIAPI_API_KEY=sk_xxxxx...`
→ Pas d'espaces autour du `=`

### "Insufficient balance"
→ Rechargez sur https://piapi.ai/billing
→ Minimum $5

### "Rate limit exceeded"
→ Attendez quelques secondes entre les requêtes
→ Ou ajoutez un délai dans batch_processor

### Vidéo de mauvaise qualité
→ Utilisez `mode="professional"`
→ Essayez `model_version="2.1"` pour qualité max
→ Ajoutez plus de détails dans le prompt

---

## 📈 Comparaison des Modèles

| Modèle | Qualité | Vitesse | Prix 5s Pro | Recommandé pour |
|--------|---------|---------|-------------|-----------------|
| **Kling 2.5** | ⭐⭐⭐⭐ | ⚡⚡⚡ | **$0.33** | Production volume |
| **Kling 2.1** | ⭐⭐⭐⭐⭐ | ⚡⚡ | $0.46 | Qualité maximale |
| **Kling 2.0** | ⭐⭐⭐⭐ | ⚡⚡ | $0.96 | Legacy |
| **Kling 1.6** | ⭐⭐⭐ | ⚡⚡⚡ | $0.46 | Tests rapides |

**Notre recommandation** : Kling 2.5 Pro pour 90% des cas

---

## 🎓 Ressources

### Documentation
- **PiAPI Docs** : https://piapi.ai/docs/kling-api
- **Dashboard** : https://piapi.ai/dashboard
- **Pricing** : https://piapi.ai/pricing

### Support
- **Discord PiAPI** : Support communautaire actif
- **Email** : support@piapi.ai
- **Status** : https://status.piapi.ai

### Modèles disponibles via PiAPI
- Kling AI (toutes versions)
- Luma Dream Machine
- Runway Gen-3
- Flux (images)
- Et plus encore !

---

## 💬 Comparaison Finale

### PiAPI vs Kling Officiel

**Choisir PiAPI si** :
- ✅ Vous débutez
- ✅ Budget limité
- ✅ Besoin de flexibilité
- ✅ Pay-as-you-go préféré

**Choisir Kling Officiel si** :
- ❌ Très gros volume (>$4,200/3 mois)
- ❌ Entreprise avec budget fixe
- ❌ Support direct Kuaishou requis

**Pour 99% des utilisateurs : PiAPI est le meilleur choix** 🎯

---

## ✅ Checklist Avant de Commencer

- [ ] Compte PiAPI créé
- [ ] API Key obtenue
- [ ] Balance rechargée (min $5-10)
- [ ] Clé configurée dans `.env`
- [ ] Test système OK (`python3 test_system.py`)
- [ ] Première vidéo test générée

---

**Vous êtes prêt ! Bonne création ! 🎬✨**
