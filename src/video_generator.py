"""
Générateur de vidéos avec optimisation basée sur les références visuelles.
"""

import os
import sys
from typing import Optional, List, Dict
from pathlib import Path

# Ajouter le dossier parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.kling_api import KlingAPI
from prompts.prompt_templates import (
    build_prompt,
    get_negative_prompt,
    STYLE_PRESETS,
    optimize_prompt_for_architecture,
    optimize_prompt_for_spaceship
)


class VideoGenerator:
    """
    Générateur de vidéos cinématiques optimisé pour le style hyperréaliste.
    """
    
    def __init__(self, api_key: Optional[str] = None, output_dir: str = "outputs"):
        """
        Initialise le générateur.
        
        Args:
            api_key: Clé API Kling (optionnel si dans .env)
            output_dir: Dossier de sortie pour les vidéos
        """
        self.api = KlingAPI(api_key)
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        print("\n" + "="*60)
        print("🎬 GÉNÉRATEUR DE VIDÉOS CINÉMATIQUES")
        print("Style : Hyperréalisme - Dune/Arrival")
        print("="*60 + "\n")
    
    
    def list_presets(self):
        """Affiche les presets disponibles."""
        print("🎨 PRESETS DISPONIBLES :\n")
        
        for name, preset in STYLE_PRESETS.items():
            print(f"  • {name}")
            print(f"    {preset['base'][:70]}...")
            print()
    
    
    def generate(
        self,
        prompt: Optional[str] = None,
        preset: Optional[str] = None,
        duration: int = 5,
        aspect_ratio: str = "16:9",
        mode: str = "professional",
        use_negative_prompt: bool = True,
        custom_filename: Optional[str] = None
    ) -> str:
        """
        Génère une vidéo.
        
        Args:
            prompt: Prompt custom (si None, utilise preset)
            preset: Nom du preset à utiliser
            duration: Durée (5 ou 10 secondes)
            aspect_ratio: Ratio ("16:9", "9:16", "1:1")
            mode: Mode Kling ("professional" ou "standard")
            use_negative_prompt: Utiliser le negative prompt
            custom_filename: Nom de fichier personnalisé
        
        Returns:
            Chemin du fichier vidéo généré
        """
        # Construire le prompt final
        if preset and not prompt:
            final_prompt = build_prompt(preset, duration=duration)
            print(f"📝 Utilisation du preset : {preset}\n")
        elif prompt and preset:
            # Combiner prompt custom avec style du preset
            preset_data = STYLE_PRESETS[preset]
            final_prompt = f"{prompt}, {preset_data['color']}, {preset_data['camera']}, {preset_data['quality']}"
            print(f"📝 Prompt personnalisé avec style {preset}\n")
        elif prompt:
            final_prompt = prompt
            print(f"📝 Prompt personnalisé\n")
        else:
            raise ValueError("Vous devez fournir soit 'prompt' soit 'preset'")
        
        # Negative prompt
        neg_prompt = get_negative_prompt() if use_negative_prompt else None
        
        print(f"🎬 GÉNÉRATION VIDÉO")
        print(f"   Durée : {duration}s")
        print(f"   Ratio : {aspect_ratio}")
        print(f"   Mode  : {mode}\n")
        print(f"📝 Prompt complet :\n{final_prompt}\n")
        
        # Générer la vidéo
        result = self.api.generate_video(
            prompt=final_prompt,
            negative_prompt=neg_prompt,
            duration=duration,
            aspect_ratio=aspect_ratio,
            mode=mode
        )
        
        task_id = result.get("task_id")
        
        # Attendre la fin
        completed = self.api.wait_for_completion(task_id)
        
        # Nom de fichier
        if custom_filename:
            filename = custom_filename if custom_filename.endswith('.mp4') else f"{custom_filename}.mp4"
        else:
            import time
            timestamp = int(time.time())
            preset_name = preset if preset else "custom"
            filename = f"{preset_name}_{timestamp}.mp4"
        
        output_path = os.path.join(self.output_dir, filename)
        
        # Télécharger (passer les data complètes au lieu de juste l'URL)
        final_path = self.api.download_video(completed, output_path)
        
        # ========== NOUVEAU : SAUVEGARDER VIDEO_ID ==========
        try:
            import json
            import time
            
            # Extraire le video_id depuis la réponse PiAPI
            video_id = None
            
            # Structure PiAPI : data.output.works[0].video.id
            if isinstance(completed, dict):
                output = completed.get("output", {})
                works = output.get("works", [])
                if works and len(works) > 0:
                    video_info = works[0].get("video", {})
                    video_id = video_info.get("id")
            
            if video_id:
                # Créer fichier metadata
                metadata_file = output_path.replace('.mp4', '_metadata.json')
                
                metadata = {
                    "video_id": video_id,
                    "task_id": task_id,
                    "preset": preset if preset else "custom",
                    "prompt": final_prompt[:200],  # Tronquer si trop long
                    "duration": duration,
                    "aspect_ratio": aspect_ratio,
                    "mode": mode,
                    "generated_at": time.time(),
                    "file_path": final_path
                }
                
                with open(metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)
                
                print(f"📋 Metadata : {os.path.basename(metadata_file)}")
                print(f"🆔 Video ID : {video_id}")
                print(f"💡 Utilisez ce Video ID pour extend (Option 12)")
            else:
                print("⚠️  Video ID non trouvé dans la réponse")
        
        except Exception as e:
            print(f"⚠️  Impossible de sauvegarder metadata : {e}")
        # ========== FIN NOUVEAU CODE ==========
        
        print("\n" + "="*60)
        print(f"✅ VIDÉO GÉNÉRÉE AVEC SUCCÈS !")
        print(f"📁 Fichier : {final_path}")
        print("="*60 + "\n")
        
        return final_path
    
    
    def generate_from_description(
        self,
        description: str,
        video_type: str = "architecture",
        duration: int = 5
    ) -> str:
        """
        Génère une vidéo à partir d'une description simple.
        Le système choisit automatiquement le meilleur preset.
        
        Args:
            description: Description simple de la scène
            video_type: Type ("architecture", "spaceship", "human", etc.)
            duration: Durée en secondes
        
        Returns:
            Chemin du fichier vidéo
        """
        # Mapping type -> preset
        type_to_preset = {
            "architecture": "brutalist_architecture",
            "spaceship": "spaceship_arrival",
            "human": "human_contemplative",
            "desert": "dune_epic",
            "minimal": "arrival_minimal",
            "portal": "portal_tunnel"
        }
        
        preset = type_to_preset.get(video_type, "dune_epic")
        
        # Optimiser le prompt selon le type
        if video_type == "architecture":
            optimized = optimize_prompt_for_architecture(description)
        elif video_type == "spaceship":
            optimized = optimize_prompt_for_spaceship(description)
        else:
            optimized = description
        
        return self.generate(
            prompt=optimized,
            preset=preset,
            duration=duration
        )
    
    
    def generate_sequence(
        self,
        scenes: List[Dict],
        sequence_name: str = "sequence"
    ) -> List[str]:
        """
        Génère une séquence de plusieurs vidéos.
        
        Args:
            scenes: Liste de dicts avec 'prompt' ou 'preset' et paramètres
            sequence_name: Nom de la séquence
        
        Returns:
            Liste des chemins de fichiers générés
        """
        print(f"\n🎞️  GÉNÉRATION DE SÉQUENCE : {sequence_name}")
        print(f"   Nombre de scènes : {len(scenes)}\n")
        
        generated_files = []
        
        for i, scene in enumerate(scenes, 1):
            print(f"\n{'='*60}")
            print(f"📹 SCÈNE {i}/{len(scenes)}")
            print(f"{'='*60}\n")
            
            # Nom de fichier pour cette scène
            filename = f"{sequence_name}_scene_{i:02d}.mp4"
            
            # Générer
            video_path = self.generate(
                custom_filename=filename,
                **scene
            )
            
            generated_files.append(video_path)
        
        print(f"\n{'='*60}")
        print(f"✅ SÉQUENCE TERMINÉE : {len(generated_files)} vidéos")
        print(f"{'='*60}\n")
        
        return generated_files
    
    
    def check_credits(self):
        """Affiche les crédits restants."""
        info = self.api.get_account_info()
        return info


# Fonctions helper pour utilisation rapide
def quick_generate(description: str, video_type: str = "architecture") -> str:
    """
    Génération rapide en une ligne.
    
    Example:
        video = quick_generate("Massive pyramid in desert", "architecture")
    """
    gen = VideoGenerator()
    return gen.generate_from_description(description, video_type)


def generate_with_preset(preset_name: str, duration: int = 5) -> str:
    """
    Génère directement avec un preset.
    
    Example:
        video = generate_with_preset("dune_epic", duration=10)
    """
    gen = VideoGenerator()
    return gen.generate(preset=preset_name, duration=duration)


if __name__ == "__main__":
    # Exemple d'utilisation
    print("🧪 TEST DU GÉNÉRATEUR VIDÉO\n")
    
    gen = VideoGenerator()
    
    # Afficher les presets
    gen.list_presets()
    
    # Tester la connexion
    print("\n💳 Vérification des crédits...")
    gen.check_credits()
    
    print("\n✅ Module prêt à l'emploi !")
    print("\nPour générer une vidéo :")
    print("  gen.generate(preset='dune_epic', duration=5)")
