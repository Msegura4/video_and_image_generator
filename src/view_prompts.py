#!/usr/bin/env python3
"""
Visualise tous les prompts disponibles.
"""

from src.prompt_templates import list_presets, get_preset_info

def main():
    print("\n🎬 BIBLIOTHÈQUE DE PROMPTS\n")
    print("="*70)
    
    presets = list_presets()
    
    print(f"\n📚 {len(presets)} presets disponibles:\n")
    for i, preset in enumerate(presets, 1):
        print(f"{i}. {preset}")
    
    print("\n" + "="*70)
    
    # Demander quel preset voir
    choice = input("\nQuel preset voir en détail ? (numéro ou nom, ou Enter pour tous): ").strip()
    
    if not choice:
        # Afficher tous
        for preset in presets:
            print(get_preset_info(preset))
    elif choice.isdigit() and 1 <= int(choice) <= len(presets):
        # Afficher par numéro
        preset = presets[int(choice) - 1]
        print(get_preset_info(preset))
    elif choice in presets:
        # Afficher par nom
        print(get_preset_info(choice))
    else:
        print("❌ Preset non reconnu")

if __name__ == "__main__":
    main()