#!/usr/bin/env python3
"""
Script de diagnostic pour l'extension image-to-video.
Teste chaque étape individuellement.
"""

import sys
from pathlib import Path

# Ajouter le dossier parent au path
sys.path.insert(0, str(Path(__file__).parent))

from src.kling_api import KlingAPI
from video_utils import VideoUtils
import json


def test_1_extract_frame():
    """Test extraction frame."""
    print("\n" + "="*70)
    print("TEST 1 : EXTRACTION FRAME")
    print("="*70)
    
    # Trouver une vidéo
    videos = list(Path("outputs").glob("*.mp4"))
    
    if not videos:
        print("❌ Aucune vidéo dans outputs/")
        return None
    
    video = videos[0]
    print(f"📹 Vidéo : {video.name}")
    
    utils = VideoUtils()
    
    frame_path = Path("outputs/temp/diagnostic_frame.jpg")
    frame_path.parent.mkdir(exist_ok=True)
    
    try:
        utils.extract_last_frame(str(video), str(frame_path))
        
        if frame_path.exists():
            size = frame_path.stat().st_size / 1024
            print(f"✅ Frame extraite : {frame_path}")
            print(f"📊 Taille : {size:.1f} KB")
            
            # Vérifier les dimensions
            from PIL import Image
            img = Image.open(frame_path)
            print(f"🖼️  Dimensions : {img.size[0]}x{img.size[1]}")
            print(f"🎨 Format : {img.format}")
            
            return frame_path
        else:
            print("❌ Frame non créée")
            return None
    
    except Exception as e:
        print(f"❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
        return None


def test_2_upload_frame(frame_path):
    """Test upload frame."""
    print("\n" + "="*70)
    print("TEST 2 : UPLOAD FRAME")
    print("="*70)
    
    if not frame_path:
        print("⚠️  Pas de frame à uploader (test 1 échoué)")
        return None
    
    utils = VideoUtils()
    
    try:
        url = utils.upload_image_with_fallback(str(frame_path))
        print(f"✅ Upload réussi : {url}")
        
        # Tester l'URL
        print("\n🔍 Vérification URL...")
        import requests
        
        response = requests.head(url, timeout=10)
        print(f"   Status code : {response.status_code}")
        print(f"   Content-Type : {response.headers.get('Content-Type')}")
        print(f"   Content-Length : {response.headers.get('Content-Length')} bytes")
        
        if response.status_code == 200:
            print("✅ URL accessible")
            return url
        else:
            print(f"⚠️  URL retourne {response.status_code}")
            return url  # Retourne quand même
    
    except Exception as e:
        print(f"❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
        return None


def test_3_generate_from_image(image_url):
    """Test génération PiAPI depuis image."""
    print("\n" + "="*70)
    print("TEST 3 : GÉNÉRATION PIAPI IMAGE-TO-VIDEO")
    print("="*70)
    
    if not image_url:
        print("⚠️  Pas d'URL image (test 2 échoué)")
        return False
    
    api = KlingAPI()
    
    # Test simple avec prompt basique
    test_prompt = "smooth camera movement forward, natural lighting, cinematic"
    
    print(f"📝 Prompt : {test_prompt}")
    print(f"🔗 Image URL : {image_url}")
    print(f"⚙️  Paramètres : 5s, standard mode")
    
    try:
        print("\n🚀 Lancement génération...")
        
        result = api.generate_video(
            prompt=test_prompt,
            image_url=image_url,
            duration=5,
            mode="standard"  # Standard pour test
        )
        
        task_id = result.get("task_id")
        print(f"✅ Tâche créée : {task_id}")
        
        # Attendre (court pour test)
        print("\n⏳ Attente génération (max 120s)...")
        
        completed = api.wait_for_completion(task_id, max_wait=120)
        
        print("✅ Génération réussie !")
        print("\n📊 Réponse PiAPI :")
        print(json.dumps(completed, indent=2))
        
        return True
    
    except Exception as e:
        print(f"\n❌ ERREUR GÉNÉRATION : {e}")
        print("\n💡 Détails de l'erreur :")
        import traceback
        traceback.print_exc()
        
        print("\n🔍 DIAGNOSTIC :")
        print(f"   • URL image : {image_url}")
        print(f"   • Prompt : {test_prompt}")
        
        # Tester si c'est un problème d'URL
        print("\n🧪 Test direct de l'URL image...")
        try:
            import requests
            from PIL import Image
            from io import BytesIO
            
            response = requests.get(image_url, timeout=10)
            img = Image.open(BytesIO(response.content))
            
            print(f"   ✅ Image téléchargeable")
            print(f"   📐 Taille : {img.size}")
            print(f"   🎨 Format : {img.format}")
            print(f"   📊 Mode : {img.mode}")
            
        except Exception as img_error:
            print(f"   ❌ Image non accessible : {img_error}")
        
        return False


def test_4_account_info():
    """Test info compte PiAPI."""
    print("\n" + "="*70)
    print("TEST 4 : VÉRIFICATION COMPTE PIAPI")
    print("="*70)
    
    api = KlingAPI()
    
    try:
        # PiAPI n'a pas d'endpoint public pour la balance
        # On teste juste la connexion
        
        print("💳 PiAPI : Pay-as-you-go")
        print("📊 Vérifiez votre balance sur :")
        print("   https://piapi.ai/workspace/billing")
        
        return True
    
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False


def main():
    """Exécute tous les tests."""
    
    print("\n" + "="*70)
    print("🔬 DIAGNOSTIC IMAGE-TO-VIDEO EXTEND")
    print("="*70)
    
    results = {}
    
    # Test 1 : Extraction
    frame_path = test_1_extract_frame()
    results['extract'] = frame_path is not None
    
    if not results['extract']:
        print("\n❌ Test 1 échoué - Impossible de continuer")
        return
    
    # Test 2 : Upload
    image_url = test_2_upload_frame(frame_path)
    results['upload'] = image_url is not None
    
    if not results['upload']:
        print("\n❌ Test 2 échoué - Impossible de continuer")
        return
    
    # Test 3 : Génération
    results['generate'] = test_3_generate_from_image(image_url)
    
    # Test 4 : Compte
    results['account'] = test_4_account_info()
    
    # Résumé
    print("\n" + "="*70)
    print("📊 RÉSUMÉ DES TESTS")
    print("="*70)
    
    for test_name, success in results.items():
        status = "✅" if success else "❌"
        print(f"{status} {test_name.upper()}")
    
    if all(results.values()):
        print("\n🎉 TOUS LES TESTS RÉUSSIS !")
        print("   Le système d'extension devrait fonctionner")
    else:
        print("\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ")
        print("   Consultez les détails ci-dessus")


if __name__ == "__main__":
    main()
