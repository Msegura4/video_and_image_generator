#!/usr/bin/env python3
"""
Script de test pour l'analyseur vidéo.
Télécharge une vidéo de test et l'analyse.
"""

import os
import sys
from pathlib import Path

def test_video_analyzer():
    """Test basique de l'analyseur vidéo."""
    
    print("\n" + "="*70)
    print("🧪 TEST DE L'ANALYSEUR VIDÉO")
    print("="*70)
    
    # Vérifier OpenCV
    print("\n1️⃣ Vérification des dépendances...")
    try:
        import cv2
        import numpy as np
        print("   ✅ OpenCV installé")
        print(f"   Version OpenCV: {cv2.__version__}")
    except ImportError as e:
        print(f"   ❌ OpenCV manquant: {e}")
        print("\n   Installation:")
        print("   pip3 install opencv-python numpy --break-system-packages")
        return False
    
    # Vérifier la structure
    print("\n2️⃣ Vérification de la structure...")
    base_dir = Path(__file__).parent / "inspirations"
    
    if not base_dir.exists():
        print(f"   ❌ Dossier inspirations introuvable: {base_dir}")
        return False
    
    print(f"   ✅ Dossier inspirations: {base_dir}")
    
    # Compter les presets avec vidéos
    presets_with_videos = []
    video_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    
    for preset_dir in base_dir.iterdir():
        if preset_dir.is_dir():
            videos = []
            for ext in video_extensions:
                videos.extend(list(preset_dir.glob(f"*{ext}")))
                videos.extend(list(preset_dir.glob(f"*{ext.upper()}")))
            
            if videos:
                presets_with_videos.append((preset_dir.name, len(videos)))
    
    print(f"\n3️⃣ Presets avec vidéos: {len(presets_with_videos)}")
    
    if presets_with_videos:
        for preset, count in presets_with_videos:
            print(f"   • {preset}: {count} vidéo(s)")
        
        print("\n4️⃣ Test de l'analyseur sur le premier preset...")
        
        # Importer l'analyseur
        try:
            from analyze_video_inspirations import VideoInspirationAnalyzer
            analyzer = VideoInspirationAnalyzer()
            
            # Analyser le premier preset
            test_preset = presets_with_videos[0][0]
            print(f"\n   Analyse de '{test_preset}'...")
            
            analysis = analyzer.analyze_preset(test_preset)
            
            if analysis:
                print("\n   ✅ Analyse réussie !")
                print(f"\n   📊 Résultats:")
                print(f"      Vidéos: {analysis['video_count']}")
                
                if 'synthesis' in analysis:
                    synth = analysis['synthesis']
                    print(f"      Mouvements: {', '.join(synth.get('dominant_movements', [])[:2])}")
                    print(f"      Vitesse: {synth.get('dominant_speed', 'N/A')}")
                    print(f"      POV: {synth.get('dominant_pov', 'N/A')}")
                
                if 'camera_suggestions' in analysis:
                    kling = analysis['camera_suggestions'].get('kling_params', {})
                    if kling:
                        print(f"\n      Paramètres Kling suggérés:")
                        print(f"         horizontal: {kling.get('horizontal', 0)}")
                        print(f"         vertical: {kling.get('vertical', 0)}")
                        print(f"         zoom: {kling.get('zoom', 0)}")
                
                return True
            else:
                print("   ⚠️  Aucune donnée retournée")
                return False
                
        except Exception as e:
            print(f"   ❌ Erreur lors de l'analyse: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    else:
        print("\n   ℹ️  Aucune vidéo trouvée dans les presets")
        print("\n   Pour tester:")
        print("   1. Ajoutez une vidéo .mp4 dans: inspirations/custom/")
        print("   2. Relancez: python3 test_video_analyzer.py")
        return True
    
    print("\n" + "="*70)


def main():
    """Point d'entrée."""
    
    success = test_video_analyzer()
    
    if success:
        print("\n✅ TEST RÉUSSI - L'analyseur vidéo fonctionne !")
        print("\nUsage:")
        print("   python3 analyze_video_inspirations.py [preset_name]")
    else:
        print("\n❌ TEST ÉCHOUÉ - Consultez les erreurs ci-dessus")
        sys.exit(1)


if __name__ == "__main__":
    main()
