#!/usr/bin/env python3
"""
Test rapide de la galerie Cloudinary.
Vérifie que les fichiers sont bien listés.
"""

from cloudinary_manager import CloudinaryManager

print("\n" + "="*70)
print("🧪 TEST GALERIE CLOUDINARY")
print("="*70)

try:
    manager = CloudinaryManager()
    
    # Test 1: Lister TOUTES les vidéos
    print("\n📹 Test 1 : Toutes les vidéos")
    print("-"*70)
    all_videos = manager.list_videos(creation_type=None, limit=50)
    print(f"✅ {len(all_videos)} vidéo(s) totale(s)")
    
    if all_videos:
        for i, video in enumerate(all_videos[:3], 1):
            print(f"\n   {i}. {video.get('filename', 'N/A')}")
            print(f"      Type: {video.get('creation_type', 'N/A')}")
            print(f"      Taille: {video.get('size', 0) / (1024*1024):.2f} MB")
    
    # Test 2: Vidéos générées
    print("\n📹 Test 2 : Vidéos générées")
    print("-"*70)
    generated = manager.list_videos(creation_type="generated", limit=50)
    print(f"✅ {len(generated)} vidéo(s) générée(s)")
    
    # Test 3: Vidéos image-to-video
    print("\n📹 Test 3 : Vidéos image-to-video")
    print("-"*70)
    i2v = manager.list_videos(creation_type="image_to_video", limit=50)
    print(f"✅ {len(i2v)} vidéo(s) image-to-video")
    
    # Test 4: Vidéos étendues
    print("\n📹 Test 4 : Vidéos étendues")
    print("-"*70)
    extended = manager.list_videos(creation_type="extended", limit=50)
    print(f"✅ {len(extended)} vidéo(s) étendue(s)")
    
    # Test 5: Images
    print("\n🖼️  Test 5 : Images FLUX")
    print("-"*70)
    images = manager.list_images(limit=50)
    print(f"✅ {len(images)} image(s)")
    
    if images:
        for i, img in enumerate(images[:3], 1):
            print(f"\n   {i}. {img.get('filename', 'N/A')}")
            print(f"      Dimensions: {img.get('width', 0)}x{img.get('height', 0)}")
            print(f"      Taille: {img.get('size', 0) / 1024:.1f} KB")
    
    # Résumé
    print("\n" + "="*70)
    print("📊 RÉSUMÉ")
    print("="*70)
    print(f"  Vidéos totales      : {len(all_videos)}")
    print(f"  - Générées          : {len(generated)}")
    print(f"  - Image-to-Video    : {len(i2v)}")
    print(f"  - Étendues          : {len(extended)}")
    print(f"  Images FLUX         : {len(images)}")
    print()
    
    if len(all_videos) == 0 and len(images) == 0:
        print("ℹ️  Aucune création trouvée dans Cloudinary")
        print()
        print("💡 Solutions :")
        print("   1. Génère une création dans Streamlit")
        print("   2. Vérifie que l'auto-upload fonctionne")
        print("   3. Vérifie les credentials Cloudinary")
        print()
    else:
        print("✅ Les créations sont bien dans Cloudinary !")
        print()
        print("💡 Si elles n'apparaissent pas dans Streamlit :")
        print("   1. Clique sur '🔄 Actualiser' dans la page")
        print("   2. Vérifie que le filtre est sur 'Toutes'")
        print("   3. Recharge la page du navigateur (F5)")
        print()

except Exception as e:
    print(f"\n❌ Erreur : {e}")
    print()
    print("💡 Assure-toi que :")
    print("   1. Cloudinary est configuré (.env)")
    print("   2. Les credentials sont corrects")
    print("   3. Tu as accès internet")
    print()
    
    import traceback
    print("\n🔍 Détails :")
    traceback.print_exc()
