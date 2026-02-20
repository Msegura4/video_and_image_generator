"""
Templates de prompts pour chaque preset.
Organisés par style visuel.
"""

STYLE_PRESETS = {
    "dune_epic": {
        "base": "Vast desert landscape with towering sand dunes stretching to infinity under a massive sun, large pale pink planet in the middle background, golden sand, deep blue sky, dramatic shadows, monumental scale, epic cinematic wide composition, ultra-wide angle panoramic vista, moody lighting with soft shadows, heat haze and dust particles in air. Background in the middle : big planet with pink colors",
        "color": "desaturated earth tones with rose and burgundy hues, warm golden hour lighting",
        "camera": "very fast tracking shot advancing towards the distant pink planet on the horizon, never stopping, 35mm anamorphic lenns",
        "quality": "8K, film grain, Denis Villeneuve cinematography"
    },
}

def build_prompt(preset_name: str, custom_prompt: str = None, duration: int = 5) -> str:
    """
    Construit un prompt complet à partir d'un preset.
    
    Args:
        preset_name: Nom du preset à utiliser
        custom_prompt: Prompt personnalisé optionnel à combiner
        duration: Durée de la vidéo (pour optimisations futures)
        
    Returns:
        str: Prompt complet
    """
    if preset_name not in STYLE_PRESETS:
        # Si preset inconnu, retourner custom prompt seul
        return custom_prompt or ""
    
    preset = STYLE_PRESETS[preset_name]
    
    # Construire le prompt complet
    parts = []
    if preset.get('base'):
        parts.append(preset['base'])
    if preset.get('color'):
        parts.append(preset['color'])
    if preset.get('camera'):
        parts.append(preset['camera'])
    if preset.get('quality'):
        parts.append(preset['quality'])
    
    full_prompt = ", ".join(parts)
    
    # Si custom prompt fourni, le mettre au début
    if custom_prompt:
        full_prompt = f"{custom_prompt}, {full_prompt}"
    
    return full_prompt


def get_negative_prompt(preset_name: str = None) -> str:
    """
    Retourne le negative prompt pour un preset.
    
    Args:
        preset_name: Nom du preset (optionnel)
        
    Returns:
        str: Le negative prompt
    """
    # Negative prompt par défaut
    default_negative = "low quality, blurry, distorted, amateur, watermark, text, UI, signature, worst quality, low resolution, out of focus, motion blur, grainy, compression artifacts"
    
    # Negative prompts personnalisés par preset
    preset_negatives = {
        "dune_epic": "people, characters, vehicles, buildings, green vegetation, water, clouds, motion blur, lens flare",
        "arrival_minimal": "people, crowds, action, bright colors, busy composition, clutter, detailed textures",
        "spaceship_arrival": "people close-up, ground details, vegetation, small objects, motion blur, explosions",
        "dune_brutalist_ship": "people, characters, vehicles, buildings, green vegetation, water, clouds, motion blur, lens flare, metallic shiny surface, chrome, reflective metal, static stationary spaceship",
        "human_contemplative": "multiple people, action, movement, bright colors, busy background, smile, looking at camera",
        "brutalist_architecture": "people, vegetation, decorations, warm colors, soft lighting, organic shapes",
        "underwater_alien": "humans, boats, fish, realistic ocean, surface visible, bright sunlight, shallow water",
        "portal_tunnel": "people, vehicles, everyday objects, realistic textures, bright daylight, cluttered details"
    }
    
    if preset_name and preset_name in preset_negatives:
        return preset_negatives[preset_name]
    
    return default_negative


def get_preset_info(preset_name: str) -> dict:
    """
    Récupère les informations d'un preset.
    
    Args:
        preset_name: Nom du preset
        
    Returns:
        dict: Informations du preset ou dict vide si non trouvé
    """
    return STYLE_PRESETS.get(preset_name, {})


def list_presets() -> list:
    """
    Liste tous les presets disponibles.
    
    Returns:
        list: Liste des noms de presets
    """
    return list(STYLE_PRESETS.keys())


def get_preset_by_index(index: int) -> tuple:
    """
    Récupère un preset par son index.
    
    Args:
        index: Index du preset (commence à 0)
        
    Returns:
        tuple: (preset_name, preset_data) ou (None, None) si index invalide
    """
    presets = list(STYLE_PRESETS.items())
    if 0 <= index < len(presets):
        return presets[index]
    return None, None


