#!/usr/bin/env python3
"""
Créer un nouveau preset personnalisé de façon interactive.
"""

import sys
from pathlib import Path

def create_preset_interactive():
    """Mode interactif pour créer un preset."""
    
    print("\n" + "="*70)
    print("🎨 CRÉER UN NOUVEAU PRESET")
    print("="*70)
    
    print("\n💡 Vous allez créer un preset réutilisable basé sur votre prompt.")
    
    # Nom du preset
    print("\n" + "="*70)
    preset_id = input("\n1️⃣  ID du preset (ex: mon_style, cyber_city, etc.) : ").strip()
    
    if not preset_id:
        print("❌ ID vide, annulation")
        return
    
    # Vérifier que l'ID n'existe pas déjà
    template_file = None
    PRESET_PROMPTS = None
    
    # Chercher d'abord dans prompts/ (prioritaire)
    if Path("prompts/prompt_templates.py").exists():
        try:
            from prompts.prompt_templates import STYLE_PRESETS as PRESET_PROMPTS
            template_file = Path("prompts/prompt_templates.py")
            print("📂 Utilisation de: prompts/prompt_templates.py")
        except ImportError:
            pass
    
    # Si pas trouvé, chercher dans src/
    if PRESET_PROMPTS is None:
        try:
            from src.prompt_templates import PRESET_PROMPTS
            template_file = Path("src/prompt_templates.py")
            print("📂 Utilisation de: src/prompt_templates.py")
        except ImportError:
            print("❌ Impossible de trouver prompt_templates.py")
            return
    
    if preset_id in PRESET_PROMPTS:
        print(f"⚠️  Le preset '{preset_id}' existe déjà !")
        overwrite = input("   Écraser ? (o/N) : ").strip().lower()
        if overwrite != 'o':
            print("❌ Annulé")
            return
    
    # Nom lisible
    name = input("\n2️⃣  Nom du preset (ex: Mon Style Cyberpunk) : ").strip()
    if not name:
        name = preset_id.replace('_', ' ').title()
    
    # Description
    description = input("\n3️⃣  Description courte : ").strip()
    if not description:
        description = f"Style personnalisé {name}"
    
    # Prompt principal
    print("\n" + "="*70)
    print("4️⃣  PROMPT PRINCIPAL")
    print("="*70)
    print("\n💡 Conseil : Incluez :")
    print("   • Sujet principal")
    print("   • Style visuel")
    print("   • Éclairage")
    print("   • Ambiance")
    print("   • Qualité (cinematic, photorealistic, 8K, etc.)\n")
    
    base_prompt = input("Votre prompt : ").strip()
    
    if not base_prompt:
        print("❌ Prompt vide, annulation")
        return
    
    # Negative prompt
    print("\n5️⃣  NEGATIVE PROMPT (optionnel)")
    print("    Ce que vous NE voulez PAS voir\n")
    negative_prompt = input("Negative prompt [people, text, low quality] : ").strip()
    
    if not negative_prompt:
        negative_prompt = "people, text, UI, low quality, blurry, distorted"
    
    # Style keywords
    print("\n6️⃣  MOTS-CLÉS DE STYLE (séparés par des virgules)")
    print("    Ex: cinematic, epic, moody, atmospheric\n")
    keywords_input = input("Mots-clés : ").strip()
    
    if keywords_input:
        style_keywords = [k.strip() for k in keywords_input.split(',')]
    else:
        style_keywords = ["cinematic", "photorealistic"]
    
    # Paramètres recommandés
    print("\n7️⃣  PARAMÈTRES RECOMMANDÉS")
    
    print("\n   Ratio d'aspect :")
    print("     1. 16:9 (paysage)")
    print("     2. 9:16 (portrait)")
    print("     3. 1:1 (carré)")
    print("     4. 21:9 (ultra-wide)")
    
    ratio_choice = input("\n   Choix [1] : ").strip()
    ratios = {"1": "16:9", "2": "9:16", "3": "1:1", "4": "21:9"}
    aspect_ratio = ratios.get(ratio_choice, "16:9")
    
    duration = input("\n   Durée recommandée (5 ou 10) [5] : ").strip()
    duration = int(duration) if duration and duration.isdigit() else 5
    
    print("\n   Mode :")
    print("     1. standard (moins cher)")
    print("     2. professional (meilleure qualité)")
    
    mode_choice = input("\n   Choix [2] : ").strip()
    mode = "professional" if mode_choice != "1" else "standard"
    
    # Résumé
    print("\n" + "="*70)
    print("📋 RÉSUMÉ DU PRESET")
    print("="*70)
    
    print(f"\nID : {preset_id}")
    print(f"Nom : {name}")
    print(f"Description : {description}")
    print(f"\nPrompt :")
    print(f"  {base_prompt}")
    print(f"\nNegative :")
    print(f"  {negative_prompt}")
    print(f"\nMots-clés : {', '.join(style_keywords)}")
    print(f"Ratio : {aspect_ratio}")
    print(f"Durée : {duration}s")
    print(f"Mode : {mode}")
    
    print("\n" + "="*70)
    
    confirm = input("\n✅ Créer ce preset ? (O/n) : ").strip().lower()
    
    if confirm == 'n':
        print("❌ Annulé")
        return
    
    # Créer le preset
    preset_data = {
        "name": name,
        "description": description,
        "base_prompt": base_prompt,
        "negative_prompt": negative_prompt,
        "style_keywords": style_keywords,
        "recommended_settings": {
            "aspect_ratio": aspect_ratio,
            "duration": duration,
            "mode": mode
        }
    }
    
    # Ajouter au fichier
    success = add_preset_to_file(preset_id, preset_data, template_file)
    
    if success:
        print(f"\n✅ Preset '{preset_id}' créé avec succès !")
        print(f"\n💡 Utilisation :")
        print(f"   python3 main.py → Option 1 → Choisir '{preset_id}'")
        print(f"\n📁 Vous pouvez aussi créer un dossier d'inspirations:")
        print(f"   mkdir -p inspirations/{preset_id}")
        print(f"   # Ajoutez des images dedans")
        print(f"   python3 analyze_inspirations.py {preset_id}")


