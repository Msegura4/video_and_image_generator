#!/usr/bin/env python3
"""
Utilitaires pour manipulation de vidéos.
Fonctions : extraction frames, concaténation, upload, etc.
"""

import os
import subprocess
from pathlib import Path
from typing import List, Optional
import requests


class VideoUtils:
    """Utilitaires pour manipulation de vidéos."""
    
    def __init__(self):
        """Initialise les utils."""
        self._check_ffmpeg()
    
    def _check_ffmpeg(self):
        """Vérifie que FFmpeg est installé."""
        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                print("✅ FFmpeg détecté")
            else:
                raise Exception("FFmpeg non fonctionnel")
        except FileNotFoundError:
            print("\n⚠️  FFmpeg non installé !")
            print("\n📥 Installation :")
            print("   macOS : brew install ffmpeg")
            print("   Linux : sudo apt install ffmpeg")
            raise Exception("FFmpeg requis")
        except Exception as e:
            print(f"⚠️  Problème FFmpeg : {e}")
    
    def extract_last_frame(self, video_path: str, output_path: str) -> str:
        """
        Extrait la dernière frame d'une vidéo.
        
        Args:
            video_path: Chemin de la vidéo
            output_path: Chemin de sortie pour l'image
            
        Returns:
            Chemin de l'image extraite
        """
        print(f"\n📸 Extraction dernière frame...")
        print(f"   Vidéo : {Path(video_path).name}")
        
        # Commande FFmpeg pour extraire la dernière frame
        cmd = [
            'ffmpeg',
            '-sseof', '-1',  # Aller à la fin
            '-i', video_path,
            '-update', '1',  # Une seule frame
            '-q:v', '1',     # Qualité maximale
            '-y',            # Écraser si existe
            output_path
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                raise Exception(f"Erreur FFmpeg : {result.stderr}")
            
            if not Path(output_path).exists():
                raise Exception("Frame non créée")
            
            file_size = Path(output_path).stat().st_size / 1024
            print(f"✅ Frame extraite : {Path(output_path).name} ({file_size:.1f} KB)")
            
            return output_path
        
        except subprocess.TimeoutExpired:
            raise Exception("Timeout extraction frame")
        except Exception as e:
            raise Exception(f"Erreur extraction frame : {e}")
    
    def get_video_duration(self, video_path: str) -> float:
        """
        Récupère la durée d'une vidéo.
        
        Args:
            video_path: Chemin de la vidéo
            
        Returns:
            Durée en secondes
        """
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            video_path
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return float(result.stdout.strip())
            else:
                return 0.0
        
        except:
            return 0.0
    
    def concat_videos(self, video_paths: List[str], output_path: str) -> str:
        """
        Concatène plusieurs vidéos (cut simple).
        
        Args:
            video_paths: Liste des chemins vidéo
            output_path: Chemin de sortie
            
        Returns:
            Chemin de la vidéo finale
        """
        print(f"\n✂️ Concaténation vidéos (cut)...")
        print(f"   Nombre de vidéos : {len(video_paths)}")
        
        # Créer fichier liste pour FFmpeg
        list_file = Path(output_path).parent / "concat_list.txt"
        
        with open(list_file, 'w') as f:
            for video in video_paths:
                # FFmpeg concat demux format
                f.write(f"file '{Path(video).absolute()}'\n")
        
        # Commande FFmpeg concat
        cmd = [
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', str(list_file),
            '-c', 'copy',  # Copie sans ré-encodage
            '-y',
            output_path
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode != 0:
                # Retry avec ré-encodage si copy échoue
                print("   ⚠️  Copy failed, retry avec ré-encodage...")
                cmd = [
                    'ffmpeg',
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', str(list_file),
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-crf', '18',
                    '-c:a', 'aac',
                    '-y',
                    output_path
                ]
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                
                if result.returncode != 0:
                    raise Exception(f"Erreur concat : {result.stderr}")
            
            # Nettoyage
            list_file.unlink(missing_ok=True)
            
            file_size = Path(output_path).stat().st_size / (1024 * 1024)
            print(f"✅ Vidéo concaténée : {Path(output_path).name} ({file_size:.2f} MB)")
            
            return output_path
        
        except subprocess.TimeoutExpired:
            raise Exception("Timeout concaténation")
        except Exception as e:
            raise Exception(f"Erreur concaténation : {e}")
    
    def concat_videos_with_fade(
        self,
        video_paths: List[str],
        output_path: str,
        fade_duration: float = 0.5
    ) -> str:
        """
        Concatène vidéos avec fondu entre elles.
        
        Args:
            video_paths: Liste des chemins vidéo
            output_path: Chemin de sortie
            fade_duration: Durée du fondu en secondes
            
        Returns:
            Chemin de la vidéo finale
        """
        print(f"\n✂️ Concaténation vidéos (fade {fade_duration}s)...")
        
        if len(video_paths) != 2:
            # Pour plus de 2 vidéos, utiliser concat simple
            return self.concat_videos(video_paths, output_path)
        
        # Pour 2 vidéos, créer un crossfade
        video1_duration = self.get_video_duration(video_paths[0])
        offset = video1_duration - fade_duration
        
        cmd = [
            'ffmpeg',
            '-i', video_paths[0],
            '-i', video_paths[1],
            '-filter_complex',
            f'[0:v][1:v]xfade=transition=fade:duration={fade_duration}:offset={offset}[v];'
            f'[0:a][1:a]acrossfade=d={fade_duration}[a]',
            '-map', '[v]',
            '-map', '[a]',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '18',
            '-c:a', 'aac',
            '-y',
            output_path
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                print(f"   ⚠️  Fade échoué, utilisation concat simple...")
                return self.concat_videos(video_paths, output_path)
            
            file_size = Path(output_path).stat().st_size / (1024 * 1024)
            print(f"✅ Vidéo avec fade : {Path(output_path).name} ({file_size:.2f} MB)")
            
            return output_path
        
        except Exception as e:
            print(f"   ⚠️  Erreur fade : {e}")
            return self.concat_videos(video_paths, output_path)
    
    def concat_videos_with_blend(
        self,
        video_paths: List[str],
        output_path: str
    ) -> str:
        """
        Concatène vidéos avec blend (mélange progressif).
        
        Args:
            video_paths: Liste des chemins vidéo
            output_path: Chemin de sortie
            
        Returns:
            Chemin de la vidéo finale
        """
        # Pour l'instant, utilise fade
        return self.concat_videos_with_fade(video_paths, output_path, fade_duration=1.0)
    
    def upload_image_to_0x0(self, image_path: str) -> str:
        """
        Upload une image vers 0x0.st (gratuit, 30 jours).
        
        Args:
            image_path: Chemin de l'image
            
        Returns:
            URL publique
        """
        print(f"\n📤 Upload image vers 0x0.st...")
        print(f"   Fichier : {Path(image_path).name}")
        
        try:
            with open(image_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(
                    'https://0x0.st',
                    files=files,
                    timeout=60
                )
                response.raise_for_status()
                
                url = response.text.strip()
                
                print(f"✅ Image uploadée !")
                print(f"🔗 URL : {url}")
                print(f"⏰ Disponible 30 jours")
                
                return url
        
        except Exception as e:
            print(f"⚠️  0x0.st échoué : {e}")
            raise Exception(f"Erreur upload 0x0.st : {e}")
    
    def upload_image_to_tmpfiles(self, image_path: str) -> str:
        """
        Upload vers tmpfiles.org (7 jours).
        
        Args:
            image_path: Chemin de l'image
            
        Returns:
            URL publique
        """
        print(f"\n📤 Upload image vers tmpfiles.org...")
        print(f"   Fichier : {Path(image_path).name}")
        
        try:
            with open(image_path, 'rb') as f:
                files = {'file': (Path(image_path).name, f, 'image/jpeg')}
                response = requests.post(
                    'https://tmpfiles.org/api/v1/upload',
                    files=files,
                    timeout=60
                )
                response.raise_for_status()
                
                data = response.json()
                
                # tmpfiles retourne format: {"status": "success", "data": {"url": "..."}}
                if data.get('status') == 'success':
                    url = data['data']['url']
                    # Convertir tmpfiles.org/XXX en tmpfiles.org/dl/XXX pour lien direct
                    url = url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
                    
                    print(f"✅ Image uploadée !")
                    print(f"🔗 URL : {url}")
                    print(f"⏰ Disponible 7 jours")
                    
                    return url
                else:
                    raise Exception(f"Upload échoué : {data}")
        
        except Exception as e:
            print(f"⚠️  tmpfiles.org échoué : {e}")
            raise Exception(f"Erreur upload tmpfiles : {e}")
    
    def upload_image_to_imgur(self, image_path: str) -> str:
        """
        Upload vers imgur.com (permanent, très fiable pour APIs).
        
        Args:
            image_path: Chemin de l'image
            
        Returns:
            URL publique
        """
        print(f"\n📤 Upload image vers imgur.com...")
        print(f"   Fichier : {Path(image_path).name}")
        
        # Client ID anonyme Imgur (public)
        client_id = "546c25a59c58ad7"
        
        try:
            with open(image_path, 'rb') as f:
                headers = {'Authorization': f'Client-ID {client_id}'}
                files = {'image': f}
                
                response = requests.post(
                    'https://api.imgur.com/3/image',
                    headers=headers,
                    files=files,
                    timeout=60
                )
                response.raise_for_status()
                
                data = response.json()
                
                if data.get('success'):
                    url = data['data']['link']
                    
                    print(f"✅ Image uploadée !")
                    print(f"🔗 URL : {url}")
                    print(f"⏰ Permanent")
                    print(f"🌐 Très fiable pour APIs")
                    
                    return url
                else:
                    raise Exception(f"Upload échoué : {data}")
        
        except Exception as e:
            print(f"⚠️  imgur.com échoué : {e}")
            raise Exception(f"Erreur upload imgur : {e}")
    
    def upload_image_to_catbox(self, image_path: str) -> str:
        """
        Upload vers catbox.moe (permanent, anonyme).
        
        Args:
            image_path: Chemin de l'image
            
        Returns:
            URL publique
        """
        print(f"\n📤 Upload image vers catbox.moe...")
        print(f"   Fichier : {Path(image_path).name}")
        
        try:
            with open(image_path, 'rb') as f:
                files = {'fileToUpload': f}
                data = {'reqtype': 'fileupload'}
                
                response = requests.post(
                    'https://catbox.moe/user/api.php',
                    files=files,
                    data=data,
                    timeout=60
                )
                response.raise_for_status()
                
                url = response.text.strip()
                
                if url.startswith('http'):
                    print(f"✅ Image uploadée !")
                    print(f"🔗 URL : {url}")
                    print(f"⏰ Permanent (anonyme)")
                    
                    return url
                else:
                    raise Exception(f"Réponse invalide : {url}")
        
        except Exception as e:
            print(f"⚠️  catbox.moe échoué : {e}")
            raise Exception(f"Erreur upload catbox : {e}")
    
    def upload_image_to_imgbb(self, image_path: str) -> str:
        """
        Upload vers imgbb.com (permanent avec API key gratuite).
        
        Args:
            image_path: Chemin de l'image
            
        Returns:
            URL publique
        """
        print(f"\n📤 Upload image vers imgbb.com...")
        print(f"   Fichier : {Path(image_path).name}")
        
        # API key gratuite imgbb (limitée mais fonctionne)
        api_key = "d2c0e68e352f999ffeafe1a0cc34ddd4"
        
        try:
            import base64
            
            with open(image_path, 'rb') as f:
                image_b64 = base64.b64encode(f.read()).decode('utf-8')
            
            data = {
                'key': api_key,
                'image': image_b64
            }
            
            response = requests.post(
                'https://api.imgbb.com/1/upload',
                data=data,
                timeout=60
            )
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('success'):
                url = result['data']['url']
                
                print(f"✅ Image uploadée !")
                print(f"🔗 URL : {url}")
                print(f"⏰ Permanent")
                
                return url
            else:
                raise Exception(f"Upload échoué : {result}")
        
        except Exception as e:
            print(f"⚠️  imgbb.com échoué : {e}")
            raise Exception(f"Erreur upload imgbb : {e}")
    
    def upload_image_with_fallback(self, image_path: str) -> str:
        """
        Upload avec fallback automatique sur plusieurs services.
        
        Essaie dans l'ordre (optimisé pour compatibilité API) :
        1. imgur.com (le plus fiable pour APIs externes)
        2. imgbb.com (bonne alternative)
        3. tmpfiles.org (7 jours)
        4. catbox.moe (parfois bloqué par APIs)
        5. 0x0.st (parfois bloqué)
        
        Args:
            image_path: Chemin de l'image
            
        Returns:
            URL publique
        """
        print("\n📤 UPLOAD IMAGE (avec fallback automatique)")
        print("="*70)
        
        # Service 1 : imgur.com (le MEILLEUR pour APIs)
        try:
            return self.upload_image_to_imgur(image_path)
        except Exception as e:
            print(f"⚠️  Service 1 échoué, essai service 2...")
        
        # Service 2 : imgbb.com (très bon aussi)
        try:
            return self.upload_image_to_imgbb(image_path)
        except Exception as e:
            print(f"⚠️  Service 2 échoué, essai service 3...")
        
        # Service 3 : tmpfiles.org
        try:
            return self.upload_image_to_tmpfiles(image_path)
        except Exception as e:
            print(f"⚠️  Service 3 échoué, essai service 4...")
        
        # Service 4 : catbox.moe
        try:
            return self.upload_image_to_catbox(image_path)
        except Exception as e:
            print(f"⚠️  Service 4 échoué, essai service 5...")
        
        # Service 5 : 0x0.st
        try:
            return self.upload_image_to_0x0(image_path)
        except Exception as e:
            print(f"⚠️  Service 5 échoué")
        
        # Si tous échouent
        print("\n" + "="*70)
        print("❌ TOUS LES SERVICES D'UPLOAD ONT ÉCHOUÉ")
        print("="*70)
        print("\n💡 Solutions alternatives :")
        print("\n1. Upload manuel sur imgur (RECOMMANDÉ pour PiAPI) :")
        print("   • Ouvrez https://imgur.com/upload")
        print("   • Uploadez le fichier :")
        print(f"     {image_path}")
        print("   • Clic droit sur l'image → 'Copy image address'")
        print("   • L'URL doit finir par .jpg ou .png")
        print()
        
        manual_url = input("Collez l'URL de votre image (ou Entrée pour annuler) : ").strip()
        
        if manual_url and manual_url.startswith('http'):
            print(f"✅ URL manuelle acceptée : {manual_url}")
            return manual_url
        
        raise Exception(
            "Impossible d'uploader l'image. "
            "Uploadez manuellement sur https://imgur.com/upload et relancez."
        )
    
    def upload_image_to_fileio(self, image_path: str) -> str:
        """
        Upload vers file.io (1 téléchargement).
        
        Args:
            image_path: Chemin de l'image
            
        Returns:
            URL publique
        """
        print(f"\n📤 Upload image vers file.io...")
        
        try:
            with open(image_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(
                    'https://file.io',
                    files=files,
                    timeout=60
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get('success'):
                    raise Exception(f"Upload échoué : {data.get('message')}")
                
                url = data['link']
                
                print(f"✅ Image uploadée !")
                print(f"🔗 URL : {url}")
                print(f"⚠️  ATTENTION : Expire après 1 téléchargement")
                
                return url
        
        except Exception as e:
            raise Exception(f"Erreur upload : {e}")


def test_utils():
    """Test des utilitaires."""
    
    print("\n" + "="*70)
    print("🧪 TEST DES UTILITAIRES VIDÉO")
    print("="*70)
    
    utils = VideoUtils()
    
    # Chercher une vidéo de test
    outputs_dir = Path("outputs")
    
    if not outputs_dir.exists():
        print("\n⚠️  Dossier outputs/ inexistant")
        print("💡 Créez d'abord une vidéo avec : python3 main.py")
        return
    
    videos = list(outputs_dir.glob("*.mp4"))
    
    if not videos:
        print("\n⚠️  Aucune vidéo dans outputs/")
        print("💡 Générez d'abord une vidéo avec l'option 1 du menu")
        return
    
    test_video = videos[0]
    
    print(f"\n📹 Vidéo de test : {test_video.name}")
    
    # Test durée
    print("\n" + "-"*70)
    print("TEST 1 : Récupération durée vidéo")
    print("-"*70)
    duration = utils.get_video_duration(str(test_video))
    print(f"✅ Durée détectée : {duration:.2f}s")
    
    # Test extraction frame
    print("\n" + "-"*70)
    print("TEST 2 : Extraction dernière frame")
    print("-"*70)
    
    temp_dir = Path("outputs/temp")
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    frame_path = temp_dir / "test_frame.jpg"
    
    try:
        utils.extract_last_frame(str(test_video), str(frame_path))
        
        # Vérifier que le fichier existe
        if frame_path.exists():
            file_size = frame_path.stat().st_size / 1024
            print(f"✅ Frame extraite avec succès !")
            print(f"📁 Emplacement : {frame_path}")
            print(f"📊 Taille : {file_size:.1f} KB")
            print(f"\n💡 La frame a été CONSERVÉE pour inspection")
            print(f"   Ouvrez-la avec : open {frame_path}")
        else:
            print(f"❌ Frame non créée")
    
    except Exception as e:
        print(f"❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
    
    # Test concat (si plusieurs vidéos)
    if len(videos) >= 2:
        print("\n" + "-"*70)
        print("TEST 3 : Concaténation de vidéos")
        print("-"*70)
        
        try:
            output_test = temp_dir / "test_concat.mp4"
            
            print(f"📹 Vidéo 1 : {videos[0].name}")
            print(f"📹 Vidéo 2 : {videos[1].name}")
            
            result = utils.concat_videos(
                [str(videos[0]), str(videos[1])],
                str(output_test)
            )
            
            if Path(result).exists():
                final_duration = utils.get_video_duration(result)
                file_size = Path(result).stat().st_size / (1024 * 1024)
                
                print(f"✅ Concaténation réussie !")
                print(f"📁 Fichier : {output_test}")
                print(f"⏱️  Durée : {final_duration:.2f}s")
                print(f"📊 Taille : {file_size:.2f} MB")
                print(f"\n💡 La vidéo concat a été CONSERVÉE")
                print(f"   Ouvrez-la avec : open {output_test}")
        
        except Exception as e:
            print(f"⚠️  Test concat échoué : {e}")
    
    print("\n" + "="*70)
    print("🎉 TESTS TERMINÉS")
    print("="*70)
    print(f"\n📂 Fichiers de test conservés dans : {temp_dir}/")
    print("   • test_frame.jpg (dernière frame extraite)")
    if len(videos) >= 2:
        print("   • test_concat.mp4 (vidéo concaténée)")
    print("\n💡 Pour nettoyer : rm -rf outputs/temp/")
    print()


if __name__ == "__main__":
    test_utils()
