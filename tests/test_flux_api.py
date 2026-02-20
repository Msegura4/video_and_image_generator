#!/usr/bin/env python3
"""
Script de test pour identifier le bon endpoint FLUX de PiAPI
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("PIAPI_API_KEY")
print(f"🔑 Clé API trouvée : {api_key[:20]}...")

# Test différents endpoints possibles
endpoints = [
    "https://api.piapi.ai/api/v1/flux/txt2img",
    "https://api.piapi.ai/api/flux/txt2img",
    "https://api.piapi.ai/v1/flux/generate",
    "https://api.piapi.ai/flux/generate",
    "https://api.piapi.ai/api/v1/flux",
    "https://api.piapi.ai/api/flux",
]

headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}

payload = {
    "model": "flux-schnell",
    "prompt": "test image",
    "image_size": {
        "width": 512,
        "height": 512
    }
}

print("\n🔍 Test des endpoints...\n")

for endpoint in endpoints:
    print(f"Testing: {endpoint}")
    try:
        response = requests.post(
            endpoint,
            headers=headers,
            json=payload,
            timeout=10
        )

        print(f"  Status: {response.status_code}")

        if response.status_code != 404:
            print(f"  ✅ Endpoint trouvé !")
            print(f"  Response: {response.text[:200]}")
            break
        else:
            print(f"  ❌ 404")

    except Exception as e:
        print(f"  ❌ Erreur : {e}")

    print()
