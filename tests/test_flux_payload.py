#!/usr/bin/env python3
"""
Test du format payload FLUX pour PiAPI
"""
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("PIAPI_API_KEY")
print(f"🔑 Clé API : {api_key[:20]}...")

# Payload corrigé avec cfg_scale
payload = {
    "model": "Qubico/flux1-schnell",  # Le plus rapide pour test
    "task_type": "txt2img",
    "input": {
        "prompt": "a simple test image of a red apple",
        "width": 1024,
        "height": 1024,
        "cfg_scale": 3.5  # REQUIS pour FLUX
    }
}

print("\n📦 Payload envoyé :")
print(json.dumps(payload, indent=2))
print("\n⏳ Envoi de la requête...\n")

try:
    response = requests.post(
        "https://api.piapi.ai/api/v1/task",
        headers={
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        },
        json=payload,
        timeout=30
    )

    print(f"📊 Status Code : {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"✅ Succès ! Réponse :")
        print(json.dumps(result, indent=2))

        if result.get('data', {}).get('task_id'):
            print(f"\n✅ Task ID reçu : {result['data']['task_id']}")
            print(f"✅ Le format payload FLUX est correct !")
    else:
        print(f"❌ Erreur HTTP {response.status_code}")
        print(f"Réponse : {response.text}")

except Exception as e:
    print(f"❌ Erreur : {e}")
