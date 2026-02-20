"""
Interface API Kling AI via PiAPI pour génération de vidéos.

PiAPI : Service tiers qui donne accès à Kling AI sans frais minimum
Documentation : https://piapi.ai/docs/kling-api
"""

import requests
import time
import json
import os
from typing import Optional, Dict, Any


class KlingAPI:
    """Client API pour Kling AI via PiAPI (pay-as-you-go)."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le client PiAPI pour Kling AI.
        
        Args:
            api_key: Clé API PiAPI. Si None, cherche PIAPI_API_KEY dans l'environnement.
        """
        # Chercher d'abord PIAPI_API_KEY, puis KLING_API_KEY (rétrocompatibilité)
        self.api_key = api_key or os.getenv("PIAPI_API_KEY") or os.getenv("KLING_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "❌ API Key PiAPI manquante !\n"
                "Configurez PIAPI_API_KEY dans .env ou passez-la au constructeur.\n"
                "Obtenez votre clé sur : https://piapi.ai\n"
                "Voir README.md pour les instructions complètes."
            )
        
        # Endpoints PiAPI
        self.base_url = "https://api.piapi.ai/api/v1"
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        print("✅ PiAPI (Kling AI) initialisé - Mode Pay-as-you-go")
    
    
    def generate_video(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        duration: int = 5,
        aspect_ratio: str = "16:9",
        mode: str = "professional",
        model_version: str = "2.5",
        image_url: Optional[str] = None,
        callback_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Génère une vidéo via PiAPI (Kling AI).
        
        Args:
            prompt: Description de la vidéo à générer
            negative_prompt: Éléments à éviter (optionnel avec PiAPI)
            duration: Durée en secondes (5 ou 10)
            aspect_ratio: Ratio d'aspect ("16:9", "9:16", "1:1")
            mode: Mode de génération ("professional" ou "standard")
            model_version: Version du modèle ("1.5", "1.6", "2.0", "2.1", "2.5")
            image_url: URL d'image pour image-to-video (optionnel)
            callback_url: URL pour webhook (optionnel)
        
        Returns:
            Dict contenant task_id et status
        """
        if duration not in [5, 10]:
            raise ValueError("Duration doit être 5 ou 10 secondes")
        
        endpoint = f"{self.base_url}/task"
        
        # Format PiAPI correct selon leur documentation
        payload = {
            "model": "kling",
            "task_type": "video_generation",
            "input": {
                "prompt": prompt,
                "negative_prompt": negative_prompt or "",
                "aspect_ratio": aspect_ratio,
                "duration": duration,  # INT
                "mode": "pro" if mode == "professional" else "std",  # "pro" ou "std"
                "version": model_version  # "1.5", "1.6", "2.0", "2.1", "2.5"
            }
        }
        
        # Image-to-video si image fournie
        if image_url:
            payload["input"]["image_url"] = image_url
        
        # Webhook si configuré
        if callback_url:
            payload["config"] = {
                "webhook_config": {
                    "endpoint": callback_url
                }
            }
        
        # Calculer le coût estimé
        cost = self._estimate_cost(duration, mode, model_version)
        
        print(f"🎬 Génération vidéo en cours...")
        print(f"📝 Prompt : {prompt[:100]}...")
        print(f"⚙️  Modèle : Kling {model_version} ({mode} mode)")
        print(f"💰 Coût estimé : ${cost:.2f}")
        
        try:
            response = requests.post(
                endpoint,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            
            if result.get("code") != 200:
                raise Exception(f"Erreur API : {result.get('message', 'Unknown error')}")
            
            data = result.get("data", {})
            task_id = data.get("task_id")
            
            print(f"✅ Tâche créée : {task_id}")
            return data
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur API : {e}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_detail = e.response.json()
                    print(f"Détails : {error_detail}")
                except:
                    print(f"Détails : {e.response.text}")
            raise
    
    
    def _estimate_cost(self, duration: int, mode: str, model_version: str) -> float:
        """
        Estime le coût d'une génération.
        
        Tarifs PiAPI (Pay-as-you-go) :
        - Kling 2.5 Pro : $0.33 (5s), $0.66 (10s)
        - Kling 1.6/2.1 Pro : $0.46 (5s), $0.92 (10s)
        - Kling 1.6/2.1 Std : $0.26 (5s), $0.52 (10s)
        """
        if model_version == "2.5":
            return 0.33 if duration == 5 else 0.66
        
        elif mode == "professional":
            return 0.46 if duration == 5 else 0.92
        
        else:  # standard
            return 0.26 if duration == 5 else 0.52
    
    
    def check_status(self, task_id: str) -> Dict[str, Any]:
        """
        Vérifie le statut d'une tâche de génération.
        
        Args:
            task_id: ID de la tâche
        
        Returns:
            Dict avec status et url de la vidéo si terminé
        """
        endpoint = f"{self.base_url}/task/{task_id}"
        
        try:
            response = requests.get(endpoint, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get("code") != 200:
                raise Exception(f"Erreur API : {result.get('message', 'Unknown error')}")
            
            return result.get("data", {})
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur lors de la vérification : {e}")
            raise
    
    
    def wait_for_completion(
        self,
        task_id: str,
        max_wait: int = 300,
        poll_interval: int = 10
    ) -> Dict[str, Any]:
        """
        Attend la fin de génération d'une vidéo.
        
        Args:
            task_id: ID de la tâche
            max_wait: Temps d'attente maximum en secondes
            poll_interval: Intervalle entre les vérifications
        
        Returns:
            Dict avec les infos de la vidéo générée
        """
        print(f"⏳ Attente de la génération (max {max_wait}s)...")
        
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            status_data = self.check_status(task_id)
            
            state = status_data.get("status", "unknown")
            
            if state == "completed":
                print("✅ Vidéo générée avec succès !")
                return status_data
            
            elif state == "failed":
                error = status_data.get("error", {})
                error_msg = error.get("message", "Unknown error")
                raise Exception(f"❌ Génération échouée : {error_msg}")
            
            elif state in ["processing", "queued", "pending", ""]:
                elapsed = int(time.time() - start_time)
                print(f"⏳ En cours... ({elapsed}s écoulées, statut: {state or 'pending'})")
                time.sleep(poll_interval)
            
            else:
                print(f"⚠️ Statut inconnu : {state}")
                time.sleep(poll_interval)
        
        raise TimeoutError(f"⏰ Timeout après {max_wait}s")
    
    
    def download_video(self, video_data: Dict[str, Any], output_path: str) -> str:
        """
        Télécharge une vidéo générée.
        
        Args:
            video_data: Données de la vidéo depuis check_status
            output_path: Chemin de sauvegarde
        
        Returns:
            Chemin du fichier téléchargé
        """
        # Extraire l'URL de la vidéo depuis la structure PiAPI
        # Structure: output.works[0].video.resource ou resource_without_watermark
        output = video_data.get("output", {})
        works = output.get("works", [])
        
        if not works or len(works) == 0:
            raise Exception("❌ Aucune vidéo trouvée dans la réponse")
        
        video_info = works[0].get("video", {})
        
        # Essayer sans watermark d'abord, puis avec watermark
        video_url = video_info.get("resource_without_watermark") or video_info.get("resource")
        
        if not video_url:
            raise Exception("❌ URL vidéo introuvable dans la réponse")
        
        print(f"📥 Téléchargement de la vidéo...")
        
        try:
            response = requests.get(video_url, stream=True, timeout=60)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            file_size = os.path.getsize(output_path) / (1024 * 1024)
            print(f"✅ Vidéo sauvegardée : {output_path} ({file_size:.2f} MB)")
            
            return output_path
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur de téléchargement : {e}")
            raise
    
    
    def get_account_info(self) -> Dict[str, Any]:
        """
        Récupère les infos du compte PiAPI (balance, crédits).
        
        Note: PiAPI n'a pas d'endpoint public pour vérifier la balance via API.
        Vérifiez votre balance sur le workspace PiAPI.
        
        Returns:
            Dict vide (feature non disponible)
        """
        print("💡 PiAPI n'a pas d'endpoint API pour vérifier la balance")
        print("📊 Vérifiez votre balance sur : https://piapi.ai/workspace/billing")
        print("   Ou sur le Dashboard : https://piapi.ai/workspace")
        
        return {}


# Fonction helper pour génération complète en une fois
def generate_video_complete(
    prompt: str,
    api_key: Optional[str] = None,
    output_dir: str = "outputs",
    duration: int = 5,
    model_version: str = "2.5",
    **kwargs
) -> str:
    """
    Génère une vidéo de A à Z (création + attente + téléchargement).
    
    Args:
        prompt: Description de la vidéo
        api_key: Clé API PiAPI
        output_dir: Dossier de sortie
        duration: Durée en secondes
        model_version: Version Kling ("1.6", "2.1", "2.5")
        **kwargs: Autres paramètres pour generate_video()
    
    Returns:
        Chemin du fichier vidéo généré
    """
    # Créer le client
    client = KlingAPI(api_key)
    
    # Créer le dossier de sortie
    os.makedirs(output_dir, exist_ok=True)
    
    # Générer
    result = client.generate_video(
        prompt, 
        duration=duration,
        model_version=model_version,
        **kwargs
    )
    task_id = result.get("task_id")
    
    # Attendre
    completed = client.wait_for_completion(task_id)
    
    # Nom de fichier basé sur le timestamp
    timestamp = int(time.time())
    output_path = os.path.join(output_dir, f"video_{timestamp}.mp4")
    
    return client.download_video(completed, output_path)


if __name__ == "__main__":
    # Test rapide
    print("🧪 Test du module Kling API\n")
    
    try:
        client = KlingAPI()
        client.get_account_info()
        print("\n✅ Connexion réussie !")
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        print("\n💡 Assurez-vous d'avoir configuré votre KLING_API_KEY")
