#!/usr/bin/env python3
"""
Test rapide de l'endpoint FLUX avec le Unified API Schema de PiAPI
"""
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("PIAPI_API_KEY")
print(f"🔑 Clé API trouvée : {api_key[:20]}...")

# Configuration selon la documentation PiAPI
url = "https://api.piapi.ai/api/v1/task"

payload = {
    "model": "Qubico/flux1-schnell",  # Modèle le plus rapide pour test
    "task_type": "txt2img",
    "input": {
        "prompt": "a simple test image of a cat"
    }
}

headers = {
    'X-API-Key': api_key,
    'Content-Type': 'application/json'
}

print(f"\n🔍 Test de l'endpoint : {url}")
print(f"📦 Payload : {json.dumps(payload, indent=2)}")
print(f"\n⏳ Envoi de la requête...\n")

try:
    response = requests.post(url, headers=headers, json=payload, timeout=30)

    print(f"📊 Status Code : {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"✅ Succès ! Réponse :")
        print(json.dumps(result, indent=2))

        if result.get('data', {}).get('task_id'):
            print(f"\n✅ Task ID reçu : {result['data']['task_id']}")
            print(f"✅ L'API FLUX fonctionne correctement !")
    else:
        print(f"❌ Erreur HTTP {response.status_code}")
        print(f"Réponse : {response.text}")

except Exception as e:
    print(f"❌ Erreur : {e}")
