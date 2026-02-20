#!/usr/bin/env python3
"""
🎬 GÉNÉRATEUR DE VIDÉOS CINÉMATIQUES
Style : Hyperréalisme - Dune/Arrival

Point d'entrée principal avec interface interactive.
"""
import subprocess
import os
import sys
import subprocess
from pathlib import Path

# Ajouter le projet au path
sys.path.insert(0, str(Path(__file__).parent))

from image_to_video_extend import ImageToVideoExtender
from flux_image_generator import FluxImageGenerator
from image_to_video import ImageToVideoGenerator
from src.video_generator import VideoGenerator
from prompts.prompt_templates import STYLE_PRESETS


def print_banner():
    """Affiche le banner de l'application."""
    print("\n" + "="*70)
    print("🎬  GÉNÉRATEUR DE VIDÉOS CINÉMATIQUES AI")
    print("="*70)
    print("\n   Style : Hyperréalisme - Dune/Arrival/Denis Villeneuve")
    print("   Engine : Kling AI via PiAPI")
    print("   Mode : standard | Pay-as-you-go\n")
    print("="*70 + "\n")


def print_menu():
    """Affiche le menu principal."""
    print("\n📋 MENU PRINCIPAL :\n")
    print("  1. 🎨 Générer avec un preset (recommandé)")
    print("  2. 📚 Voir les presets disponibles")
    print("  3. ➕ Créer un nouveau preset")
    print("  4. ✏️  Modifier un preset")
    print("  5. 🖼️  Générer une image (FLUX.1)")
    print("  6. 🎬 Image-to-Video")
    print("  7. 🔄 Prolonger une vidéo (Image Chain)")
    print("  8. 💳 Vérifier mes crédits")
    print("  9. 🔑 Configuration API")
    print("  10. 🚪 Quitter")
    print()


def mode_preset(generator: VideoGenerator):
    """Mode génération avec preset."""
    print("\n" + "="*70)
    print("🎨 GÉNÉRATION AVEC PRESET")
    print("="*70 + "\n")
    
    # Afficher les presets
    presets = list(STYLE_PRESETS.keys())
    for i, name in enumerate(presets, 1):
        preset = STYLE_PRESETS[name]
        print(f"  {i}. {name}")
        print(f"     {preset['base'][:60]}...")
        print()
    
    # Choix
    try:
        choice = int(input("Choisissez un preset (numéro) : ")) - 1
        if choice < 0 or choice >= len(presets):
            print("❌ Choix invalide")
            return
        
        preset_name = presets[choice]
        
        # Durée
        duration = input("\nDurée (5 ou 10 secondes) [5] : ").strip()
        duration = int(duration) if duration else 5
        
        if duration not in [5, 10]:
            print("❌ Durée invalide, utilisation de 5s")
            duration = 5
        
        # Ratio
        print("\nRatio d'aspect :")
        print("  1. 16:9 (paysage, recommandé)")
        print("  2. 9:16 (portrait)")
        print("  3. 1:1 (carré)")
        
        ratio_choice = input("Choix [1] : ").strip()
        ratios = ["16:9", "9:16", "1:1"]
        aspect_ratio = ratios[int(ratio_choice) - 1] if ratio_choice else "16:9"
        
        # Nom de fichier
        filename = input("\nNom du fichier (optionnel) : ").strip()
        
        print("\n🚀 Génération en cours...\n")
        
        # Générer
        video_path = generator.generate(
            preset=preset_name,
            duration=duration,
            aspect_ratio=aspect_ratio,
            custom_filename=filename if filename else None
        )
        
        print(f"\n✅ Vidéo disponible : {video_path}")
        
    except ValueError:
        print("❌ Entrée invalide")
    except KeyboardInterrupt:
        print("\n\n⚠️  Génération annulée")
    except Exception as e:
        print(f"\n❌ Erreur : {e}")


def show_presets():
    """Affiche les presets disponibles."""
    print("\n" + "="*70)
    print("📚 PRESETS DISPONIBLES")
    print("="*70 + "\n")
    
    for name, preset in STYLE_PRESETS.items():
        print(f"🎨 {name.upper()}")
        print(f"   Base : {preset['base']}")
        print(f"   Style : {preset['color']}")
        print(f"   Caméra : {preset['camera']}")
        print(f"   Qualité : {preset['quality']}")
        print()
    
    input("\nAppuyez sur Entrée pour continuer...")


def check_credits(generator: VideoGenerator):
    """Vérifie les crédits."""
    print("\n" + "="*70)
    print("💳 VÉRIFICATION DES CRÉDITS")
    print("="*70 + "\n")
    
    try:
        generator.check_credits()
    except Exception as e:
        print(f"❌ Erreur : {e}")
    
    input("\nAppuyez sur Entrée pour continuer...")


