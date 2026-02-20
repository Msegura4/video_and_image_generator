#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generateur d'images avec FLUX.1 via PiAPI
https://piapi.ai/flux-api

API Documentation: https://piapi.ai/docs/quickstart
Unified API Schema: https://api.piapi.ai/api/v1/task
"""
import os
import json
import time
import requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


class FluxImageGenerator:
    """Generateur d'images FLUX.1 via PiAPI."""

    def __init__(self):
        """Initialise le generateur FLUX."""
        self.api_key = os.getenv("PIAPI_API_KEY")
        if not self.api_key:
            raise ValueError("PIAPI_API_KEY non trouvee dans .env")

        self.base_url = "https://api.piapi.ai/api/v1"
        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }

        # Dossier pour sauvegarder les images
        self.output_dir = Path("outputs/images")
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Historique des prompts
        self.history_file = Path("outputs/images/prompt_history.json")
        self.last_prompt = self.load_last_prompt()

    def load_last_prompt(self):
        """Charge le dernier prompt utilise."""
        if self.history_file.exists():
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    history = json.load(f)
                    if history and len(history) > 0:
                        return history[-1].get('prompt', '')
            except Exception as e:
                print(f"Erreur lecture historique : {e}")
        return ""

    def save_to_history(self, prompt, image_path, model="flux-schnell"):
        """Sauvegarde un prompt dans l'historique."""
        history = []

        if self.history_file.exists():
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    history = json.load(f)
            except:
                history = []

        history.append({
            'timestamp': datetime.now().isoformat(),
            'prompt': prompt,
            'image_path': str(image_path),
            'model': model
        })

        # Garder seulement les 50 derniers
        history = history[-50:]

        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2, ensure_ascii=False)

        self.last_prompt = prompt

    def generate_image(self, prompt, model="flux-schnell", width=1024, height=1024):
        """
        Genere une image avec FLUX.1.

        Args:
            prompt: Description de l'image a generer
            model: Modele FLUX a utiliser (flux-pro, flux-dev, flux-schnell)
            width: Largeur de l'image
            height: Hauteur de l'image

        Returns:
            Path: Chemin vers l'image generee
        """
        print(f"\nGeneration de l'image avec {model}...")
        print(f"Prompt : {prompt[:100]}...")
        print(f"Cle API : {self.api_key[:20]}...")
        print(f"Endpoint : {self.base_url}/task")

        # Convertir le nom du modele au format PiAPI
        # Note: PiAPI supporte uniquement FLUX Schnell pour l'instant
        # FLUX Pro et FLUX Dev ne sont pas disponibles
        model_mapping = {
            "flux-pro": "Qubico/flux1-schnell",      # Pro non dispo -> utilise Schnell
            "flux-dev": "Qubico/flux1-schnell",      # Dev non dispo -> utilise Schnell
            "flux-schnell": "Qubico/flux1-schnell"   # Disponible
        }
        piapi_model = model_mapping.get(model, "Qubico/flux1-schnell")
        
        # Avertir si modele non disponible
        if model in ["flux-pro", "flux-dev"]:
            print(f"ATTENTION: {model} n'est pas disponible sur PiAPI")
            print(f"   -> Utilisation de flux-schnell a la place")

        # Payload pour l'API FLUX (Unified API Schema)
        # Documentation: https://piapi.ai/docs/api-reference/flux
        payload = {
            "model": piapi_model,
            "task_type": "txt2img",
            "input": {
                "prompt": prompt,
                "width": width,
                "height": height,
                "cfg_scale": 3.5  # Requis pour FLUX (range: 1.0-20.0, recommande: 3.5)
            }
        }

        # Debug: afficher le payload
        print(f"\nPayload envoye :")
        print(json.dumps(payload, indent=2))
        
        try:
            # Appel API pour creer la tache
            response = requests.post(
                f"{self.base_url}/task",
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            print(f"Status Code : {response.status_code}")
            print(f"Reponse : {response.text[:500]}")

            response.raise_for_status()
            result = response.json()

            # Verifier la structure de la reponse (Unified API Schema)
            if not result.get('data'):
                raise Exception(f"Reponse API invalide : {result}")

            task_id = result['data'].get('task_id')
            if not task_id:
                raise Exception(f"Pas de task_id dans la reponse : {result}")

            print(f"Tache creee : {task_id}")
            print("Generation en cours...")

            # Polling pour attendre le resultat
            max_attempts = 60
            for attempt in range(max_attempts):
                time.sleep(3)

                # Utiliser le meme endpoint /task avec GET et task_id
                status_response = requests.get(
                    f"{self.base_url}/task/{task_id}",
                    headers=self.headers,
                    timeout=30
                )

                status_response.raise_for_status()
                status_data = status_response.json()

                if not status_data.get('data'):
                    raise Exception(f"Reponse status invalide : {status_data}")

                task_status = status_data['data'].get('status')

                if task_status == 'completed':
                    # Recuperer l'URL de l'image depuis output
                    output = status_data['data'].get('output', {})

                    # L'image peut etre dans differents champs selon l'API
                    image_url = (output.get('image_url') or
                                output.get('url') or
                                output.get('image') or
                                (output.get('images', [None])[0] if output.get('images') else None))

                    if not image_url:
                        raise Exception(f"Pas d'URL d'image dans la reponse : {status_data}")

                    print(f"Image generee !")

                    # Telecharger l'image
                    image_path = self.download_image(image_url, prompt)

                    # Sauvegarder dans l'historique
                    self.save_to_history(prompt, image_path, model)

                    return image_path

                elif task_status == 'failed':
                    error_msg = status_data['data'].get('error', 'Generation echouee')
                    raise Exception(f"Generation echouee : {error_msg}")

                # Afficher la progression
                if attempt % 5 == 0:
                    print(f"Toujours en cours... ({attempt * 3}s)")

            raise Exception("Timeout : generation trop longue")

        except requests.exceptions.RequestException as e:
            raise Exception(f"Erreur reseau : {e}")
        except Exception as e:
            raise Exception(f"Erreur generation : {e}")

    def download_image(self, url, prompt):
        """Telecharge l'image depuis l'URL."""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            # Creer un nom de fichier base sur le timestamp et prompt
            timestamp = int(time.time())
            # Nettoyer le prompt pour le nom de fichier
            clean_prompt = "".join(c for c in prompt[:30] if c.isalnum() or c in (' ', '-', '_')).strip()
            clean_prompt = clean_prompt.replace(' ', '_')

            filename = f"flux_{clean_prompt}_{timestamp}.png"
            filepath = self.output_dir / filename

            with open(filepath, 'wb') as f:
                f.write(response.content)

            print(f"Image sauvegardee : {filepath}")
            return filepath

        except Exception as e:
            raise Exception(f"Erreur telechargement : {e}")

    def get_history(self, limit=10):
        """Recupere l'historique des prompts."""
        if not self.history_file.exists():
            return []

        try:
            with open(self.history_file, 'r', encoding='utf-8') as f:
                history = json.load(f)
                return history[-limit:]
        except:
            return []

    def interactive_generate(self):
        """Mode interactif de generation d'images."""
        print("\n" + "="*70)
        print("GENERATEUR D'IMAGES FLUX.1")
        print("="*70)
        print("\nCreez des images de haute qualite avec FLUX.1")
        print("   - Utilisez l'historique pour affiner vos prompts")
        print("   - Validez un prompt pour l'utiliser en image-to-video")
        print()

        while True:
            print("\n" + "-"*70)

            # Afficher le dernier prompt si disponible
            if self.last_prompt:
                print(f"Dernier prompt : {self.last_prompt[:80]}...")
                use_last = input("\nUtiliser ce prompt comme base ? (O/n) : ").strip().lower()

                if use_last != 'n':
                    print(f"\nModifier le prompt (laissez vide pour garder tel quel) :")
                    new_prompt = input(f"   {self.last_prompt}\n   -> ").strip()
                    prompt = new_prompt if new_prompt else self.last_prompt
                else:
                    prompt = input("\nNouveau prompt : ").strip()
            else:
                prompt = input("\nVotre prompt : ").strip()

            if not prompt:
                print("Prompt vide, annule")
                continue

            # Choix du modele
            print("\nModele FLUX :")
            print("  1. FLUX Schnell (rapide) - Disponible")
            print("  2. FLUX Dev (non disponible sur PiAPI)")
            print("  3. FLUX Pro (non disponible sur PiAPI)")
            print()
            print("  Info: PiAPI supporte uniquement FLUX Schnell actuellement")

            model_choice = input("\nChoix [1] : ").strip() or "1"
            models = {
                "1": "flux-schnell",
                "2": "flux-schnell",  # Dev non dispo, utilise Schnell
                "3": "flux-schnell"   # Pro non dispo, utilise Schnell
            }
            model = models.get(model_choice, "flux-schnell")

            # Taille de l'image
            print("\nTaille de l'image :")
            print("  1. 1024x1024 (carre)")
            print("  2. 1024x768 (paysage)")
            print("  3. 768x1024 (portrait)")

            size_choice = input("\nChoix [1] : ").strip() or "1"
            sizes = {
                "1": (1024, 1024),
                "2": (1024, 768),
                "3": (768, 1024)
            }
            width, height = sizes.get(size_choice, (1024, 1024))

            # Generation
            try:
                image_path = self.generate_image(prompt, model, width, height)
                print(f"\nImage disponible : {image_path}")

                # Proposer d'ouvrir l'image
                open_img = input("\nOuvrir l'image ? (o/N) : ").strip().lower()
                if open_img == 'o':
                    import subprocess
                    subprocess.run(["open", str(image_path)])

                # Proposer de valider pour image-to-video
                validate = input("\nValider ce prompt pour image-to-video ? (o/N) : ").strip().lower()
                if validate == 'o':
                    self.save_as_preset(prompt, image_path)

            except Exception as e:
                print(f"\nErreur : {e}")

            # Continuer ?
            continue_gen = input("\nGenerer une autre image ? (O/n) : ").strip().lower()
            if continue_gen == 'n':
                break

    def save_as_preset(self, prompt, image_path):
        """Sauvegarde un prompt comme preset pour image-to-video."""
        preset_file = Path("outputs/images/image_to_video_presets.json")

        presets = []
        if preset_file.exists():
            try:
                with open(preset_file, 'r', encoding='utf-8') as f:
                    presets = json.load(f)
            except:
                presets = []

        preset_name = input("Nom du preset : ").strip()
        if not preset_name:
            print("Nom vide, annule")
            return

        presets.append({
            'name': preset_name,
            'prompt': prompt,
            'image_path': str(image_path),
            'created_at': datetime.now().isoformat()
        })

        with open(preset_file, 'w', encoding='utf-8') as f:
            json.dump(presets, f, indent=2, ensure_ascii=False)

        print(f"Preset '{preset_name}' sauvegarde pour image-to-video")


if __name__ == "__main__":
    """Test du generateur."""
    try:
        generator = FluxImageGenerator()
        generator.interactive_generate()
    except Exception as e:
        print(f"Erreur : {e}")
