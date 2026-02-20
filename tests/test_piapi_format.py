#!/usr/bin/env python3
"""
Test minimal PiAPI Kling - Pour debugger le format exact
"""

import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("PIAPI_API_KEY")

# Test 1: Format selon la doc PiAPI
payload1 = {
    "model": "kling",
    "task_type": "video_generation",
    "input": {
        "prompt": "A cat walking",
        "negative_prompt": "",
        "duration": 5,
        "aspect_ratio": "16:9",
        "mode": "std",  # ou "pro"
        "version": "2.5"  # ou "1.6", "2.1"
    }
}

print("=" * 70)
print("TEST 1 : Format basique")
print("=" * 70)
print(json.dumps(payload1, indent=2))

response = requests.post(
    "https://api.piapi.ai/api/v1/task",
    headers={
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    },
    json=payload1
)

print(f"\nStatut: {response.status_code}")
print(f"Réponse:")
print(json.dumps(response.json(), indent=2))

if response.status_code != 200:
    print("\n" + "=" * 70)
    print("ERREUR - Essayons un autre format")
    print("=" * 70)
    
    # Test 2: Sans version
    payload2 = {
        "model": "kling",
        "task_type": "video_generation",
        "input": {
            "prompt": "A cat walking",
            "duration": 5,
            "aspect_ratio": "16:9",
            "mode": "std"
        }
    }
    
    print(json.dumps(payload2, indent=2))
    
    response2 = requests.post(
        "https://api.piapi.ai/api/v1/task",
        headers={
            "x-api-key": API_KEY,
            "Content-Type": "application/json"
        },
        json=payload2
    )
    
    print(f"\nStatut: {response2.status_code}")
    print(f"Réponse:")
    print(json.dumps(response2.json(), indent=2))