def create_preset_menu():
    """Menu pour créer un nouveau preset personnalisé."""
    
    print("\n" + "="*70)
    print("➕ CRÉER UN NOUVEAU PRESET")
    print("="*70)
    
    print("\n📋 Ce menu vous permet de créer un preset réutilisable")
    print("   basé sur votre propre prompt et style.")
    
    print("\n💡 Avantages :")
    print("   • Sauvegarder vos meilleurs prompts")
    print("   • Réutiliser facilement vos styles favoris")
    print("   • Partager vos presets avec d'autres")
    print("   • Enrichir avec des analyses d'images")
    
    print("\n" + "="*70)
    
    # Lancer le script de création
    print("\n🚀 Lancement de l'assistant de création...\n")
    
    try:
        subprocess.run(["python3", "create_preset.py"], check=True)
    except subprocess.CalledProcessError:
        print("\n❌ Erreur lors de la création du preset")
    except FileNotFoundError:
        print("\n❌ Fichier create_preset.py introuvable")
        print("\n💡 Assurez-vous que create_preset.py est dans le même dossier")
    except KeyboardInterrupt:
        print("\n\n⚠️  Création annulée")
    
    input("\n⏎  Appuyez sur Entrée pour revenir au menu...")


def configure_api():
    """Configuration de l'API."""
    print("\n" + "="*70)
    print("🔑 CONFIGURATION API PIAPI")
    print("="*70 + "\n")
    
    print("📖 Pour obtenir votre clé API PiAPI :\n")
    print("  1. Allez sur https://piapi.ai")
    print("  2. Créez un compte (Email/Google/GitHub)")
    print("  3. Dashboard → API Keys")
    print("  4. Create New API Key")
    print("  5. Copiez la clé (format: sk_...)")
    print("  6. Rechargez votre compte (Billing → Add Credits)\n")
    
    print("💡 Avantages PiAPI :")
    print("   - $0 frais minimum")
    print("   - Pay-as-you-go : $0.33/vidéo 5s")
    print("   - Accès immédiat\n")
    
    api_key = input("Votre clé API PiAPI (ou Entrée pour annuler) : ").strip()
    
    if api_key:
        # Sauvegarder dans .env
        env_path = Path(".env")
        
        with open(env_path, 'w') as f:
            f.write(f"PIAPI_API_KEY={api_key}\n")
        
        print(f"\n✅ Clé API sauvegardée dans {env_path}")
        print("   Redémarrez le programme pour l'utiliser")
    else:
        print("\n⚠️  Configuration annulée")
    
    input("\nAppuyez sur Entrée pour continuer...")


def flux_image_menu():
    """Menu pour générer des images avec FLUX.1."""

    print("\n" + "="*70)
    print("🖼️  GÉNÉRATION D'IMAGES - FLUX.1")
    print("="*70)
    print("\n💡 Créez des images de haute qualité avec FLUX.1")
    print("\n✅ Fonctionnalités :")
    print("   • Génération d'images depuis un prompt texte")
    print("   • Historique des prompts (amélioration itérative)")
    print("   • Validation de prompt pour image-to-video")
    print("   • 3 modèles : Pro (qualité), Dev (équilibré), Schnell (rapide)")
    print("\n💰 Coût : ~$0.04 par image (flux-pro)")
    print()
    print("="*70)

    input("\n⏎  Appuyez sur Entrée pour continuer...")

    try:
        generator = FluxImageGenerator()
        generator.interactive_generate()

    except ValueError as e:
        print(f"\n❌ Erreur : {e}")
        print("\n💡 Configurez votre clé API PiAPI avec l'option 8")

    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        import traceback
        traceback.print_exc()

    input("\n⏎  Appuyez sur Entrée pour revenir au menu...")


def image_to_video_menu():
    """Menu pour Image-to-Video."""
    print("\n" + "="*70)
    print("🎬 IMAGE-TO-VIDEO")
    print("="*70)
    print("\n💡 Transformez n'importe quelle image en vidéo cinématique")
    print("   • Upload depuis votre ordinateur")
    print("   • Contrôle total du mouvement/animation")
    print("   • Synergie avec images FLUX (Option 5)")
    print("   • Extensible avec Image Chain (Option 8)")
    
    try:
        generator = ImageToVideoGenerator()
        generator.interactive_generate()
    except ValueError as e:
        print(f"\n❌ {e}")
        print("\n💡 Vérifiez votre configuration :")
        print("   • Clé API PiAPI dans .env")
        print("   • Image au bon format (PNG, JPG)")
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        import traceback
        traceback.print_exc()


