#!/usr/bin/env python3
"""
Extension de vidéos via Image-to-Video Chain.
Méthode : Extraire dernière frame → Générer continuation → Concaténer

Avantages :
- Une seule API (PiAPI)
- Moins cher que extend natif
- Plus flexible (contrôle du prompt de continuation)
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


class ImageToVideoExtender:
    """Étend une vidéo en utilisant la méthode image-to-video chain."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise l'extendeur.
        
        Args:
            api_key: Clé API PiAPI (optionnel si dans .env)
        """
        self.api = KlingAPI(api_key)
        self.utils = VideoUtils()
        self.outputs_dir = Path("outputs")
        self.temp_dir = Path("outputs/temp")
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        print("\n" + "="*70)
        print("🔄 EXTENSION VIDÉO - IMAGE-TO-VIDEO CHAIN")
        print("="*70)
        print("\n💡 Méthode : Dernière frame → Génération continuation → Concat")
        print("✅ Une seule API (PiAPI)")
        print()
    
    def extend_video(
        self,
        video_path: str,
        continuation_prompt: Optional[str] = None,
        duration: int = 5,
        mode: str = "professional",
        extract_multiple_frames: bool = False,
        keep_temp: bool = False
    ) -> str:
        """
        Étend une vidéo de 5s à ~10s avec continuation fluide.
        
        Args:
            video_path: Chemin de la vidéo source
            continuation_prompt: Prompt pour guider la continuation (optionnel)
            duration: Durée de la continuation (5s recommandé)
            mode: Mode génération ("professional" ou "standard")
            extract_multiple_frames: Extraire 3 frames pour meilleure cohérence (expérimental)
            keep_temp: Garder les fichiers temporaires
        
        Returns:
            Chemin de la vidéo étendue
        """
        video_path = Path(video_path)
        
        if not video_path.exists():
            raise FileNotFoundError(f"❌ Vidéo introuvable : {video_path}")
        
        print(f"📹 Vidéo source : {video_path.name}")
        
        # Étape 1 : Extraire dernière frame(s)
        print("\n" + "="*70)
        print("📸 ÉTAPE 1/4 : EXTRACTION FRAME(S)")
        print("="*70)
        
        if extract_multiple_frames:
            # Expérimental : extraire 3 frames finales pour meilleure cohérence
            print("   Mode : 3 frames finales (meilleure cohérence)")
            # TODO : implémenter extraction multiple frames
            frame_path = self.temp_dir / f"last_frame_{int(time.time())}.jpg"
            self.utils.extract_last_frame(str(video_path), str(frame_path))
        else:
            frame_path = self.temp_dir / f"last_frame_{int(time.time())}.jpg"
            self.utils.extract_last_frame(str(video_path), str(frame_path))
        
        # Étape 2 : Upload frame
        print("\n" + "="*70)
        print("📤 ÉTAPE 2/4 : UPLOAD FRAME")
        print("="*70)
        
        frame_url = self.utils.upload_image_with_fallback(str(frame_path))
        
        # Étape 3 : Générer continuation
        print("\n" + "="*70)
        print("🎬 ÉTAPE 3/4 : GÉNÉRATION CONTINUATION FLUIDE")
        print("="*70)
        
        # Construire le prompt de continuation optimisé
        if not continuation_prompt:
            continuation_prompt = self._get_continuation_prompt(video_path)
        
        print(f"\n📝 Prompt continuation : {continuation_prompt[:100]}...")
        print("💡 Optimisé pour : continuation fluide et naturelle")
        
        # Générer la vidéo de continuation
        # IMPORTANT : On utilise l'image comme référence de cohérence
        try:
            result = self.api.generate_video(
                prompt=continuation_prompt,
                image_url=frame_url,
                duration=duration,
                mode=mode,
                # Pas de negative prompt pour ne pas contraindre
            )
            
            task_id = result.get("task_id")
            
            # Attendre la génération
            completed = self.api.wait_for_completion(task_id)
            
        except Exception as e:
            print("\n" + "="*70)
            print("❌ ERREUR GÉNÉRATION PIAPI")
            print("="*70)
            print(f"\n🔴 Erreur : {e}")
            print("\n💡 Causes possibles :")
            print("   1. URL image invalide ou inaccessible")
            print("   2. Format image non supporté (doit être JPG)")
            print("   3. Dimensions image incorrectes")
            print("   4. Prompt filtré par modération PiAPI")
            print("   5. Crédits PiAPI insuffisants")
            print("   6. Problème temporaire serveur PiAPI")
            print("\n🔍 Détails de cette tentative :")
            print(f"   • URL image : {frame_url}")
            print(f"   • Prompt : {continuation_prompt}")
            print(f"   • Durée : {duration}s")
            print(f"   • Mode : {mode}")
            print("\n📋 Actions recommandées :")
            print("   1. Vérifiez que l'URL image fonctionne :")
            print(f"      Ouvrez : {frame_url}")
            print("   2. Vérifiez vos crédits PiAPI :")
            print("      https://piapi.ai/workspace/billing")
            print("   3. Essayez avec un prompt plus simple")
            print("   4. Consultez GUIDE_UPLOAD_SERVICES.md")
            raise
        
        # Télécharger la continuation
        continuation_path = self.temp_dir / f"continuation_{int(time.time())}.mp4"
        self.api.download_video(completed, str(continuation_path))
        
        # Étape 4 : Concaténer (CUT DIRECT = pas de transition)
        print("\n" + "="*70)
        print("✂️ ÉTAPE 4/4 : ASSEMBLAGE (CUT DIRECT)")
        print("="*70)
        print("💡 Assemblage direct sans transition pour fluidité maximale")
        
        # Nom de fichier final
        timestamp = int(time.time())
        output_filename = f"extended_{video_path.stem}_{timestamp}.mp4"
        output_path = self.outputs_dir / output_filename
        
        # Concat direct (cut) - Le plus fluide si la génération est bonne
        final_path = self.utils.concat_videos(
            [str(video_path), str(continuation_path)],
            str(output_path)
        )
        
        # Sauvegarder metadata
        self._save_metadata(
            output_path,
            video_path,
            continuation_prompt,
            duration,
            mode
        )
        
        # Nettoyage
        if not keep_temp:
            print("\n🧹 Nettoyage fichiers temporaires...")
            frame_path.unlink(missing_ok=True)
            continuation_path.unlink(missing_ok=True)
        else:
            print(f"\n📁 Fichiers temporaires conservés dans {self.temp_dir}/")
        
        # Résumé final
        print("\n" + "="*70)
        print("✅ EXTENSION TERMINÉE !")
        print("="*70)
        
        original_duration = self.utils.get_video_duration(str(video_path))
        final_duration = self.utils.get_video_duration(final_path)
        
        print(f"\n📊 Résumé :")
        print(f"   Vidéo originale : {original_duration:.1f}s")
        print(f"   Continuation : {duration}s")
        print(f"   Vidéo finale : {final_duration:.1f}s")
        print(f"\n📁 Fichier : {final_path}")
        print(f"💰 Coût : ${self._estimate_cost(duration, mode):.2f}")
        print(f"\n💡 Conseil : Visionnez pour vérifier la fluidité")
        print()
        
        return final_path
    
    def _get_continuation_prompt(self, video_path: Path) -> str:
        """
        Récupère ou génère un prompt de continuation optimisé pour fluidité.
        
        Args:
            video_path: Chemin de la vidéo
            
        Returns:
            Prompt de continuation optimisé
        """
        # Chercher metadata
        metadata_file = str(video_path).replace('.mp4', '_metadata.json')
        
        base_prompt = None
        
        if Path(metadata_file).exists():
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                original_prompt = metadata.get('prompt', '')
                
                if original_prompt:
                    # Nettoyer le prompt (enlever les méta-instructions)
                    clean_prompt = original_prompt.split('professional mode')[0].strip()
                    clean_prompt = clean_prompt.split('cinematic quality')[0].strip()
                    base_prompt = clean_prompt
            except:
                pass
        
        if base_prompt:
            # Créer un prompt optimisé pour continuation fluide
            # IMPORTANT : Pas de "continue", "next", etc. qui cassent la fluidité
            # On décrit ce qui SE PASSE MAINTENANT (comme si c'était la même scène)
            
            continuation = (
                f"{base_prompt}, "
                "smooth continuous camera movement, "
                "seamless flow, "
                "maintain momentum, "
                "same lighting and atmosphere, "
                "natural progression"
            )
        else:
            # Fallback optimisé pour fluidité
            continuation = (
                "smooth continuous camera movement, "
                "seamless cinematic flow, "
                "maintain the same momentum and direction, "
                "consistent lighting and atmosphere, "
                "natural scene progression, "
                "fluid motion"
            )
        
        return continuation
    
    def _estimate_cost(self, duration: int, mode: str) -> float:
        """
        Estime le coût de la continuation.
        
        Args:
            duration: Durée de la continuation
            mode: Mode de génération
            
        Returns:
            Coût estimé en dollars
        """
        # Tarifs PiAPI Kling 2.5
        if mode == "professional":
            return 0.33 if duration == 5 else 0.66
        else:
            return 0.16 if duration == 5 else 0.32
    
    def _save_metadata(
        self,
        output_path: Path,
        source_path: Path,
        prompt: str,
        duration: int,
        mode: str
    ):
        """Sauvegarde les metadata de l'extension."""
        metadata = {
            "type": "extended_video",
            "method": "image_to_video_chain",
            "source_video": str(source_path),
            "continuation_prompt": prompt,
            "continuation_duration": duration,
            "mode": mode,
            "extended_at": time.time(),
            "final_path": str(output_path)
        }
        
        metadata_file = str(output_path).replace('.mp4', '_metadata.json')
        
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    def list_extendable_videos(self) -> list:
        """Liste les vidéos disponibles pour extension."""
        videos = list(self.outputs_dir.glob("*.mp4"))
        
        # Filtrer les vidéos déjà étendues
        videos = [v for v in videos if not v.stem.startswith("extended_")]
        
        if not videos:
            return []
        
        print("\n" + "="*70)
        print("📹 VIDÉOS DISPONIBLES POUR EXTENSION")
        print("="*70 + "\n")
        
        video_list = []
        
        for i, video in enumerate(sorted(videos), 1):
            duration = self.utils.get_video_duration(str(video))
            size_mb = video.stat().st_size / (1024 * 1024)
            
            print(f"   {i}. {video.name}")
            print(f"      Durée : {duration:.1f}s | Taille : {size_mb:.2f} MB")
            print()
            
            video_list.append(video)
        
        print("="*70)
        
        return video_list
    
    def interactive_extend(self):
        """Mode interactif pour étendre une vidéo avec continuation fluide."""
        
        # Lister les vidéos
        videos = self.list_extendable_videos()
        
        if not videos:
            print("\n⚠️  Aucune vidéo disponible dans outputs/")
            print("\n💡 Générez d'abord une vidéo avec l'option 1 du menu")
            return
        
        # Choisir vidéo
        choice = input("\n❓ Quelle vidéo étendre ? (numéro) : ").strip()
        
        if not choice.isdigit():
            print("❌ Numéro invalide")
            return
        
        idx = int(choice) - 1
        
        if idx < 0 or idx >= len(videos):
            print("❌ Numéro invalide")
            return
        
        video_path = videos[idx]
        
        print(f"\n✅ Vidéo sélectionnée : {video_path.name}")
        
        # Prompt de continuation
        print("\n" + "="*70)
        print("💡 PROMPT DE CONTINUATION")
        print("="*70)
        print("\n   Le système va optimiser automatiquement pour une")
        print("   continuation fluide et naturelle")
        print()
        print("   Vous pouvez personnaliser pour guider la suite,")
        print("   ou laisser vide pour le prompt optimisé automatique")
        print()
        
        custom_prompt = input("Prompt personnalisé (ou Entrée pour auto) : ").strip()
        
        # Durée
        print("\n💡 Durée de la continuation :")
        print("   5s = Recommandé ($0.33)")
        print("   10s = Plus long mais plus cher ($0.66)")
        
        duration_input = input("\nDurée [5] : ").strip()
        duration = int(duration_input) if duration_input else 5
        
        if duration not in [5, 10]:
            print("⚠️  Durée invalide, utilisation de 5s")
            duration = 5
        
        # Mode
        print("\n💡 Mode de génération :")
        print("   1. Professional (meilleure qualité, recommandé)")
        print("   2. Standard (moins cher mais qualité moindre)")
        
        mode_choice = input("\nChoix [1] : ").strip()
        mode = "professional" if mode_choice != "2" else "standard"
        
        # Confirmation
        print("\n" + "="*70)
        print("⚠️  CONFIRMATION")
        print("="*70)
        
        print(f"\nVidéo : {video_path.name}")
        print(f"Durée continuation : {duration}s")
        print(f"Mode : {mode}")
        print(f"Assemblage : Cut direct (fluidité maximale)")
        
        cost = self._estimate_cost(duration, mode)
        print(f"\n💰 Coût estimé : ${cost:.2f}")
        
        print("\n💡 Astuce : La fluidité dépend de :")
        print("   • Qualité du prompt de continuation")
        print("   • Cohérence avec la vidéo originale")
        print("   • L'IA comprendra le mouvement à partir de l'image finale")
        
        confirm = input("\n❓ Lancer l'extension ? (oui/non) : ").strip().lower()
        
        if confirm not in ['oui', 'o', 'yes', 'y']:
            print("\n❌ Annulé")
            return
        
        # Lancer l'extension
        try:
            extended_path = self.extend_video(
                str(video_path),
                continuation_prompt=custom_prompt if custom_prompt else None,
                duration=duration,
                mode=mode
            )
            
            print(f"\n🎉 Succès ! Vidéo étendue : {extended_path}")
            print("\n💡 Visionnez le résultat pour vérifier la fluidité")
            print("   Si la transition n'est pas parfaite :")
            print("   • Réessayez avec un prompt plus précis")
            print("   • Ou ajustez le prompt original de la vidéo source")
        
        except Exception as e:
            print(f"\n❌ Erreur : {e}")
            import traceback
            traceback.print_exc()


def main():
    """Point d'entrée."""
    
    try:
        extender = ImageToVideoExtender()
        extender.interactive_extend()
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Extension annulée")
    
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
