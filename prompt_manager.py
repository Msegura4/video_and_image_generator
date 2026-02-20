#!/usr/bin/env python3
"""
Gestionnaire de versions pour les prompts.
Permet de sauvegarder, restaurer et comparer les versions.
VERSION CORRIGÉE - Préserve les fonctions dans prompt_templates.py
"""

import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional


class PromptVersionManager:
    """Gère les versions des prompts avec historique."""
    
    def __init__(self):
        # Chercher le fichier de templates (prompts/ prioritaire, puis src/)
        if Path("prompts/prompt_templates.py").exists():
            self.templates_file = Path("prompts/prompt_templates.py")
            self.dict_name = "STYLE_PRESETS"
            print("📂 Utilisation de: prompts/prompt_templates.py")
        elif Path("src/prompt_templates.py").exists():
            self.templates_file = Path("src/prompt_templates.py")
            self.dict_name = "PRESET_PROMPTS"
            print("📂 Utilisation de: src/prompt_templates.py")
        else:
            raise FileNotFoundError("❌ Aucun fichier prompt_templates.py trouvé dans prompts/ ou src/")
        
        self.backup_dir = Path("prompts/backups")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.history_file = self.backup_dir / "history.json"
        
        # Charger l'historique
        self.history = self._load_history()
    
    def _load_history(self) -> Dict:
        """Charge l'historique des versions."""
        if self.history_file.exists():
            with open(self.history_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def _save_history(self):
        """Sauvegarde l'historique."""
        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump(self.history, f, indent=2, ensure_ascii=False)
    
    def _load_presets(self):
        """Charge les presets depuis le fichier."""
        # Import dynamique selon le fichier trouvé
        if "prompts" in str(self.templates_file):
            from prompts.prompt_templates import STYLE_PRESETS
            return STYLE_PRESETS
        else:
            from src.prompt_templates import PRESET_PROMPTS
            return PRESET_PROMPTS
    
    def create_backup(self, preset_name: str, reason: str = "manual_backup") -> str:
        """
        Crée un backup du prompt actuel.
        
        Returns:
            backup_id: Identifiant unique du backup
        """
        # Lire le prompt actuel
        PRESETS = self._load_presets()
        current_prompt = PRESETS.get(preset_name)
        
        if not current_prompt:
            raise ValueError(f"Preset '{preset_name}' introuvable")
        
        # Générer ID unique
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_id = f"{preset_name}_{timestamp}"
        
        # Sauvegarder
        backup_file = self.backup_dir / f"{backup_id}.json"
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump({
                "preset_name": preset_name,
                "timestamp": timestamp,
                "reason": reason,
                "prompt": current_prompt
            }, f, indent=2, ensure_ascii=False)
        
        # Ajouter à l'historique
        if preset_name not in self.history:
            self.history[preset_name] = []
        
        self.history[preset_name].append({
            "backup_id": backup_id,
            "timestamp": timestamp,
            "reason": reason,
            "file": str(backup_file)
        })
        
        self._save_history()
        
        print(f"✅ Backup créé: {backup_id}")
        return backup_id
    
    def get_versions(self, preset_name: str) -> List[Dict]:
        """Récupère toutes les versions d'un preset."""
        return self.history.get(preset_name, [])
    
    def get_version(self, backup_id: str) -> Optional[Dict]:
        """Récupère une version spécifique."""
        backup_file = self.backup_dir / f"{backup_id}.json"
        
        if not backup_file.exists():
            return None
        
        with open(backup_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def compare_versions(self, preset_name: str, backup_id: Optional[str] = None) -> Dict:
        """Compare la version actuelle avec une ancienne version."""
        PRESETS = self._load_presets()
        current = PRESETS.get(preset_name)
        
        if backup_id:
            previous = self.get_version(backup_id)
        else:
            # Prendre la dernière version
            versions = self.get_versions(preset_name)
            if not versions:
                return {"current": current, "previous": None}
            
            backup_id = versions[-1]["backup_id"]
            previous = self.get_version(backup_id)
        
        return {
            "current": current,
            "previous": previous["prompt"] if previous else None,
            "backup_id": backup_id
        }
    
    def restore_version(self, backup_id: str) -> bool:
        """Restaure une version précédente."""
        backup = self.get_version(backup_id)
        
        if not backup:
            print(f"❌ Version {backup_id} introuvable")
            return False
        
        preset_name = backup["preset_name"]
        
        # Créer un backup de la version actuelle avant de restaurer
        self.create_backup(preset_name, reason="before_restore")
        
        # Modifier prompt_templates.py
        self._update_prompt_in_file(preset_name, backup["prompt"])
        
        print(f"✅ Version restaurée: {backup_id}")
        return True
    
    def _update_prompt_in_file(self, preset_name: str, new_prompt_data: Dict):
        """Met à jour le prompt dans prompt_templates.py."""
        
        # Import pour obtenir la structure
        PRESETS = self._load_presets()
        
        # Mettre à jour en mémoire
        PRESETS[preset_name] = new_prompt_data
        
        # Reconstruire le fichier en préservant les fonctions
        new_content = self._rebuild_file_content(PRESETS)
        
        # Écrire
        with open(self.templates_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
    
    def _rebuild_file_content(self, presets: Dict) -> str:
        """
        Reconstruit le contenu du fichier prompt_templates.py.
        VERSION CORRIGÉE : Préserve les fonctions existantes.
        """
        
        # Lire le fichier actuel
        with open(self.templates_file, 'r', encoding='utf-8') as f:
            current_content = f.read()
        
        # Extraire la partie avant STYLE_PRESETS (docstring, imports, etc.)
        header = ""
        if '"""' in current_content:
            # Garder le docstring
            parts = current_content.split('"""', 2)
            if len(parts) >= 3:
                header = '"""' + parts[1] + '"""' + "\n\n"
        
        # Construire le nouveau dictionnaire STYLE_PRESETS
        dict_lines = [f'{self.dict_name} = {{']
        
        for i, (preset_name, preset_data) in enumerate(presets.items()):
            dict_lines.append(f'    "{preset_name}": {{')
            
            # Gérer les deux formats
            if "base" in preset_data:
                # Format ancien (prompts/prompt_templates.py)
                base = preset_data["base"].replace('"', '\\"')
                color = preset_data.get("color", "").replace('"', '\\"')
                camera = preset_data.get("camera", "").replace('"', '\\"')
                quality = preset_data.get("quality", "").replace('"', '\\"')
                
                dict_lines.append(f'        "base": "{base}",')
                dict_lines.append(f'        "color": "{color}",')
                dict_lines.append(f'        "camera": "{camera}",')
                dict_lines.append(f'        "quality": "{quality}"')
            else:
                # Format nouveau (src/prompt_templates.py)
                name = preset_data.get("name", preset_name).replace('"', '\\"')
                description = preset_data.get("description", "").replace('"', '\\"')
                base_prompt = preset_data.get("base_prompt", "").replace('"', '\\"')
                negative_prompt = preset_data.get("negative_prompt", "").replace('"', '\\"')
                
                dict_lines.append(f'        "name": "{name}",')
                dict_lines.append(f'        "description": "{description}",')
                dict_lines.append(f'        "base_prompt": "{base_prompt}",')
                dict_lines.append(f'        "negative_prompt": "{negative_prompt}",')
                
                # Style keywords
                keywords = preset_data.get("style_keywords", [])
                dict_lines.append(f'        "style_keywords": [')
                for keyword in keywords:
                    keyword_escaped = keyword.replace('"', '\\"')
                    dict_lines.append(f'            "{keyword_escaped}",')
                dict_lines.append(f'        ],')
                
                # Recommended settings
                settings = preset_data.get("recommended_settings", {})
                dict_lines.append(f'        "recommended_settings": {{')
                dict_lines.append(f'            "aspect_ratio": "{settings.get("aspect_ratio", "16:9")}",')
                dict_lines.append(f'            "duration": {settings.get("duration", 5)},')
                dict_lines.append(f'            "mode": "{settings.get("mode", "standard")}"')
                dict_lines.append(f'        }}')
            
            if i < len(presets) - 1:
                dict_lines.append('    },')
            else:
                dict_lines.append('    }')
        
        dict_lines.append('}')
        dict_content = '\n'.join(dict_lines)
        
        # Extraire les fonctions après STYLE_PRESETS
        functions = ""
        
        # Chercher la première fonction (def)
        if '\ndef ' in current_content:
            # Trouver où commence la première fonction
            func_start = current_content.find('\ndef ')
            if func_start > 0:
                # Prendre tout depuis la première fonction
                functions = current_content[func_start:]
        
        # Construire le fichier complet
        new_content = header + dict_content + functions
        
        return new_content
    
    def apply_suggestions(self, preset_name: str, analysis_data: Dict) -> bool:
        """Applique les suggestions d'analyse à un preset."""
        
        PRESETS = self._load_presets()
        
        if preset_name not in PRESETS:
            print(f"❌ Preset '{preset_name}' introuvable")
            return False
        
        # Créer backup avant modification
        self.create_backup(preset_name, reason="before_enrichment")
        
        # Construire le nouveau prompt
        current_prompt = PRESETS[preset_name]
        
        # Déterminer le format
        if "base" in current_prompt:
            base_prompt = current_prompt["base"]
        else:
            base_prompt = current_prompt.get("base_prompt", "")
        
        # Ajouter les suggestions
        enhancements = []
        
        if analysis_data.get('style_keywords'):
            enhancements.extend(analysis_data['style_keywords'])
        
        suggestions = analysis_data.get('suggestions', {})
        for category, items in suggestions.items():
            enhancements.extend(items[:2])  # Top 2 de chaque catégorie
        
        if enhancements:
            new_base_prompt = base_prompt + ", " + ", ".join(enhancements)
        else:
            new_base_prompt = base_prompt
        
        # Mettre à jour
        new_prompt_data = current_prompt.copy()
        if "base" in new_prompt_data:
            new_prompt_data["base"] = new_base_prompt
        else:
            new_prompt_data["base_prompt"] = new_base_prompt
        
        self._update_prompt_in_file(preset_name, new_prompt_data)
        
        print(f"✅ Prompt enrichi pour '{preset_name}'")
        return True


def main():
    """Test du gestionnaire."""
    manager = PromptVersionManager()
    
    print("🔧 GESTIONNAIRE DE VERSIONS DE PROMPTS")
    print("="*70)
    
    # Lister les presets avec historique
    PRESETS = manager._load_presets()
    
    for preset in PRESETS.keys():
        versions = manager.get_versions(preset)
        print(f"\n📦 {preset}: {len(versions)} version(s)")


if __name__ == "__main__":
    main()
