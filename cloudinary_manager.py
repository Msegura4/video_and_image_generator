#!/usr/bin/env python3
"""
Gestionnaire Cloudinary pour stockage et galerie des créations.
Organisé par type de création avec métadonnées.
"""

import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()


class CloudinaryManager:
    """Gestionnaire de stockage Cloudinary pour Rose Panama."""
    
    def __init__(self):
        """Initialise la connexion Cloudinary."""
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET")
        )
        
        # Dossiers par type de création
        self.folders = {
            "video_generated": "rose-panama/videos/generated",
            "video_image_to_video": "rose-panama/videos/image-to-video",
            "video_extended": "rose-panama/videos/extended",
            "image_flux": "rose-panama/images/flux"
        }
    
    
    # ==================== UPLOAD ====================
    
    def upload_video(self, file_path: str, creation_type: str, metadata: dict = None) -> dict:
        """
        Upload une vidéo vers Cloudinary.
        
        Args:
            file_path: Chemin local de la vidéo
            creation_type: Type (generated, image_to_video, extended)
            metadata: Métadonnées additionnelles
        
        Returns:
            dict: Informations du fichier uploadé
        """
        folder = self.folders.get(f"video_{creation_type}", self.folders["video_generated"])
        
        # Construire les métadonnées
        context = {
            "creation_type": creation_type,
            "created_at": datetime.now().isoformat(),
        }
        
        if metadata:
            context.update(metadata)
        
        # Upload
        result = cloudinary.uploader.upload(
            file_path,
            resource_type="video",
            folder=folder,
            context=context,
            tags=[creation_type, "rose-panama"]
        )
        
        return {
            "public_id": result["public_id"],
            "url": result["secure_url"],
            "format": result["format"],
            "duration": result.get("duration", 0),
            "size": result["bytes"],
            "created_at": result["created_at"]
        }
    
    
    def upload_image(self, file_path: str, metadata: dict = None) -> dict:
        """
        Upload une image FLUX vers Cloudinary.
        
        Args:
            file_path: Chemin local de l'image
            metadata: Métadonnées (prompt, model, etc.)
        
        Returns:
            dict: Informations du fichier uploadé
        """
        folder = self.folders["image_flux"]
        
        # Métadonnées
        context = {
            "creation_type": "flux_image",
            "created_at": datetime.now().isoformat(),
        }
        
        if metadata:
            context.update(metadata)
        
        # Upload
        result = cloudinary.uploader.upload(
            file_path,
            resource_type="image",
            folder=folder,
            context=context,
            tags=["flux", "rose-panama"]
        )
        
        return {
            "public_id": result["public_id"],
            "url": result["secure_url"],
            "format": result["format"],
            "width": result["width"],
            "height": result["height"],
            "size": result["bytes"],
            "created_at": result["created_at"]
        }
    
    
    # ==================== LISTING ====================
    
    def list_videos(self, creation_type: Optional[str] = None, limit: int = 50) -> List[dict]:
        """
        Liste les vidéos stockées.
        
        Args:
            creation_type: Filtrer par type (None = tous)
            limit: Nombre maximum de résultats
        
        Returns:
            Liste de vidéos avec métadonnées
        """
        try:
            # Déterminer le dossier
            if creation_type:
                folder = self.folders.get(f"video_{creation_type}")
                if not folder:
                    return []
            else:
                folder = "rose-panama/videos"
            
            # Récupérer les vidéos
            result = cloudinary.api.resources(
                type="upload",
                resource_type="video",
                prefix=folder,
                max_results=limit,
                context=True
            )
            
            # Formatter les résultats
            videos = []
            for resource in result.get("resources", []):
                video_info = {
                    "public_id": resource["public_id"],
                    "url": resource["secure_url"],
                    "format": resource["format"],
                    "duration": resource.get("duration", 0),
                    "size": resource["bytes"],
                    "created_at": resource["created_at"],
                    "filename": resource["public_id"].split("/")[-1]
                }
                
                # Ajouter le contexte/métadonnées
                if "context" in resource:
                    video_info["metadata"] = resource["context"].get("custom", {})
                
                videos.append(video_info)
            
            return videos
        
        except Exception as e:
            print(f"Erreur listing vidéos : {e}")
            return []
    
    
    def list_images(self, limit: int = 50) -> List[dict]:
        """
        Liste les images FLUX stockées.
        
        Args:
            limit: Nombre maximum de résultats
        
        Returns:
            Liste d'images avec métadonnées
        """
        try:
            folder = self.folders["image_flux"]
            
            result = cloudinary.api.resources(
                type="upload",
                resource_type="image",
                prefix=folder,
                max_results=limit,
                context=True
            )
            
            images = []
            for resource in result.get("resources", []):
                image_info = {
                    "public_id": resource["public_id"],
                    "url": resource["secure_url"],
                    "thumbnail": cloudinary.CloudinaryImage(resource["public_id"]).build_url(
                        width=300,
                        height=300,
                        crop="fill"
                    ),
                    "format": resource["format"],
                    "width": resource["width"],
                    "height": resource["height"],
                    "size": resource["bytes"],
                    "created_at": resource["created_at"],
                    "filename": resource["public_id"].split("/")[-1]
                }
                
                # Métadonnées
                if "context" in resource:
                    image_info["metadata"] = resource["context"].get("custom", {})
                
                images.append(image_info)
            
            return images
        
        except Exception as e:
            print(f"Erreur listing images : {e}")
            return []
    
    
    # ==================== DOWNLOAD ====================
    
    def download_file(self, public_id: str, local_path: str, resource_type: str = "video") -> str:
        """
        Télécharge un fichier depuis Cloudinary.
        
        Args:
            public_id: ID public Cloudinary
            local_path: Chemin local de destination
            resource_type: Type (video ou image)
        
        Returns:
            Chemin du fichier téléchargé
        """
        import requests
        
        # Construire l'URL
        if resource_type == "video":
            url = cloudinary.CloudinaryVideo(public_id).build_url()
        else:
            url = cloudinary.CloudinaryImage(public_id).build_url()
        
        # Télécharger
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        # Sauvegarder
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return local_path
    
    
    # ==================== DELETE ====================
    
    def delete_file(self, public_id: str, resource_type: str = "video") -> bool:
        """
        Supprime un fichier de Cloudinary.
        
        Args:
            public_id: ID public du fichier
            resource_type: Type (video ou image)
        
        Returns:
            True si succès
        """
        try:
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type=resource_type
            )
            return result.get("result") == "ok"
        
        except Exception as e:
            print(f"Erreur suppression : {e}")
            return False
    
    
    # ==================== STATS ====================
    
    def get_storage_stats(self) -> dict:
        """
        Récupère les statistiques de stockage.
        
        Returns:
            dict: Stats (nombre de fichiers, taille totale, etc.)
        """
        try:
            # Stats globales
            usage = cloudinary.api.usage()
            
            # Compter par type
            videos_generated = len(self.list_videos("generated"))
            videos_i2v = len(self.list_videos("image_to_video"))
            videos_extended = len(self.list_videos("extended"))
            images = len(self.list_images())
            
            return {
                "total_transformations": usage.get("transformations", {}).get("usage", 0),
                "storage_used_mb": usage.get("storage", {}).get("usage", 0) / (1024 * 1024),
                "bandwidth_used_mb": usage.get("bandwidth", {}).get("usage", 0) / (1024 * 1024),
                "videos_generated": videos_generated,
                "videos_image_to_video": videos_i2v,
                "videos_extended": videos_extended,
                "images_flux": images,
                "total_creations": videos_generated + videos_i2v + videos_extended + images
            }
        
        except Exception as e:
            print(f"Erreur stats : {e}")
            return {}


