#!/usr/bin/env python3
"""
Script interactif de configuration Cloudinary.
Guide l'utilisateur pour configurer son .env correctement.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

def main():
    print("\n" + "="*70)
    print("🔧 CONFIGURATION CLOUDINARY")
    print("="*70)
    
    print("""
📦 Cloudinary te permet de :
   • Stocker toutes tes créations (vidéos + images)
   • Galerie organisée par type
   • Sélectionner depuis tes créations au lieu de drag & drop
   • 25 GB gratuit !

🔗 Dashboard : https://console.cloudinary.com/
""")
    
    # Vérifier si .env existe
    env_file = Path(".env")
    
    if not env_file.exists():
        print("📝 Création du fichier .env...")
        # Copier depuis .env.example
        example = Path(".env.example")
        if example.exists():
            with open(example) as f:
                content = f.read()
            with open(env_file, 'w') as f:
                f.write(content)
            print("✅ Fichier .env créé depuis .env.example")
        else:
            # Créer nouveau
            with open(env_file, 'w') as f:
                f.write("# Configuration API Keys\n\n")
                f.write("PIAPI_API_KEY=\n\n")
                f.write("# Cloudinary\n")
                f.write("CLOUDINARY_CLOUD_NAME=\n")
                f.write("CLOUDINARY_API_KEY=\n")
                f.write("CLOUDINARY_API_SECRET=\n")
            print("✅ Fichier .env créé")
    
    print("\n" + "="*70)
    print("📋 ÉTAPE 1 : Récupérer tes credentials")
    print("="*70)
    
    print("""
1. Va sur : https://console.cloudinary.com/
2. Cherche le bloc "Product Environment Credentials"
3. Tu verras :
   
   Cloud name:    dxxxxxxxx
   API Key:       123456789012345
   API Secret:    ************************ [View]
   
4. Clique sur [View] pour voir l'API Secret
""")
    
    input("\n✅ Appuie sur Enter quand tu as les 3 valeurs... ")
    
    print("\n" + "="*70)
    print("⌨️  ÉTAPE 2 : Entrer les credentials")
    print("="*70)
    
    # Demander les credentials
    cloud_name = input("\n📝 Cloud name (ex: dxxxxxxxx) : ").strip()
    api_key = input("📝 API Key (ex: 123456789012345) : ").strip()
    api_secret = input("📝 API Secret (ex: ABC...XYZ) : ").strip()
    
    if not cloud_name or not api_key or not api_secret:
        print("\n❌ Credentials manquants, annulation")
        return
    
    # Lire le .env actuel
    load_dotenv()
    current_piapi = os.getenv("PIAPI_API_KEY", "")
    
    # Mettre à jour le .env
    with open(env_file, 'w') as f:
        f.write("# Configuration API Keys\n\n")
        f.write("# ===== PiAPI (Kling AI + FLUX) =====\n")
        f.write(f"PIAPI_API_KEY={current_piapi}\n\n")
        f.write("# ===== Cloudinary (Stockage Cloud) =====\n")
        f.write(f"CLOUDINARY_CLOUD_NAME={cloud_name}\n")
        f.write(f"CLOUDINARY_API_KEY={api_key}\n")
        f.write(f"CLOUDINARY_API_SECRET={api_secret}\n")
    
    print("\n✅ Fichier .env mis à jour !")
    
    # Tester la connexion
    print("\n" + "="*70)
    print("🧪 ÉTAPE 3 : Test de connexion")
    print("="*70)
    
    print("\n⏳ Test en cours...")
    
    try:
        import cloudinary
        import cloudinary.api
        
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret
        )
        
        # Supprimer le warning SSL (cosmétique)
        import warnings
        warnings.filterwarnings('ignore', message='.*OpenSSL.*')
        
        # Test avec usage() au lieu de ping()
        result = cloudinary.api.usage()
        
        print("\n✅ CONNEXION RÉUSSIE !")
        print(f"\n📦 Cloud : {cloud_name}")
        print(f"💾 Stockage : {result.get('storage', {}).get('usage', 0) / (1024*1024):.2f} MB")
        
    except ImportError:
        print("\n⚠️  Package cloudinary non installé")
        print("\n📦 Installation :")
        print("   pip install cloudinary")
        print("\nPuis relance : python setup_cloudinary.py")
        return
    
    except Exception as e:
        print(f"\n❌ Erreur de connexion : {e}")
        print("\n💡 Vérifications :")
        print("   • Cloud name correct ?")
        print("   • API Key correct ?")
        print("   • API Secret correct (clique sur [View]) ?")
        return
    
    # Tester le gestionnaire
    print("\n" + "="*70)
    print("🔍 ÉTAPE 4 : Test du gestionnaire")
    print("="*70)
    
    try:
        from cloudinary_manager import CloudinaryManager
        
        print("\n⏳ Récupération des statistiques...")
        
        manager = CloudinaryManager()
        stats = manager.get_storage_stats()
        
        if stats:
            print("\n✅ Gestionnaire fonctionnel !")
            print(f"\n📊 Statistiques :")
            print(f"   • Stockage utilisé : {stats.get('storage_used_mb', 0):.2f} MB")
            print(f"   • Créations totales : {stats.get('total_creations', 0)}")
            print(f"   • Vidéos : {stats.get('videos_generated', 0) + stats.get('videos_image_to_video', 0) + stats.get('videos_extended', 0)}")
            print(f"   • Images : {stats.get('images_flux', 0)}")
        else:
            print("\n⚠️  Impossible de récupérer les stats")
    
    except ImportError:
        print("\n⚠️  cloudinary_manager.py non trouvé")
        print("   Assure-toi qu'il est dans le même dossier")
    
    except Exception as e:
        print(f"\n⚠️  Erreur : {e}")
    
    # Résumé final
    print("\n" + "="*70)
    print("🎉 CONFIGURATION TERMINÉE !")
    print("="*70)
    
    print("""
✅ Cloudinary est configuré !

📋 Prochaines étapes :

1. Installer cloudinary si pas déjà fait :
   pip install cloudinary

2. Lancer Streamlit :
   streamlit run streamlit_app.py

3. Utiliser la page "📁 Tes Créations" pour :
   • Voir toutes tes créations
   • Sélectionner images/vidéos au lieu de drag & drop
   • Gérer ton stockage

💡 Tips :
   • Toutes tes générations seront auto-uploadées
   • 25 GB gratuit (≈ 500 vidéos)
   • Dashboard : https://console.cloudinary.com/

🚀 Amuse-toi bien !
""")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Configuration annulée")
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
