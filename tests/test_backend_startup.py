import importlib
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))


def test_backend_requirements_include_certifi():
    requirements_path = Path(__file__).resolve().parents[1] / "backend" / "requirements.txt"
    requirements = requirements_path.read_text(encoding="utf-8")

    assert "certifi" in requirements


def test_server_starts_without_mongo_env(monkeypatch):
    monkeypatch.delenv("MONGO_URL", raising=False)
    monkeypatch.delenv("DB_NAME", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    sys.modules.pop("server", None)
    server = importlib.import_module("server")

    client = TestClient(server.app)
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