# ==================== HELPERS ====================

def format_file_size(bytes: int) -> str:
    """Formate la taille en MB/GB."""
    mb = bytes / (1024 * 1024)
    if mb < 1024:
        return f"{mb:.2f} MB"
    else:
        gb = mb / 1024
        return f"{gb:.2f} GB"


def format_duration(seconds: float) -> str:
    """Formate la durée en mm:ss."""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


# ==================== TEST ====================

if __name__ == "__main__":
    """Test du gestionnaire Cloudinary."""
    
    print("\n" + "="*70)
    print("🧪 TEST CLOUDINARY MANAGER")
    print("="*70)
    
    try:
        manager = CloudinaryManager()
        print("✅ Connexion Cloudinary réussie")
        
        # Test listing
        print("\n📹 Listing vidéos...")
        videos = manager.list_videos(limit=5)
        print(f"   Trouvé {len(videos)} vidéo(s)")
        
        print("\n🖼️ Listing images...")
        images = manager.list_images(limit=5)
        print(f"   Trouvé {len(images)} image(s)")
        
        # Stats
        print("\n📊 Statistiques...")
        stats = manager.get_storage_stats()
        if stats:
            print(f"   Stockage utilisé : {stats.get('storage_used_mb', 0):.2f} MB")
            print(f"   Créations totales : {stats.get('total_creations', 0)}")
        
        print("\n✅ Tous les tests passés !")
    
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
