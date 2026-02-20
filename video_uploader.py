#!/usr/bin/env python3
"""
Helper pour uploader des vidéos vers des services d'hébergement temporaire.
Facilite l'utilisation de la fonction extend.
"""

import requests
from pathlib import Path
from typing import Optional


class VideoUploader:
    """Upload des vidéos vers des services temporaires."""
    
    @staticmethod
    def upload_to_0x0(file_path: str) -> str:
        """
        Upload vers 0x0.st (gratuit, 30 jours).
        
        Args:
            file_path: Chemin de la vidéo
            
        Returns:
            URL publique de la vidéo
        """
        print(f"\n📤 Upload vers 0x0.st...")
        print(f"   Vidéo : {Path(file_path).name}")
        
        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(
                'https://0x0.st',
                files=files,
                timeout=300  # 5 minutes max
            )
            response.raise_for_status()
            
            url = response.text.strip()
            
            print(f"✅ Upload réussi !")
            print(f"🔗 URL : {url}")
            print(f"⏰ Disponible pendant 30 jours")
            
            return url
    
    @staticmethod
    def upload_to_fileio(file_path: str) -> str:
        """
        Upload vers file.io (gratuit, 1 téléchargement).
        
        Args:
            file_path: Chemin de la vidéo
            
        Returns:
            URL publique de la vidéo
        """
        print(f"\n📤 Upload vers file.io...")
        print(f"   Vidéo : {Path(file_path).name}")
        print(f"   ⚠️  Attention : URL valide pour 1 seul téléchargement")
        
        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(
                'https://file.io',
                files=files,
                timeout=300
            )
            response.raise_for_status()
            
            data = response.json()
            
            if not data.get('success'):
                raise Exception(f"Upload échoué : {data.get('message')}")
            
            url = data['link']
            
            print(f"✅ Upload réussi !")
            print(f"🔗 URL : {url}")
            print(f"⚠️  IMPORTANT : Cette URL expire après 1 téléchargement !")
            
            return url
    
    @staticmethod
    def upload_to_tmpfiles(file_path: str) -> str:
        """
        Upload vers tmpfiles.org (gratuit, 7 jours).
        
        Note : Nécessite l'API key (gratuit sur inscription).
        
        Args:
            file_path: Chemin de la vidéo
            
        Returns:
            URL publique de la vidéo
        """
        print(f"\n📤 Upload vers tmpfiles.org...")
        print(f"   Vidéo : {Path(file_path).name}")
        
        # API tmpfiles nécessite une clé
        print("\n⚠️  tmpfiles.org nécessite une API key (gratuit)")
        print("   Inscrivez-vous sur : https://tmpfiles.org/api")
        
        api_key = input("\nAPI Key tmpfiles : ").strip()
        
        if not api_key:
            raise ValueError("API Key requise")
        
        with open(file_path, 'rb') as f:
            files = {'file': f}
            headers = {'Authorization': f'Bearer {api_key}'}
            
            response = requests.post(
                'https://tmpfiles.org/api/v1/upload',
                files=files,
                headers=headers,
                timeout=300
            )
            response.raise_for_status()
            
            data = response.json()
            url = data['data']['url']
            
            print(f"✅ Upload réussi !")
            print(f"🔗 URL : {url}")
            print(f"⏰ Disponible pendant 7 jours")
            
            return url
    
    @staticmethod
    def interactive_upload(file_path: str) -> str:
        """
        Mode interactif pour choisir le service d'upload.
        
        Args:
            file_path: Chemin de la vidéo
            
        Returns:
            URL publique de la vidéo
        """
        file_size_mb = Path(file_path).stat().st_size / (1024 * 1024)
        
        print("\n" + "="*70)
        print("📤 UPLOAD DE VIDÉO")
        print("="*70)
        print(f"\n📁 Vidéo : {Path(file_path).name}")
        print(f"📊 Taille : {file_size_mb:.2f} MB")
        print()
        print("Choisissez un service d'hébergement :\n")
        print("1. 0x0.st (Recommandé)")
        print("   • Gratuit, sans inscription")
        print("   • Disponible 30 jours")
        print("   • Pas de limite de téléchargements")
        print()
        print("2. file.io")
        print("   • Gratuit, sans inscription")
        print("   • URL expire après 1 téléchargement ⚠️")
        print("   • Rapide")
        print()
        print("3. tmpfiles.org")
        print("   • Gratuit avec inscription")
        print("   • Disponible 7 jours")
        print("   • Nécessite API key")
        print()
        print("0. Annuler et entrer URL manuellement")
        
        choice = input("\nChoix [1] : ").strip() or "1"
        
        try:
            if choice == "1":
                return VideoUploader.upload_to_0x0(file_path)
            elif choice == "2":
                return VideoUploader.upload_to_fileio(file_path)
            elif choice == "3":
                return VideoUploader.upload_to_tmpfiles(file_path)
            elif choice == "0":
                url = input("\nEntrez l'URL de votre vidéo : ").strip()
                if not url:
                    raise ValueError("URL requise")
                return url
            else:
                print("\n❌ Choix invalide, utilisation de 0x0.st par défaut")
                return VideoUploader.upload_to_0x0(file_path)
        
        except Exception as e:
            print(f"\n❌ Erreur d'upload : {e}")
            print("\n💡 Vous pouvez uploader manuellement et entrer l'URL")
            url = input("\nURL de votre vidéo : ").strip()
            if not url:
                raise ValueError("URL requise")
            return url


def main():
    """Test du uploader."""
    
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python3 video_uploader.py <chemin_video>")
        return
    
    file_path = sys.argv[1]
    
    if not Path(file_path).exists():
        print(f"❌ Fichier introuvable : {file_path}")
        return
    
    try:
        url = VideoUploader.interactive_upload(file_path)
        print(f"\n✅ Vidéo disponible : {url}")
    except Exception as e:
        print(f"\n❌ Erreur : {e}")


if __name__ == "__main__":
    main()
