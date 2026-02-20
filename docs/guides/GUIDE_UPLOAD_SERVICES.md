# 📤 SERVICES D'UPLOAD - GUIDE & DÉPANNAGE

## 🎯 Pourquoi Un Upload ?

Pour l'extension image-to-video, PiAPI a besoin d'une **URL publique** de l'image.

```
Image locale → ❌ PiAPI ne peut pas accéder

Image en ligne → ✅ PiAPI peut télécharger et générer
```

---

## 🔄 SYSTÈME DE FALLBACK AUTOMATIQUE

Le système essaie **3 services** dans l'ordre :

### 1. **catbox.moe** (Priorité 1) ⭐

```
✅ Permanent
✅ Anonyme
✅ Pas de limite
✅ Fiable
✅ Rapide
```

**URL type :** `https://files.catbox.moe/abc123.jpg`

---

### 2. **tmpfiles.org** (Priorité 2)

```
✅ 7 jours de rétention
✅ Simple
⚠️  Parfois instable
```

**URL type :** `https://tmpfiles.org/dl/12345/image.jpg`

---

### 3. **0x0.st** (Priorité 3)

```
✅ 30 jours de rétention
✅ Simple
⚠️  Peut bloquer certaines connexions (403)
```

**URL type :** `https://0x0.st/abc.jpg`

---

## 🆘 SI TOUS LES SERVICES ÉCHOUENT

### Option A : Upload Manuel (Recommandé)

Le système vous demandera automatiquement :

```
❌ TOUS LES SERVICES D'UPLOAD ONT ÉCHOUÉ

💡 Solutions alternatives :

1. Upload manuel (recommandé) :
   • Ouvrez https://catbox.moe
   • Uploadez le fichier : outputs/temp/last_frame_XXX.jpg
   • Copiez l'URL obtenue

Collez l'URL de votre image (ou Entrée pour annuler) :
```

**Workflow :**

1. Le script vous donne le chemin de l'image
2. Allez sur https://catbox.moe
3. Cliquez "Choose File" → Sélectionnez l'image
4. Cliquez "Upload"
5. Copiez l'URL (ex: `https://files.catbox.moe/abc123.jpg`)
6. Collez dans le terminal
7. ✅ Continue automatiquement !

---

### Option B : Autres Services Manuels

Si catbox.moe ne marche pas non plus :

#### **imgbb.com**

```
1. https://imgbb.com
2. Upload
3. Copier "Direct link"
```

#### **imgur.com**

```
1. https://imgur.com/upload
2. Upload (anonyme)
3. Clic droit sur image → "Copy image address"
```

#### **postimages.org**

```
1. https://postimages.org
2. Choose images
3. Upload
4. Copier "Direct link"
```

---

## 🔍 DIAGNOSTIQUER LE PROBLÈME

### Erreur 403 Forbidden

```
requests.exceptions.HTTPError: 403 Client Error: FORBIDDEN
```

**Causes :**
- IP bloquée par le service
- User-agent suspect
- Rate limiting
- Restrictions géographiques

**Solution :** Le système passe au service suivant automatiquement

---

### Erreur Timeout

```
requests.exceptions.Timeout: ...
```

**Causes :**
- Connexion internet lente
- Service temporairement indisponible

**Solution :** Attendre et réessayer

---

### Erreur 500 Server Error

```
requests.exceptions.HTTPError: 500 Server Error
```

**Causes :**
- Service down
- Maintenance

**Solution :** Le fallback essaie le service suivant

---

## 🧪 TESTER LES SERVICES MANUELLEMENT

### Test catbox.moe

```bash
curl -F "reqtype=fileupload" \
     -F "fileToUpload=@outputs/temp/test.jpg" \
     https://catbox.moe/user/api.php
```

Retourne : URL directe

---

### Test tmpfiles.org

```bash
curl -F "file=@outputs/temp/test.jpg" \
     https://tmpfiles.org/api/v1/upload
```

Retourne : JSON avec URL

---

### Test 0x0.st

```bash
curl -F "file=@outputs/temp/test.jpg" \
     https://0x0.st
```

Retourne : URL directe

---

## 💡 ALTERNATIVES AVANCÉES

### Option 1 : Hébergement Cloud Personnel

Si vous avez AWS S3, Cloudflare R2, etc. :

```python
# Modifier video_utils.py pour ajouter :

def upload_to_s3(self, image_path: str) -> str:
    """Upload vers votre bucket S3."""
    import boto3
    
    s3 = boto3.client('s3')
    
    bucket = 'votre-bucket'
    key = f'frames/{Path(image_path).name}'
    
    s3.upload_file(image_path, bucket, key)
    
    return f'https://{bucket}.s3.amazonaws.com/{key}'
```

Puis dans `image_to_video_extend.py` :

```python
frame_url = self.utils.upload_to_s3(str(frame_path))
```

---

### Option 2 : Serveur Local Public

Si vous avez un serveur avec IP publique :

```bash
# Sur votre serveur
python3 -m http.server 8080

# Puis partager via ngrok
ngrok http 8080
```

Donnez l'URL ngrok à PiAPI.

---

