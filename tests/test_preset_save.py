#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test de la fonctionnalité de sauvegarde de presets personnalisés
"""
import json
import os

# Définir les fonctions comme dans streamlit_app.py
def load_custom_presets():
    """Charge les presets personnalisés depuis custom_presets.json"""
    filepath = 'custom_presets.json'
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_custom_preset(preset_id, preset_data):
    """Sauvegarde un preset personnalisé"""
    filepath = 'custom_presets.json'
    presets = load_custom_presets()
    presets[preset_id] = preset_data
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(presets, f, indent=4, ensure_ascii=False)
    return True

# Test
print("=== Test de Sauvegarde de Preset ===\n")

# Créer un preset de test
test_preset = {
    "base": "Desert landscape with dramatic lighting, monumental structures in background",
    "color": "warm orange and burgundy tones, golden hour lighting",
    "camera": "slow forward tracking shot, 35mm anamorphic lens",
    "quality": "8K, cinematic, film grain"
}

print("1. Création d'un preset de test...")
result = save_custom_preset("test_desert_minimal", test_preset)
print(f"   Résultat: {'✅ Succès' if result else '❌ Échec'}\n")

print("2. Chargement des presets personnalisés...")
custom_presets = load_custom_presets()
print(f"   Nombre de presets: {len(custom_presets)}")
print(f"   IDs: {list(custom_presets.keys())}\n")

print("3. Vérification du preset créé...")
if "test_desert_minimal" in custom_presets:
    print("   ✅ Preset trouvé!")
    print(f"\n   Contenu:")
    for key, value in custom_presets["test_desert_minimal"].items():
        print(f"   - {key}: {value[:50]}..." if len(value) > 50 else f"   - {key}: {value}")
else:
    print("   ❌ Preset non trouvé!")

print("\n4. Fichier custom_presets.json créé:")
if os.path.exists('custom_presets.json'):
    file_size = os.path.getsize('custom_presets.json')
    print(f"   ✅ Fichier présent ({file_size} octets)")
    print("\n   Contenu du fichier:")
    with open('custom_presets.json', 'r', encoding='utf-8') as f:
        content = json.load(f)
        print(json.dumps(content, indent=2, ensure_ascii=False))
else:
    print("   ❌ Fichier non créé!")

print("\n=== Test terminé ===")
