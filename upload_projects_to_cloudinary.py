"""
Script one-shot : uploade projects.json local vers Cloudinary.
Usage : python upload_projects_to_cloudinary.py
"""
import json, base64, os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

projects_file = Path(__file__).resolve().parent / "projects.json"
if not projects_file.exists():
    print("❌ projects.json introuvable")
    exit(1)

data = json.loads(projects_file.read_text(encoding="utf-8"))
nb = len(data.get("projects", {}))
print(f"📁 {nb} projet(s) trouvé(s) : {list(data['projects'].keys())}")

json_bytes = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
b64 = base64.b64encode(json_bytes).decode("utf-8")

result = cloudinary.uploader.upload(
    f"data:application/json;base64,{b64}",
    resource_type="raw",
    public_id="rose-panama/projects-db",
    overwrite=True,
    invalidate=True,
)

print(f"✅ Uploadé sur Cloudinary : {result['secure_url']}")
