import time
import requests
import sys
from pathlib import Path
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import PIAPI_API_KEY, PIAPI_BASE_URL


class Agent:
    """Classe de base pour tous les générateurs PiAPI.

    Fournit le client HTTP partagé et les méthodes communes :
    création de tâche, polling de statut, téléchargement de fichier.
    """

    def __init__(self):
        if not PIAPI_API_KEY:
            raise ValueError("PIAPI_API_KEY manquante dans .env")

        self.api_key = PIAPI_API_KEY
        self.base_url = PIAPI_BASE_URL
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    def _post_task(self, payload: Dict[str, Any]) -> str:
        """Envoie une tâche à PiAPI et retourne le task_id."""
        response = requests.post(
            f"{self.base_url}/task",
            headers=self.headers,
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()

        if result.get("code") != 200:
            raise Exception(f"Erreur PiAPI : {result.get('message', 'Unknown error')}")

        task_id = result.get("data", {}).get("task_id")
        if not task_id:
            raise Exception(f"Pas de task_id dans la réponse : {result}")

        return task_id

    def _poll_status(self, task_id: str, max_wait: int = 300, poll_interval: int = 10) -> Dict[str, Any]:
        """Attend la fin d'une tâche par polling et retourne les données complètes."""
        start_time = time.time()

        while time.time() - start_time < max_wait:
            response = requests.get(
                f"{self.base_url}/task/{task_id}",
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()
            result = response.json()

            if result.get("code") != 200:
                raise Exception(f"Erreur PiAPI : {result.get('message', 'Unknown error')}")

            data = result.get("data", {})
            state = data.get("status", "unknown")

            if state == "completed":
                return data

            if state == "failed":
                error_msg = data.get("error", {}).get("message", "Unknown error")
                raise Exception(f"Tâche échouée : {error_msg}")

            elapsed = int(time.time() - start_time)
            print(f"En cours... ({elapsed}s, statut: {state or 'pending'})")
            time.sleep(poll_interval)

        raise TimeoutError(f"Timeout après {max_wait}s")

    def _download_file(self, url: str, output_path: str) -> str:
        """Télécharge un fichier depuis une URL et le sauvegarde."""
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()

        with open(output_path, "wb") as file_handle:
            for chunk in response.iter_content(chunk_size=8192):
                file_handle.write(chunk)

        file_size_mb = Path(output_path).stat().st_size / (1024 * 1024)
        print(f"Fichier sauvegardé : {output_path} ({file_size_mb:.2f} MB)")

        return output_path
