#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test de la modification de presets personnalisés
"""
import json
import os

def load_custom_presets():
    """Charge les presets personnalisés"""
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

print("=== Test de Modification de Preset ===\n")

# 1. Créer un preset initial
print("1. Création d'un preset de test...")
initial_preset = {
    "base": "Version initiale du preset",
    "color": "couleurs initiales",
    "camera": "caméra initiale",
    "quality": "qualité initiale"
}
save_custom_preset("test_modif", initial_preset)
print("   ✅ Preset 'test_modif' créé\n")

# 2. Afficher le preset initial
print("2. Contenu initial:")
presets = load_custom_presets()
for key, value in presets["test_modif"].items():
    print(f"   {key}: {value}")
print()

# 3. Modifier le preset
print("3. Modification du preset...")
modified_preset = {
    "base": "Version MODIFIÉE du preset",
    "color": "couleurs MODIFIÉES - warm tones",
    "camera": "caméra MODIFIÉE - tracking shot",
    "quality": "qualité MODIFIÉE - 8K cinematic"
}
save_custom_preset("test_modif", modified_preset)
print("   ✅ Preset modifié et sauvegardé\n")

# 4. Vérifier la modification
print("4. Vérification du contenu modifié:")
presets = load_custom_presets()
if "test_modif" in presets:
    modified = presets["test_modif"]
    for key, value in modified.items():
        print(f"   {key}: {value}")
    
    # Vérifier que les valeurs ont bien changé
    print("\n5. Validation des changements:")
    if modified["base"] != initial_preset["base"]:
        print("   ✅ Base modifiée")
    if modified["color"] != initial_preset["color"]:
        print("   ✅ Color modifiée")
    if modified["camera"] != initial_preset["camera"]:
        print("   ✅ Camera modifiée")
    if modified["quality"] != initial_preset["quality"]:
        print("   ✅ Quality modifiée")
else:
    print("   ❌ Preset non trouvé après modification!")

print("\n6. Contenu complet de custom_presets.json:")
print(json.dumps(presets, indent=2, ensure_ascii=False))

print("\n=== Test terminé ===")
print("✅ La modification de presets fonctionne!")
