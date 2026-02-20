#!/usr/bin/env python3
"""
Éditeur de presets - Modification directe des prompts.
"""

import sys
from pathlib import Path

# Importer le gestionnaire
import importlib.util
spec = importlib.util.spec_from_file_location("prompt_manager", "prompt_manager.py")
if spec and spec.loader:
    prompt_manager = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prompt_manager)
    PromptVersionManager = prompt_manager.PromptVersionManager
else:
    print("❌ Impossible de charger prompt_manager.py")
    sys.exit(1)


class PresetEditor:
    """Éditeur interactif de presets."""
    
    def __init__(self):
        self.manager = PromptVersionManager()
    
    def list_presets(self):
        """Affiche tous les presets disponibles."""
        PRESETS = self.manager._load_presets()
        
        print("\n" + "="*70)
        print("📋 PRESETS DISPONIBLES")
        print("="*70 + "\n")
        
        presets_list = list(PRESETS.keys())
        
        for i, preset_name in enumerate(presets_list, 1):
            preset = PRESETS[preset_name]
            
            # Récupérer le prompt selon le format
            if "base" in preset:
                prompt_preview = preset["base"][:60]
            else:
                prompt_preview = preset.get("base_prompt", "")[:60]
            
            print(f"   {i}. {preset_name}")
            print(f"      {prompt_preview}...")
            print()
        
        print("="*70)
        
        return presets_list
    
    def show_preset_details(self, preset_name: str):
        """Affiche les détails d'un preset."""
        PRESETS = self.manager._load_presets()
        preset = PRESETS.get(preset_name)
        
        if not preset:
            print(f"❌ Preset '{preset_name}' introuvable")
            return None
        
        print("\n" + "="*70)
        print(f"📝 PRESET : {preset_name.upper()}")
        print("="*70 + "\n")
        
        # Format ancien (prompts/prompt_templates.py)
        if "base" in preset:
            print("1. BASE (Description principale) :")
            print(f"   {preset['base']}\n")
            
            print("2. COLOR (Palette et éclairage) :")
            print(f"   {preset.get('color', 'Non défini')}\n")
            
            print("3. CAMERA (Mouvement caméra) :")
            print(f"   {preset.get('camera', 'Non défini')}\n")
            
            print("4. QUALITY (Qualité et style) :")
            print(f"   {preset.get('quality', 'Non défini')}\n")
        
        # Format nouveau (src/prompt_templates.py)
        else:
            print("1. NAME :")
            print(f"   {preset.get('name', preset_name)}\n")
            
            print("2. DESCRIPTION :")
            print(f"   {preset.get('description', 'Non défini')}\n")
            
            print("3. BASE_PROMPT :")
            print(f"   {preset.get('base_prompt', 'Non défini')}\n")
            
            print("4. NEGATIVE_PROMPT :")
            print(f"   {preset.get('negative_prompt', 'Non défini')}\n")
        
        print("="*70)
        
        return preset
    
    def edit_preset_field(self, preset_name: str, field_name: str, new_value: str):
        """Modifie un champ d'un preset."""
        
        PRESETS = self.manager._load_presets()
        preset = PRESETS.get(preset_name)
        
        if not preset:
            print(f"❌ Preset '{preset_name}' introuvable")
            return False
        
        # Créer un backup avant modification
        self.manager.create_backup(preset_name, reason="manual_edit")
        
        # Modifier le champ
        preset[field_name] = new_value
        
        # Sauvegarder
        self.manager._update_prompt_in_file(preset_name, preset)
        
        print(f"✅ Champ '{field_name}' modifié avec succès")
        return True
    
    def interactive_edit(self, preset_name: str):
        """Mode interactif d'édition."""
        
        # Afficher les détails
        preset = self.show_preset_details(preset_name)
        
        if not preset:
            return
        
        # Déterminer les champs disponibles
        if "base" in preset:
            fields = {
                "1": ("base", "BASE"),
                "2": ("color", "COLOR"),
                "3": ("camera", "CAMERA"),
                "4": ("quality", "QUALITY")
            }
        else:
            fields = {
                "1": ("name", "NAME"),
                "2": ("description", "DESCRIPTION"),
                "3": ("base_prompt", "BASE_PROMPT"),
                "4": ("negative_prompt", "NEGATIVE_PROMPT")
            }
        
        print("\n" + "="*70)
        print("🔧 MODIFICATION")
        print("="*70 + "\n")
        
        print("Quel champ voulez-vous modifier ?\n")
        for key, (field_key, field_label) in fields.items():
            print(f"   {key}. {field_label}")
        
        print("\n   0. Annuler")
        
        choice = input("\nChoix : ").strip()
        
        if choice == "0":
            print("\n❌ Annulé")
            return
        
        if choice not in fields:
            print("\n❌ Choix invalide")
            return
        
        field_key, field_label = fields[choice]
        
        # Afficher la valeur actuelle
        current_value = preset.get(field_key, "")
        
        print(f"\n📝 Modification de {field_label}")
        print("-"*70)
        print(f"\nValeur actuelle :")
        print(f"   {current_value}\n")
        print("-"*70)
        
        print("\n💡 Entrez la nouvelle valeur (ou 'cancel' pour annuler) :\n")
        
        new_value = input("> ").strip()
        
        if new_value.lower() == 'cancel':
            print("\n❌ Annulé")
            return
        
        if not new_value:
            print("\n❌ Valeur vide, annulé")
            return
        
        # Confirmation
        print("\n" + "="*70)
        print("⚠️  CONFIRMATION")
        print("="*70)
        
        print(f"\nPreset : {preset_name}")
        print(f"Champ  : {field_label}")
        print(f"\nAncienne valeur :")
        print(f"   {current_value[:100]}{'...' if len(current_value) > 100 else ''}")
        print(f"\nNouvelle valeur :")
        print(f"   {new_value[:100]}{'...' if len(new_value) > 100 else ''}")
        
        confirm = input("\n❓ Confirmer la modification ? (oui/non) : ").strip().lower()
        
        if confirm not in ['oui', 'o', 'yes', 'y']:
            print("\n❌ Annulé")
            return
        
        # Appliquer la modification
        success = self.edit_preset_field(preset_name, field_key, new_value)
        
        if success:
            print("\n" + "="*70)
            print("✅ MODIFICATION RÉUSSIE")
            print("="*70)
            print(f"\n💡 Un backup a été créé automatiquement")
            print(f"   Vous pouvez revenir en arrière avec :")
            print(f"   python3 restore_prompt.py {preset_name}")
    
    def choose_and_edit(self):
        """Workflow complet : choisir puis éditer."""
        
        # Lister les presets
        presets_list = self.list_presets()
        
        if not presets_list:
            print("❌ Aucun preset disponible")
            return
        
        # Demander le choix
        choice = input("\n❓ Choisir un preset (numéro ou nom) : ").strip()
        
        if choice.isdigit():
            idx = int(choice) - 1
            if 0 <= idx < len(presets_list):
                preset_name = presets_list[idx]
            else:
                print("❌ Numéro invalide")
                return
        elif choice in presets_list:
            preset_name = choice
        else:
            print("❌ Preset non reconnu")
            return
        
        # Éditer
        self.interactive_edit(preset_name)


def main():
    """Point d'entrée."""
    
    editor = PresetEditor()
    
    if len(sys.argv) > 1:
        # Mode ligne de commande avec nom de preset
        preset_name = sys.argv[1]
        editor.interactive_edit(preset_name)
    else:
        # Mode interactif complet
        editor.choose_and_edit()


if __name__ == "__main__":
    main()
