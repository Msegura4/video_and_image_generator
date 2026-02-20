#!/usr/bin/env python3
"""
Génération de vidéos depuis des images statiques (Image-to-Video).
Permet d'uploader une image locale et de générer une vidéo avec prompt personnalisable.
"""

import os
import sys
from pathlib import Path
from typing import Optional, Dict
import time
import json

# Ajouter au path
sys.path.insert(0, str(Path(__file__).parent))

from src.kling_api import KlingAPI
from video_utils import VideoUtils


class ImageToVideoGenerator:
    """Génère des vidéos depuis des images statiques."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le générateur image-to-video.
        
        Args:
            api_key: Clé API PiAPI (optionnel si dans .env)
        """
        self.api = KlingAPI(api_key)
        self.utils = VideoUtils()
        self.outputs_dir = Path("outputs")
        self.outputs_dir.mkdir(parents=True, exist_ok=True)
        
        print("\n" + "="*70)
        print("🖼️ GÉNÉRATION VIDÉO DEPUIS IMAGE STATIQUE")
        print("="*70)
        print("\n💡 Transformez n'importe quelle image en vidéo cinématique")
        print("   • Upload depuis votre ordinateur")
        print("   • Prompt personnalisable")
        print("   • Contrôle total des paramètres Kling")
        print()
    
    def list_available_images(self, directory: str = None) -> list:
        """
        Liste les images disponibles dans un dossier.
        
        Args:
            directory: Chemin du dossier (par défaut: outputs/images/)
        
        Returns:
            Liste des chemins d'images
        """
        if directory:
            search_dir = Path(directory)
        else:
            search_dir = Path("outputs/images")
        
        if not search_dir.exists():
            return []
        
        # Extensions d'images supportées
        extensions = ['.png', '.jpg', '.jpeg', '.webp']
        
        images = []
        for ext in extensions:
            images.extend(list(search_dir.glob(f"*{ext}")))
            images.extend(list(search_dir.glob(f"*{ext.upper()}")))
        
        return sorted(images)
    
    def generate_video_from_image(
        self,
        image_path: str,
        prompt: str,
        duration: int = 5,
        aspect_ratio: str = "16:9",
        mode: str = "professional",
        model_version: str = "2.5",
        negative_prompt: Optional[str] = None,
        custom_filename: Optional[str] = None
    ) -> str:
        """
        Génère une vidéo depuis une image statique.
        
        Args:
            image_path: Chemin de l'image locale
            prompt: Description du mouvement/animation souhaité
            duration: Durée de la vidéo (5 ou 10 secondes)
            aspect_ratio: Ratio d'aspect ("16:9", "9:16", "1:1")
            mode: Mode de génération ("professional" ou "standard")
            model_version: Version Kling ("1.6", "2.1", "2.5")
            negative_prompt: Éléments à éviter (optionnel)
            custom_filename: Nom de fichier personnalisé (optionnel)
        
        Returns:
            Chemin de la vidéo générée
        """
        image_path = Path(image_path)
        
        if not image_path.exists():
            raise FileNotFoundError(f"❌ Image introuvable : {image_path}")
        
        # Vérifier que c'est bien une image
        valid_extensions = ['.png', '.jpg', '.jpeg', '.webp']
        if image_path.suffix.lower() not in valid_extensions:
            raise ValueError(f"❌ Format non supporté : {image_path.suffix}")
        
        print(f"🖼️ Image source : {image_path.name}")
        print(f"📏 Format : {image_path.suffix.upper()}")
        
        # Obtenir info sur l'image
        try:
            from PIL import Image
            img = Image.open(image_path)
            print(f"🎨 Dimensions : {img.size[0]}x{img.size[1]}")
            print(f"📊 Taille : {image_path.stat().st_size / (1024*1024):.2f} MB")
        except Exception as e:
            print(f"⚠️ Impossible de lire les infos image : {e}")
        
        # Étape 1 : Upload de l'image
        print("\n" + "="*70)
        print("📤 ÉTAPE 1/3 : UPLOAD IMAGE")
        print("="*70)
        
        image_url = self.utils.upload_image_with_fallback(str(image_path))
        
        # Étape 2 : Génération vidéo
        print("\n" + "="*70)
        print("🎬 ÉTAPE 2/3 : GÉNÉRATION VIDÉO")
        print("="*70)
        
        print(f"\n📝 Prompt : {prompt}")
        print(f"⚙️ Modèle : Kling {model_version} ({mode} mode)")
        print(f"⏱️ Durée : {duration}s")
        print(f"📐 Ratio : {aspect_ratio}")
        
        # Calculer le coût
        if model_version == "2.5":
            cost = 0.33 if duration == 5 else 0.66
        elif mode == "professional":
            cost = 0.46 if duration == 5 else 0.92
        else:
            cost = 0.26 if duration == 5 else 0.52
        
        print(f"💰 Coût estimé : ${cost:.2f}")
        
        try:
            result = self.api.generate_video(
                prompt=prompt,
                image_url=image_url,
                duration=duration,
                aspect_ratio=aspect_ratio,
                mode=mode,
                model_version=model_version,
                negative_prompt=negative_prompt
            )
            
            task_id = result.get("task_id")
            
            # Attendre la génération
            print("\n⏳ Génération en cours...")
            completed = self.api.wait_for_completion(task_id)
            
        except Exception as e:
            print("\n" + "="*70)
            print("❌ ERREUR GÉNÉRATION PIAPI")
            print("="*70)
            print(f"\n🔴 Erreur : {e}")
            print("\n💡 Causes possibles :")
            print("   1. URL image invalide ou inaccessible")
            print("   2. Format image non supporté")
            print("   3. Dimensions image incorrectes")
            print("   4. Prompt filtré par modération PiAPI")
            print("   5. Crédits PiAPI insuffisants")
            print("   6. Problème temporaire serveur PiAPI")
            print("\n🔍 Détails de cette tentative :")
            print(f"   • URL image : {image_url}")
            print(f"   • Prompt : {prompt}")
            print(f"   • Durée : {duration}s")
            print(f"   • Mode : {mode}")
            raise
        
        # Étape 3 : Téléchargement
        print("\n" + "="*70)
        print("💾 ÉTAPE 3/3 : TÉLÉCHARGEMENT")
        print("="*70)
        
        # Nom de fichier
        if custom_filename:
            filename = custom_filename if custom_filename.endswith('.mp4') else f"{custom_filename}.mp4"
        else:
            timestamp = int(time.time())
            base_name = image_path.stem
            filename = f"i2v_{base_name}_{timestamp}.mp4"
        
        output_path = self.outputs_dir / filename
        
        final_path = self.api.download_video(completed, str(output_path))
        
        # Sauvegarder metadata
        self._save_metadata(
            output_path,
            image_path,
            prompt,
            duration,
            aspect_ratio,
            mode,
            model_version
        )
        
        # Résumé final
        print("\n" + "="*70)
        print("✅ VIDÉO GÉNÉRÉE AVEC SUCCÈS !")
        print("="*70)
        
        final_duration = self.utils.get_video_duration(final_path)
        file_size = Path(final_path).stat().st_size / (1024 * 1024)
        
        print(f"\n📊 Résumé :")
        print(f"   Image source : {image_path.name}")
        print(f"   Vidéo générée : {filename}")
        print(f"   Durée : {final_duration:.1f}s")
        print(f"   Taille : {file_size:.2f} MB")
        print(f"   Coût : ${cost:.2f}")
        print(f"\n📁 Fichier : {final_path}")
        print()
        
        return final_path
    
    def _save_metadata(
        self,
        output_path: Path,
        source_image: Path,
        prompt: str,
        duration: int,
        aspect_ratio: str,
        mode: str,
        model_version: str
    ):
        """Sauvegarde les metadata de la génération."""
        metadata = {
            "type": "image_to_video",
            "source_image": str(source_image),
            "prompt": prompt,
            "duration": duration,
            "aspect_ratio": aspect_ratio,
            "mode": mode,
            "model_version": model_version,
            "generated_at": time.time(),
            "output_path": str(output_path)
        }
        
        metadata_file = str(output_path).replace('.mp4', '_metadata.json')
        
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    def interactive_generate(self):
        """Mode interactif pour générer une vidéo depuis une image."""
        
        print("\n" + "="*70)
        print("🎨 SÉLECTION DE L'IMAGE SOURCE")
        print("="*70)
        
        # Option 1 : Lister les images disponibles
        available_images = self.list_available_images()
        
        if available_images:
            print(f"\n📂 Images disponibles dans outputs/images/ ({len(available_images)}) :\n")
            
            for i, img in enumerate(available_images, 1):
                size = img.stat().st_size / 1024
                print(f"   {i}. {img.name} ({size:.1f} KB)")
            
            print(f"\n   {len(available_images) + 1}. Spécifier un autre chemin")
            print("   0. Annuler")
            
            choice = input("\n❓ Choix : ").strip()
            
            if choice == "0":
                print("\n❌ Annulé")
                return
            
            elif choice.isdigit() and 1 <= int(choice) <= len(available_images):
                image_path = available_images[int(choice) - 1]
            
            elif choice == str(len(available_images) + 1):
                custom_path = input("\n📁 Chemin de l'image : ").strip()
                image_path = Path(custom_path)
                
                if not image_path.exists():
                    print(f"\n❌ Image introuvable : {image_path}")
                    return
            
            else:
                print("\n❌ Choix invalide")
                return
        
        else:
            # Pas d'images disponibles, demander le chemin
            print("\nℹ️ Aucune image trouvée dans outputs/images/")
            print("💡 Vous pouvez :")
            print("   • Générer une image avec FLUX (Option 5 du menu)")
            print("   • Spécifier un chemin vers une image existante")
            
            custom_path = input("\n📁 Chemin de l'image (ou Entrée pour annuler) : ").strip()
            
            if not custom_path:
                print("\n❌ Annulé")
                return
            
            image_path = Path(custom_path)
            
            if not image_path.exists():
                print(f"\n❌ Image introuvable : {image_path}")
                return
        
        print(f"\n✅ Image sélectionnée : {image_path.name}")
        
        # Configuration de la génération
        print("\n" + "="*70)
        print("⚙️ CONFIGURATION DE LA GÉNÉRATION")
        print("="*70)
        
        # Prompt
        print("\n💡 PROMPT DE MOUVEMENT/ANIMATION")
        print("─"*70)
        print("\nExemples de prompts efficaces :")
        print("   • 'Slow camera zoom in, cinematic lighting'")
        print("   • 'Smooth camera pan from left to right'")
        print("   • 'Gentle parallax effect, atmospheric'")
        print("   • 'Camera slowly moving forward, epic scale'")
        print()
        
        prompt = input("📝 Votre prompt : ").strip()
        
        if not prompt:
            print("\n❌ Prompt vide, annulé")
            return
        
        # Durée
        print("\n💡 DURÉE DE LA VIDÉO")
        print("   5s = Recommandé ($0.33 en Pro)")
        print("   10s = Plus long ($0.66 en Pro)")
        
        duration_input = input("\nDurée [5] : ").strip()
        duration = int(duration_input) if duration_input and duration_input.isdigit() else 5
        
        if duration not in [5, 10]:
            print("⚠️ Durée invalide, utilisation de 5s")
            duration = 5
        
        # Ratio d'aspect
        print("\n💡 RATIO D'ASPECT")
        print("   1. 16:9 (paysage, recommandé)")
        print("   2. 9:16 (portrait, TikTok/Reels)")
        print("   3. 1:1 (carré, Instagram)")
        
        ratio_choice = input("\nChoix [1] : ").strip()
        ratios = {"1": "16:9", "2": "9:16", "3": "1:1"}
        aspect_ratio = ratios.get(ratio_choice, "16:9")
        
        # Mode
        print("\n💡 MODE DE GÉNÉRATION")
        print("   1. Professional (meilleure qualité, recommandé)")
        print("   2. Standard (moins cher, qualité moindre)")
        
        mode_choice = input("\nChoix [1] : ").strip()
        mode = "professional" if mode_choice != "2" else "standard"
        
        # Version modèle
        print("\n💡 VERSION KLING")
        print("   1. Kling 2.5 (dernière version, recommandé)")
        print("   2. Kling 2.1 (stable)")
        print("   3. Kling 1.6 (ancienne)")
        
        version_choice = input("\nChoix [1] : ").strip()
        versions = {"1": "2.5", "2": "2.1", "3": "1.6"}
        model_version = versions.get(version_choice, "2.5")
        
        # Negative prompt (optionnel)
        print("\n💡 NEGATIVE PROMPT (optionnel)")
        print("   Éléments à éviter dans la vidéo")
        
        use_negative = input("\nUtiliser negative prompt ? (o/N) : ").strip().lower()
        
        negative_prompt = None
        if use_negative == 'o':
            default_negative = "people, text, UI, low quality, blurry, distorted"
            print(f"\nNegative prompt par défaut :")
            print(f"   '{default_negative}'")
            
            custom_negative = input("\nPersonnaliser (ou Entrée pour utiliser défaut) : ").strip()
            negative_prompt = custom_negative if custom_negative else default_negative
        
        # Confirmation
        print("\n" + "="*70)
        print("⚠️ CONFIRMATION")
        print("="*70)
        
        print(f"\nImage : {image_path.name}")
        print(f"Prompt : {prompt}")
        print(f"Durée : {duration}s")
        print(f"Ratio : {aspect_ratio}")
        print(f"Mode : {mode}")
        print(f"Modèle : Kling {model_version}")
        
        if negative_prompt:
            print(f"Negative : {negative_prompt[:50]}...")
        
        # Calcul coût
        if model_version == "2.5":
            cost = 0.33 if duration == 5 else 0.66
        elif mode == "professional":
            cost = 0.46 if duration == 5 else 0.92
        else:
            cost = 0.26 if duration == 5 else 0.52
        
        print(f"\n💰 Coût estimé : ${cost:.2f}")
        
        confirm = input("\n❓ Lancer la génération ? (oui/non) : ").strip().lower()
        
        if confirm not in ['oui', 'o', 'yes', 'y']:
            print("\n❌ Annulé")
            return
        
        # Génération
        try:
            video_path = self.generate_video_from_image(
                image_path=str(image_path),
                prompt=prompt,
                duration=duration,
                aspect_ratio=aspect_ratio,
                mode=mode,
                model_version=model_version,
                negative_prompt=negative_prompt
            )
            
            print(f"\n🎉 Succès ! Vidéo générée : {video_path}")
            print("\n💡 Vous pouvez maintenant :")
            print("   • Visionner la vidéo")
            print("   • L'étendre avec l'option 7 (Image Chain)")
            print("   • Générer d'autres variantes")
        
        except Exception as e:
            print(f"\n❌ Erreur : {e}")
            import traceback
            traceback.print_exc()


def main():
    """Point d'entrée."""
    
    try:
        generator = ImageToVideoGenerator()
        generator.interactive_generate()
    
    except KeyboardInterrupt:
        print("\n\n⚠️ Génération annulée")
    
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
