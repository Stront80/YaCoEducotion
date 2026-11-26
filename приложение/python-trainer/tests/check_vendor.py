"""Проверяет целостность локальных файлов по зафиксированному manifest.json."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "vendor"
manifest = json.loads((root / "manifest.json").read_text())
for name, meta in manifest["files"].items():
    data = (root / "pyodide" / name).read_bytes()
    assert len(data) == meta["bytes"], name
    assert hashlib.sha256(data).hexdigest() == meta["sha256"], name
for name, meta in manifest["notices"].items():
    data = (root / name).read_bytes()
    assert len(data) == meta["bytes"], name
    assert hashlib.sha256(data).hexdigest() == meta["sha256"], name
print("Pyodide 314.0.8: 6 файлов среды и 2 лицензии, размеры/SHA-256 — OK")