def extend_image_chain_menu():
    """Menu pour étendre une vidéo via image-to-video chain."""

    print("\n" + "="*70)
    print("🔄 EXTENSION VIDÉO - IMAGE-TO-VIDEO CHAIN")
    print("="*70)
    print("\n💡 Méthode : Dernière frame → Génération continuation → Concat")
    print("\n✅ Avantages :")
    print("   • Une seule API (PiAPI)")
    print("   • Moins cher ($0.33 vs points Kling)")
    print("   • Plus flexible (contrôle prompt)")
    print("\n⚠️  Prérequis : FFmpeg installé")
    print("   macOS : brew install ffmpeg")
    print("   Linux : sudo apt install ffmpeg")
    print()
    print("="*70)

    input("\n⏎  Appuyez sur Entrée pour continuer...")

    try:
        extender = ImageToVideoExtender()
        extender.interactive_extend()

    except FileNotFoundError as e:
        print(f"\n❌ Erreur : {e}")
        print("\n📥 Installez FFmpeg :")
        print("   macOS : brew install ffmpeg")
        print("   Linux : sudo apt install ffmpeg")

    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        import traceback
        traceback.print_exc()

    input("\n⏎  Appuyez sur Entrée pour revenir au menu...")


def main():
    """Point d'entrée principal."""
    print_banner()
    
    # Charger les variables d'environnement
    from dotenv import load_dotenv
    load_dotenv()
    
    # Vérifier la clé API (chercher d'abord PIAPI_API_KEY, puis KLING_API_KEY)
    api_key = os.getenv("PIAPI_API_KEY") or os.getenv("KLING_API_KEY")
    
    if not api_key:
        print("⚠️  AUCUNE CLÉ API CONFIGURÉE\n")
        print("Pour utiliser le générateur, vous devez configurer votre clé API PiAPI.\n")
        
        configure_now = input("Configurer maintenant ? (O/n) : ").strip().lower()
        
        if configure_now != 'n':
            configure_api()
            print("\nRedémarrez le programme pour continuer.")
            return
        else:
            print("\n⚠️  Impossible de continuer sans clé API")
            return
    
    # Initialiser
    try:
        generator = VideoGenerator()
    except Exception as e:
        print(f"\n❌ Erreur d'initialisation : {e}")
        print("\nVérifiez votre clé API avec l'option 8 du menu.")
        return
    
    # Boucle principale

    while True:
        try:
            print_menu()
            choice = input("Votre choix : ").strip()

            if choice == '1':
                mode_preset(generator)

            elif choice == '2':
                show_presets()

            elif choice == '3':
                create_preset_menu()

            elif choice == '4':
                edit_preset_menu()

            elif choice == '5':
                flux_image_menu()

            elif choice == '6':
                image_to_video_menu()

            elif choice == '7':
                extend_image_chain_menu()

            elif choice == '8':
                check_credits(generator)

            elif choice == '9':
                configure_api()

            elif choice == '10':
                print("\n👋 Au revoir !\n")
                break

            else:
                print("\n❌ Choix invalide")

        except KeyboardInterrupt:
            print("\n\n👋 Au revoir !\n")
            break

        except Exception as e:
            print(f"\n❌ Erreur : {e}\n")


def edit_preset_menu():
    """Sous-menu pour modifier un preset existant."""

    print("\n" + "="*70)
    print("✏️  MODIFICATION DE PRESET")
    print("="*70)
    print("📋 Ce menu vous permet de modifier directement les champs")
    print("   d'un preset sans passer par l'analyse d'images.")
    print()
    print("💡 Fonctionnalités :")
    print("   • Modifier le prompt principal (base)")
    print("   • Modifier la palette de couleurs")
    print("   • Modifier le mouvement de caméra")
    print("   • Modifier les paramètres de qualité")
    print()
    print("⚠️  Un backup automatique est créé avant chaque modification")
    print("="*70)

    input("\nAppuyez sur Entrée pour continuer...")

    try:
        # Lancer l'éditeur interactif
        result = subprocess.run(
            ["python3", "edit_preset.py"],
            cwd=os.getcwd()
        )

        if result.returncode == 0:
            print("\n✅ Modification terminée")
        else:
            print("\n⚠️  Modification annulée ou erreur")

    except FileNotFoundError:
        print("\n❌ Erreur : edit_preset.py introuvable")
        print("💡 Assurez-vous que le fichier existe dans le dossier")

    except KeyboardInterrupt:
        print("\n\n❌ Annulé par l'utilisateur")

    input("\nAppuyez sur Entrée pour revenir au menu...")


if __name__ == "__main__":
    main()
