#!/usr/bin/env python3
"""
Script de test rapide - Vérifie que tout fonctionne.
"""

import os
import sys
from pathlib import Path

def test_imports():
    """Test des imports Python."""
    print("🧪 Test des imports Python...")
    
    try:
        import requests
        print("  ✅ requests")
    except ImportError:
        print("  ❌ requests manquant")
        print("     → pip install requests --break-system-packages")
        return False
    
    try:
        from PIL import Image
        print("  ✅ PIL (Pillow)")
    except ImportError:
        print("  ❌ Pillow manquant")
        print("     → pip install pillow --break-system-packages")
        return False
    
    try:
        from dotenv import load_dotenv
        print("  ✅ python-dotenv")
    except ImportError:
        print("  ❌ python-dotenv manquant")
        print("     → pip install python-dotenv --break-system-packages")
        return False
    
    return True


def test_structure():
    """Test de la structure des fichiers."""
    print("\n📁 Test de la structure du projet...")
    
    required_files = [
        "main.py",
        "requirements.txt",
        ".env.example",
        "README.md",
        "src/kling_api.py",
        "src/video_generator.py",
        "src/batch_processor.py",
        "prompts/prompt_templates.py"
    ]
    
    required_dirs = [
        "config",
        "references",
        "prompts",
        "src",
        "outputs"
    ]
    
    all_good = True
    
    for file in required_files:
        if Path(file).exists():
            print(f"  ✅ {file}")
        else:
            print(f"  ❌ {file} manquant")
            all_good = False
    
    for dir in required_dirs:
        if Path(dir).exists():
            print(f"  ✅ {dir}/")
        else:
            print(f"  ❌ {dir}/ manquant")
            all_good = False
    
    return all_good


def test_env():
    """Test de la configuration .env"""
    print("\n🔑 Test de la configuration API...")
    
    if not Path(".env").exists():
        print("  ⚠️  Fichier .env manquant")
        print("     → Copiez .env.example vers .env")
        print("     → Ajoutez votre PIAPI_API_KEY")
        return False
    
    from dotenv import load_dotenv
    load_dotenv()
    
    # Chercher d'abord PIAPI_API_KEY, puis KLING_API_KEY (rétrocompatibilité)
    api_key = os.getenv("PIAPI_API_KEY") or os.getenv("KLING_API_KEY")
    
    if not api_key:
        print("  ❌ PIAPI_API_KEY non configurée")
        print("     → Éditez .env et ajoutez votre clé PiAPI")
        return False
    
    if api_key in ["votre_cle_api_ici", "sk_votre_vraie_cle_ici_remplacez_moi"]:
        print("  ⚠️  PIAPI_API_KEY non modifiée")
        print("     → Remplacez par votre vraie clé API")
        return False
    
    print(f"  ✅ PIAPI_API_KEY configurée ({api_key[:10]}...)")
    return True


def test_modules():
    """Test des modules du projet."""
    print("\n🐍 Test des modules du projet...")
    
    sys.path.insert(0, str(Path(__file__).parent))
    
    try:
        from src import kling_api
        print("  ✅ src.kling_api")
    except Exception as e:
        print(f"  ❌ src.kling_api : {e}")
        return False
    
    try:
        from src import video_generator
        print("  ✅ src.video_generator")
    except Exception as e:
        print(f"  ❌ src.video_generator : {e}")
        return False
    
    try:
        from src import batch_processor
        print("  ✅ src.batch_processor")
    except Exception as e:
        print(f"  ❌ src.batch_processor : {e}")
        return False
    
    try:
        from prompts import prompt_templates
        print("  ✅ prompts.prompt_templates")
    except Exception as e:
        print(f"  ❌ prompts.prompt_templates : {e}")
        return False
    
    return True


def test_api_connection():
    """Test de connexion à l'API Kling (optionnel)."""
    print("\n🌐 Test de connexion API Kling...")
    
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.getenv("KLING_API_KEY")
    
    if not api_key or api_key == "votre_cle_api_ici":
        print("  ⚠️  Clé API non configurée, test ignoré")
        return None
    
    try:
        from src.kling_api import KlingAPI
        client = KlingAPI()
        
        info = client.get_account_info()
        
        if info:
            print("  ✅ Connexion réussie !")
            credits = info.get("credits", "?")
            print(f"     Crédits : {credits}")
            return True
        else:
            print("  ⚠️  Connexion OK mais pas d'infos récupérées")
            return None
    
    except Exception as e:
        print(f"  ❌ Erreur de connexion : {e}")
        print("     Vérifiez votre clé API")
        return False


def test_prompt_generation():
    """Test de génération de prompts."""
    print("\n📝 Test de génération de prompts...")
    
    try:
        from prompts.prompt_templates import build_prompt, STYLE_PRESETS
        
        preset = "dune_epic"
        prompt = build_prompt(preset, duration=5)
        
        print(f"  ✅ Prompt généré pour '{preset}'")
        print(f"     Longueur : {len(prompt)} caractères")
        print(f"     Aperçu : {prompt[:80]}...")
        
        return True
    
    except Exception as e:
        print(f"  ❌ Erreur : {e}")
        return False


def main():
    """Exécute tous les tests."""
    print("="*70)
    print("🧪 TEST SYSTÈME - Générateur Vidéo Cinématique")
    print("="*70)
    
    results = {}
    
    results['imports'] = test_imports()
    results['structure'] = test_structure()
    results['env'] = test_env()
    results['modules'] = test_modules()
    results['prompts'] = test_prompt_generation()
    results['api'] = test_api_connection()
    
    # Résumé
    print("\n" + "="*70)
    print("📊 RÉSUMÉ")
    print("="*70)
    
    passed = sum(1 for v in results.values() if v is True)
    failed = sum(1 for v in results.values() if v is False)
    skipped = sum(1 for v in results.values() if v is None)
    
    print(f"\n  ✅ Réussis  : {passed}")
    print(f"  ❌ Échoués  : {failed}")
    print(f"  ⚠️  Ignorés  : {skipped}")
    
    if failed == 0 and results['env'] and results['api'] is not False:
        print("\n🎉 TOUT EST PRÊT !")
        print("\nVous pouvez lancer le générateur :")
        print("  python3 main.py")
    
    elif failed == 0 and not results['env']:
        print("\n⚠️  PRESQUE PRÊT !")
        print("\nIl ne manque que la configuration API :")
        print("  1. Copiez .env.example vers .env")
        print("  2. Ajoutez votre clé API Kling")
        print("  3. Relancez ce test")
    
    elif failed == 0 and results['api'] is None:
        print("\n⚠️  CONFIGURATION INCOMPLÈTE")
        print("\nLe code fonctionne mais l'API n'est pas configurée.")
        print("Vous pouvez :")
        print("  • Tester les prompts : python3 prompts/prompt_templates.py")
        print("  • Configurer l'API puis lancer : python3 main.py")
    
    else:
        print("\n❌ DES PROBLÈMES ONT ÉTÉ DÉTECTÉS")
        print("\nVoir les détails ci-dessus et corriger les erreurs.")
        print("Consultez INSTALL_MAC.md pour l'aide.")
    
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    main()