def add_preset_to_file(preset_id: str, preset_data: dict, template_file: Path) -> bool:
    """Ajoute un preset au fichier prompt_templates.py."""
    
    if not template_file.exists():
        print(f"❌ Fichier introuvable : {template_file}")
        return False
    
    # Lire le fichier
    with open(template_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Construire le nouveau preset
    preset_code = f'''
    "{preset_id}": {{
        "name": "{preset_data['name']}",
        "description": "{preset_data['description']}",
        "base_prompt": "{preset_data['base_prompt']}",
        "negative_prompt": "{preset_data['negative_prompt']}",
        "style_keywords": [
'''
    
    for keyword in preset_data['style_keywords']:
        preset_code += f'            "{keyword}",\n'
    
    settings = preset_data['recommended_settings']
    preset_code += f'''        ],
        "recommended_settings": {{
            "aspect_ratio": "{settings['aspect_ratio']}",
            "duration": {settings['duration']},
            "mode": "{settings['mode']}"
        }}
    }},
'''
    
    # Trouver où insérer (avant custom ou à la fin)
    if '"custom":' in content:
        # Insérer juste avant custom
        insert_pos = content.find('"custom":')
        new_content = content[:insert_pos] + preset_code + "\n    " + content[insert_pos:]
    else:
        # Chercher la fin du dictionnaire PRESET_PROMPTS ou STYLE_PRESETS
        # Trouver le dernier } avant def
        lines = content.split('\n')
        insert_line = None
        
        for i in range(len(lines) - 1, 0, -1):
            if lines[i].strip().startswith('}') and 'PRESET_PROMPTS' not in lines[i] and 'STYLE_PRESETS' not in lines[i]:
                # Vérifier si c'est la fin d'un preset (il y a une virgule avant)
                if i > 0 and '}' in lines[i-1]:
                    insert_line = i
                    break
        
        if insert_line:
            # Insérer avant cette ligne
            lines.insert(insert_line, preset_code.rstrip('\n'))
            new_content = '\n'.join(lines)
        else:
            print("⚠️  Position d'insertion introuvable, ajout à la fin")
            new_content = content.rstrip() + "\n" + preset_code + "\n"
    
    # Écrire
    try:
        with open(template_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"\n💾 Preset ajouté à {template_file}")
        return True
    except Exception as e:
        print(f"\n❌ Erreur lors de l'écriture : {e}")
        return False


def main():
    """Point d'entrée."""
    try:
        create_preset_interactive()
    except KeyboardInterrupt:
        print("\n\n⚠️  Création annulée")
    except Exception as e:
        print(f"\n❌ Erreur : {e}")


if __name__ == "__main__":
    main()