## 🔧 AMÉLIORER LE SYSTÈME

### Ajouter un Service Personnalisé

Éditez `video_utils.py` :

```python
def upload_image_to_custom(self, image_path: str) -> str:
    """Votre service d'upload préféré."""
    
    with open(image_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            'https://votre-service.com/upload',
            files=files,
            timeout=60
        )
        response.raise_for_status()
        
        return response.json()['url']
```

Puis ajoutez dans `upload_image_with_fallback` :

```python
# Service 1 : Votre service custom
try:
    return self.upload_image_to_custom(image_path)
except Exception as e:
    print(f"⚠️  Custom échoué, essai catbox...")

# Service 2 : catbox.moe
...
```

---

## 📊 COMPARAISON DES SERVICES

| Service | Rétention | Fiabilité | Vitesse | Anonyme |
|---------|-----------|-----------|---------|---------|
| **catbox.moe** | Permanent | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | ✅ |
| **tmpfiles.org** | 7 jours | ⭐⭐⭐ | ⚡⚡ | ✅ |
| **0x0.st** | 30 jours | ⭐⭐⭐ | ⚡⚡⚡ | ✅ |
| **imgbb.com** | ? | ⭐⭐⭐⭐ | ⚡⚡ | ✅ |
| **imgur.com** | Permanent | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | ✅ |

**Recommandation :** catbox.moe (déjà en priorité 1)

---

## 🛡️ SÉCURITÉ & CONFIDENTIALITÉ

### Les Images sont Publiques

⚠️ **Important :** Les images uploadées sont **accessibles publiquement** à quiconque a l'URL.

**Ne pas uploader :**
- Informations personnelles sensibles
- Documents confidentiels
- Photos privées

**OK pour :**
- Frames de vidéos AI générées
- Images artistiques
- Contenus publics

---

### Durée de Vie

Les frames sont **automatiquement supprimées** de votre machine après extension.

Sur les services :
- **catbox.moe** : Permanent (mais anonyme)
- **tmpfiles.org** : 7 jours puis supprimé
- **0x0.st** : 30 jours puis supprimé

💡 **Astuce :** Pour tmpfiles/0x0.st, les URLs deviennent invalides après la période.

---

## 🎓 WORKFLOW COMPLET

### Cas Nominal (Tout Fonctionne)

```
1. Extraction frame → outputs/temp/last_frame_123.jpg
2. Upload auto (catbox.moe) → URL
3. Génération PiAPI → Vidéo continuation
4. Concat → Vidéo finale
5. Nettoyage → Frame supprimée localement
```

**Durée :** ~2 minutes

---

### Cas Avec Fallback

```
1. Extraction frame → OK
2. Upload catbox.moe → ❌ Échoue
3. Fallback tmpfiles.org → ❌ Échoue
4. Fallback 0x0.st → ✅ Succès !
5. Continue normalement...
```

**Durée :** ~2-3 minutes (délais des timeouts)

---

### Cas Manuel

```
1. Extraction frame → OK
2. Tous uploads échouent → ❌
3. Système demande URL manuelle
4. Vous : Ouvrez catbox.moe
5. Vous : Uploadez la frame
6. Vous : Collez l'URL
7. Continue normalement...
```

**Durée :** ~3-5 minutes (selon vous)

---

## 🆘 FAQ UPLOAD

### Q : Pourquoi pas simplement envoyer le fichier à PiAPI ?

**R :** PiAPI n'accepte que des URLs publiques, pas d'upload direct de fichiers.

### Q : L'image reste accessible combien de temps ?

**R :** 
- catbox.moe : Permanent
- tmpfiles.org : 7 jours
- 0x0.st : 30 jours

Mais PiAPI télécharge l'image immédiatement, donc même si l'URL expire après, ça n'affecte pas votre vidéo générée.

### Q : Peut-on utiliser Google Drive / Dropbox ?

**R :** Non, leurs liens ne sont pas des URLs directes d'images. Il faut des services qui donnent des liens directs comme `https://exemple.com/image.jpg`.

### Q : Et si je n'ai pas internet stable ?

**R :** L'upload manuel sur catbox.moe est très fiable. Vous pouvez aussi :
1. Faire l'upload depuis un autre réseau
2. Utiliser un hotspot mobile
3. Attendre une meilleure connexion

### Q : Les services sont-ils légaux ?

**R :** Oui, ce sont des services d'hébergement d'images publics et gratuits, largement utilisés. Respectez leurs conditions d'utilisation.

---

## 🔧 DÉPANNAGE RAPIDE

### Tous les services échouent ?

```bash
# 1. Tester votre connexion
curl https://catbox.moe

# 2. Tester avec une petite image
curl -F "reqtype=fileupload" \
     -F "fileToUpload=@/path/to/small.jpg" \
     https://catbox.moe/user/api.php

# 3. Si erreur, utiliser upload manuel
```

### Upload manuel ne marche pas ?

Essayez un autre service :
- https://imgbb.com
- https://imgur.com/upload
- https://postimages.org

Tous donnent des URLs directes utilisables.

---

**Le système d'upload est maintenant robuste avec 3 fallbacks automatiques !** 📤✨