def format_preset_display(preset_name: str) -> str:
    """
    Formate l'affichage d'un preset pour le menu.
    
    Args:
        preset_name: Nom du preset
        
    Returns:
        str: Texte formaté pour l'affichage
    """
    if preset_name not in STYLE_PRESETS:
        return f"{preset_name} (preset inconnu)"
    
    preset = STYLE_PRESETS[preset_name]
    base = preset.get('base', '')
    
    # Tronquer si trop long
    if len(base) > 60:
        base = base[:60] + "..."
    
    return f"{preset_name}\n     {base}"


def optimize_prompt_for_architecture(description: str) -> str:
    """
    Optimise un prompt pour l'architecture brutalist/monumentale.
    
    Args:
        description: Description de base de la scène architecturale
        
    Returns:
        str: Prompt optimisé avec mots-clés architecturaux
    """
    # Mots-clés architecturaux
    keywords = [
        "brutalist architecture",
        "geometric patterns",
        "massive structure",
        "monumental scale",
        "architectural photography",
        "concrete",
        "symmetry",
        "building",
        "architecture"
    ]
    
    # Vérifier si des keywords sont déjà présents
    desc_lower = description.lower()
    has_arch_keywords = any(keyword in desc_lower for keyword in keywords)
    
    # Construire le prompt optimisé
    optimized = description
    
    if not has_arch_keywords:
        optimized += ", brutalist architecture, monumental scale, geometric patterns"
    
    # Ajouter qualité si pas présente
    if "cinematic" not in desc_lower and "architectural" not in desc_lower:
        optimized += ", cinematic composition, architectural photography"
    
    if "detail" not in desc_lower and "quality" not in desc_lower:
        optimized += ", hyperrealistic, sharp detail"
    
    return optimized


def optimize_prompt_for_spaceship(description: str) -> str:
    """
    Optimise un prompt pour les vaisseaux spatiaux.
    
    Args:
        description: Description de base du vaisseau spatial
        
    Returns:
        str: Prompt optimisé avec mots-clés sci-fi
    """
    # Mots-clés sci-fi / spaceship
    keywords = [
        "spacecraft",
        "spaceship",
        "alien",
        "massive",
        "hovering",
        "descending",
        "sci-fi",
        "ship",
        "vessel"
    ]
    
    desc_lower = description.lower()
    has_scifi_keywords = any(keyword in desc_lower for keyword in keywords)
    
    # Construire le prompt optimisé
    optimized = description
    
    if not has_scifi_keywords:
        optimized += ", massive alien spacecraft, epic scale"
    
    # Ajouter effets visuels
    if "lighting" not in desc_lower and "light" not in desc_lower:
        optimized += ", dramatic lighting, volumetric atmosphere"
    
    if "cinematic" not in desc_lower:
        optimized += ", cinematic composition"
    
    if "quality" not in desc_lower and "8k" not in desc_lower and "vfx" not in desc_lower:
        optimized += ", 8K VFX quality, realistic physics"
    
    return optimized


def optimize_prompt_for_kling(prompt: str, preset_name: str = None) -> str:
    """
    Optimise un prompt pour l'architecture Kling AI.
    Limite la longueur et ajoute des mots-clés de qualité si nécessaire.
    
    Args:
        prompt: Le prompt à optimiser
        preset_name: Nom du preset (optionnel)
        
    Returns:
        str: Prompt optimisé pour Kling
    """
    # Kling fonctionne mieux avec des prompts concis mais descriptifs
    # Limite approximative : 2000 caractères
    
    if len(prompt) > 2000:
        # Tronquer intelligemment si trop long
        # Garder le début (plus important) et la fin (qualité)
        prompt = prompt[:1800] + "..." + prompt[-200:]
    
    # Ajouter des mots-clés de qualité si pas déjà présents
    quality_keywords = ["cinematic", "high quality", "detailed", "professional", "photorealistic"]
    has_quality = any(keyword in prompt.lower() for keyword in quality_keywords)
    
    if not has_quality:
        prompt += ", cinematic, high quality, professional"
    
    return prompt
