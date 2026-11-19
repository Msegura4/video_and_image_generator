#!/usr/bin/env python3
"""
Lance l'environnement de développement local :
  - crée/active le venv Python si absent
  - installe les dépendances Python (api/requirements.txt)
  - installe les dépendances npm (react-app/) si absent
  - crée un .env template si absent
  - restaure les fichiers code manquants (git restore)
  - démarre le backend FastAPI + le frontend Vite en parallèle
"""

import os
import sys
import shutil
import subprocess
import signal
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV_DIR = ROOT / "env"
VENV_PYTHON = VENV_DIR / "bin" / "python"
VENV_PIP = VENV_DIR / "bin" / "pip"
API_DIR = ROOT / "api"
REACT_DIR = ROOT / "react-app"
ENV_FILE = ROOT / ".env"

ENV_TEMPLATE = """\
# ── Cloudinary ──────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── PiAPI (génération vidéo Kling) ──────────
PIAPI_API_KEY=

# ── CORS (séparés par virgule) ───────────────
ALLOWED_ORIGINS=http://localhost:5173
"""


def run(cmd, cwd=None, check=True):
    print(f"  → {' '.join(str(c) for c in cmd)}")
    return subprocess.run(cmd, cwd=cwd, check=check)


def step(label):
    print(f"\n{'─'*50}\n{label}\n{'─'*50}")


# ── 1. Venv ──────────────────────────────────────────
step("1. Environnement virtuel Python")
if not VENV_PYTHON.exists():
    print("Création du venv...")
    run([sys.executable, "-m", "venv", str(VENV_DIR)])
    print("Venv créé.")
else:
    print("Venv déjà présent.")


# ── 2. Dépendances Python ────────────────────────────
step("2. Dépendances Python")
requirements_file = API_DIR / "requirements.txt"
run([str(VENV_PIP), "install", "--upgrade", "pip", "-q"])
run([str(VENV_PIP), "install", "-r", str(requirements_file), "-q"])
print("Dépendances Python installées.")


# ── 3. .env ──────────────────────────────────────────
step("3. Fichier .env")
if not ENV_FILE.exists():
    ENV_FILE.write_text(ENV_TEMPLATE)
    print(f".env créé à {ENV_FILE}")
    print("⚠️  Remplis les valeurs avant de lancer l'API.")
else:
    print(".env déjà présent.")


# ── 4. Fichiers code manquants (git restore) ─────────
step("4. Restauration des fichiers code manquants")
git_exe = shutil.which("git")
if git_exe:
    result = subprocess.run(
        [git_exe, "ls-files", "--deleted"],
        cwd=ROOT, capture_output=True, text=True
    )
    deleted_files = [f for f in result.stdout.splitlines()
                     if f.endswith(".py") or f.endswith(".json") or f.endswith(".txt")]
    if deleted_files:
        print(f"{len(deleted_files)} fichiers code manquants, restauration...")
        run([git_exe, "restore"] + deleted_files, cwd=ROOT)
        print("Fichiers restaurés.")
    else:
        print("Aucun fichier code manquant.")
else:
    print("git non trouvé, étape ignorée.")


# ── 5. Dépendances npm ───────────────────────────────
step("5. Dépendances npm (React)")
vite_bin = REACT_DIR / "node_modules" / ".bin" / "vite"
npm_exe = shutil.which("npm")
if not npm_exe:
    print("❌ npm non trouvé. Installe Node.js.")
    sys.exit(1)
if not vite_bin.exists():
    print("Installation des packages npm...")
    run([npm_exe, "install"], cwd=REACT_DIR)
    print("npm installé.")
else:
    print("node_modules déjà présent.")


# ── 6. Lancement des serveurs ────────────────────────
step("6. Démarrage des serveurs")

backend_proc = subprocess.Popen(
    [str(VENV_PYTHON), "-m", "uvicorn", "app:app",
     "--host", "127.0.0.1", "--port", "8000", "--reload"],
    cwd=API_DIR,
    env={**os.environ, "PYTHONPATH": str(ROOT)},
)

frontend_proc = subprocess.Popen(
    [npm_exe, "run", "dev"],
    cwd=REACT_DIR,
)

print("\n✅  Serveurs démarrés :")
print("   Backend  → http://localhost:8000")
print("   Frontend → http://localhost:5173")
print("\nCtrl+C pour tout arrêter.\n")


def shutdown(sig, frame):
    print("\nArrêt des serveurs...")
    backend_proc.terminate()
    frontend_proc.terminate()
    backend_proc.wait()
    frontend_proc.wait()
    print("Arrêté.")
    sys.exit(0)


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

backend_proc.wait()
