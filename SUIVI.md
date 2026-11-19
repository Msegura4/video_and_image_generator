# Suivi évolutions — Video & Image Generator

Mis à jour : 19 nov 2026

---

## Contexte

Projet de génération vidéo et image via PIAPI (Kling pour la vidéo, Flux pour l'image).  
Stack : FastAPI (backend Python) + React/Vite (frontend). Déployé sur Render (prod) + local dev.

Session du 18-19 nov 2026 : migration Kling 2.5 → 4.0, debug pipeline extend vidéo, clarification architecture des prompts.

---

## Architecture des prompts

### Principe général — identique pour les 3 étapes

```
prompt final = userPrompt  (ou default_*_prompt si champ vide)
             + colorimetry + ambiance + camera + palette hex   ← suffix DA, toujours ajouté
```

Le suffix DA est volontairement toujours concaténé : c'est ce qui garantit la cohérence visuelle entre toutes les générations d'un même projet.

Chaque étape a son champ de fallback dans la Direction Artistique (DA) du projet :

| Étape | Fallback si champ vide | Suffix DA ajouté |
|---|---|---|
| Image (Flux) | `default_image_prompt` | oui |
| Img2Video (Kling) | `default_motion_prompt` | oui |
| Extend (Kling) | `default_extend_prompt` | oui |

### Nuance par étape

- **Image (Flux)** : reçoit prompt + DA suffix — le `negative_prompt` de la DA n'est **pas** envoyé à Flux
- **Img2Video (Kling)** : reçoit prompt + DA suffix + `negative_prompt` de la DA
- **Extend (Kling)** : reçoit prompt + DA suffix — `negative_prompt` non envoyé actuellement (à vérifier)

### Stockage des prompts

- **DA du projet** : `projects.json` en local · `rose-panama/projects-db` sur Cloudinary
- **Prompt de chaque génération** : sauvegardé dans `step.prompt` de l'évolution concernée, même fichier
- **Presets** : `prompts/prompt_templates.py` — dict Python, éditables depuis la page Prompts de l'app

---

## Chantiers à venir — modèle et API

### Objectif de la refacto (contexte)

La branche `refactor/heritage-classes` vise à n'avoir qu'à changer `config.py` pour modifier le comportement global (modèle, version, durée, etc.). L'idéal : zéro logique conditionnelle dans les agents.

### Ce qu'il a fallu changer manuellement lors du passage Kling 2.5 → 4.0

1. `config.py` : `KLING_MODEL_VERSION`, commentaire `KLING_DEFAULT_DURATION`
2. `video_generator_agent.py` : payload (retirer `negative_prompt`, ajouter `config.service_mode`)
3. `video_generator_agent.py` : `extract_video_url` (format de réponse différent)
4. `agent.py` : timeout polling 10s → 30s
5. `app.py` : coût estimé toujours hardcodé avec les anciens tarifs 2.5

### Ce que ça devrait être après refacto

Un seul changement dans `config.py` devrait suffire. Les capacités/restrictions par version devraient être déclarées dans un dict `KLING_VERSION_CAPS` et lues par les agents.

### Format de réponse PIAPI selon version

| Version | Chemin URL vidéo |
|---|---|
| Kling 4.0 / 3.0 | `output.video` (string directe) |
| Kling 2.x | `output.works[0].video.resource_without_watermark` |

Corrigé dans `extract_video_url` avec détection dynamique. À terme : déclarer le format attendu dans `config.py` par version.

---

## Chantiers à venir — stratégie extend

### Situation actuelle

La DA du projet (colorimetry, ambiance, camera) est conçue pour décrire la scène originale.  
Sur DUNE ça fonctionne car la DA = le prompt de la première vidéo → Kling reçoit le même contexte → transition quasi invisible.

Sur d'autres projets ce ne sera pas forcément vrai : si la DA décrit une scène statique, la continuation sera incohérente.

### `_build_continuation_prompt` (backend)

Méthode dans `video_extender_agent.py` qui construit un prompt style "continuing: ..." en lisant les métadonnées JSON de la vidéo source. Elle n'est **jamais appelée depuis le dashboard** car `withDA` envoie toujours quelque chose. Elle sert uniquement depuis la page ExtendVideo standalone si le champ est vide.

### Pistes d'amélioration

- Agent vision qui analyse la dernière frame et construit un prompt de continuation intelligent
- Champ `default_extend_prompt` formulé en style "continuing: ..." dans la DA de chaque projet
- Option UI pour basculer entre "mode DA" et "mode continuation pure"

---

## Feature — Image Link

### Concept

Générer un clip de transition entre deux vidéos en contraignant les deux extrémités :

- **Première frame** (`image_url`) : extraite automatiquement de la **dernière frame** de la vidéo source
- **Dernière frame** (`image_tail_url`) : extraite automatiquement de la **première frame** d'une vidéo cible fournie par l'utilisateur

Kling génère un clip qui part de la fin de la vidéo A et arrive sur le début de la vidéo C.  
Enchaîner A → clip link → C au montage donne une jonction invisible des deux côtés.

### Pourquoi c'est possible

Kling 4.0 supporte nativement `image_tail_url` (non utilisé actuellement).

```json
{
  "image_url":      "dernière_frame_video_A.jpg",
  "image_tail_url": "première_frame_video_C.jpg",
  "prompt":         "smooth transition, continuous movement..."
}
```

### Implémentation

1. UI : sélectionner une vidéo source (A) et une vidéo cible (C)
2. Backend : extraire la dernière frame de A et la première frame de C via FFmpeg
3. Envoyer les deux frames à Kling avec `image_url` + `image_tail_url`
4. Le reste du pipeline img2video est identique

Toute la logique d'extraction de frame existe déjà dans `VideoUtils`.

---

## Dettes techniques ponctuelles

| # | Problème | Fichier | Action |
|---|---|---|---|
| 1 | `negative_prompt` affiché dans React mais sans effet avec Kling 4.0 | `ProjectDashboard.jsx` | Masquer conditionnellement si `model_version === "4.0"` |
| 2 | `estimate_cost` dupliqué et hardcodé avec tarifs 2.5 | `app.py:274` | Appeler `VideoGenerator.estimate_cost()` |
| 3 | Comportement conditionnel par version (`is_v4`) dans les agents | `video_generator_agent.py` | Déclarer les caps par version dans `config.py` |
| 4 | Step bloqué en `in_progress` si le frontend se ferme pendant une génération | `ProjectDashboard.jsx` | Mécanisme de timeout côté backend (> 10 min → failed) |
| 5 | `negative_prompt` non envoyé à l'extend — intentionnel ? | `app.py` | Vérifier et aligner avec img2video |

---

## À tester sur les prochaines évolutions

- [ ] Extend complet de bout en bout avec Kling 4.0 (upload Cloudinary inclus)
- [ ] Vérifier que le step "Annuler" débloque bien un step bloqué en `in_progress`
- [ ] Tester l'extend sur un projet autre que DUNE (DA non identique au prompt original)
- [ ] Vérifier le comportement quand `default_extend_prompt` ET le champ sont vides
- [ ] Implémenter et tester Image Link (`image_url` + `image_tail_url`)
- [ ] Vérifier si `negative_prompt` devrait être envoyé à l'extend comme à l'img2video
