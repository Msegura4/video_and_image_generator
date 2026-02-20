#!/usr/bin/env python3
"""
Test avec payload simplifié pour FLUX
"""
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("PIAPI_API_KEY")
print(f"🔑 Clé API trouvée : {api_key[:20]}...")

url = "https://api.piapi.ai/api/v1/task"

# Test 1: Payload minimal (comme dans le quickstart)
print("\n" + "="*70)
print("TEST 1: Payload minimal (prompt seulement)")
print("="*70)

payload1 = {
    "model": "Qubico/flux1-schnell",
    "task_type": "txt2img",
    "input": {
        "prompt": "a beautiful sunset over mountains"
    }
}

headers = {
    'X-API-Key': api_key,
    'Content-Type': 'application/json'
}

print(f"Payload: {json.dumps(payload1, indent=2)}\n")

try:
    response = requests.post(url, headers=headers, json=payload1, timeout=30)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"✅ Succès!")
        print(f"Task ID: {result.get('data', {}).get('task_id')}")
    else:
        print(f"❌ Erreur {response.status_code}")
        print(f"Réponse: {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")

# Test 2: Avec width et height
print("\n" + "="*70)
print("TEST 2: Avec width et height")
print("="*70)

payload2 = {
    "model": "Qubico/flux1-schnell",
    "task_type": "txt2img",
    "input": {
        "prompt": "a beautiful sunset over mountains",
        "width": 1024,
        "height": 1024
    }
}

print(f"Payload: {json.dumps(payload2, indent=2)}\n")

try:
    response = requests.post(url, headers=headers, json=payload2, timeout=30)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"✅ Succès!")
        print(f"Task ID: {result.get('data', {}).get('task_id')}")
    else:
        print(f"❌ Erreur {response.status_code}")
        print(f"Réponse: {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")
