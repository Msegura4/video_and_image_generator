#!/usr/bin/env python3
"""
Test minimaliste de connexion Cloudinary.
"""

import os
import warnings
from dotenv import load_dotenv

# Supprimer les warnings SSL
warnings.filterwarnings('ignore', message='.*OpenSSL.*')

load_dotenv()

print("\n🧪 Test Cloudinary Minimal\n")

# Récupérer les credentials
cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

print(f"Cloud Name: {cloud_name}")
print(f"API Key: {api_key[:10]}..." if api_key else "API Key: Non configuré")
print(f"API Secret: {api_secret[:10]}..." if api_secret else "API Secret: Non configuré")

if not all([cloud_name, api_key, api_secret]):
    print("\n❌ Credentials manquants dans .env")
    print("\n💡 Lance: python setup_cloudinary.py")
    exit(1)

print("\n⏳ Test de connexion...")

try:
    import cloudinary
    import cloudinary.api
    
    # Configuration
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret
    )
    
    # Test API
    usage = cloudinary.api.usage()
    
    print("\n✅ CONNEXION RÉUSSIE !\n")
    
    # Afficher les infos
    storage_mb = usage.get('storage', {}).get('usage', 0) / (1024 * 1024)
    bandwidth_mb = usage.get('bandwidth', {}).get('usage', 0) / (1024 * 1024)
    
    print(f"📊 Statistiques:")
    print(f"   • Stockage utilisé: {storage_mb:.2f} MB / 25 GB")
    print(f"   • Bande passante: {bandwidth_mb:.2f} MB / 25 GB par mois")
    print(f"   • Transformations: {usage.get('transformations', {}).get('usage', 0)}")
    
    # Test du manager
    print("\n⏳ Test du gestionnaire...")
    
    try:
        from cloudinary_manager import CloudinaryManager
        
        manager = CloudinaryManager()
        
        # Lister les ressources
        videos = manager.list_videos(limit=5)
        images = manager.list_images(limit=5)
        
        print(f"\n✅ Gestionnaire fonctionnel !")
        print(f"   • Vidéos trouvées: {len(videos)}")
        print(f"   • Images trouvées: {len(images)}")
        
    except ImportError:
        print("\n⚠️  cloudinary_manager.py non trouvé (normal si pas encore créé)")
    except Exception as e:
        print(f"\n⚠️  Erreur gestionnaire: {e}")
    
    print("\n🎉 Cloudinary est prêt à l'emploi !\n")

except ImportError:
    print("\n❌ Module cloudinary non installé")
    print("\n📦 Installation:")
    print("   pip install cloudinary")

except Exception as e:
    print(f"\n❌ Erreur: {e}")
    print("\n💡 Vérifications:")
    print("   • Cloud name correct?")
    print("   • API Key correct?")
    print("   • API Secret correct (clique sur [View])?")
