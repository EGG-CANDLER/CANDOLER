"""Two focused tests: /api/analyze (merged save) and /api/logs (filters).

Supabase (Postgres + Storage) and YOLO are mocked so these run without
network access or the heavy ultralytics/torch stack.
"""

import base64
import io

import jwt as pyjwt
import pytest
from PIL import Image

import app as app_module

TEST_SECRET = "unit-test-secret"


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(app_module, "SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setattr(app_module, "SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setattr(app_module, "SUPABASE_SERVICE_KEY", "service-key")
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client()


def _auth(user_id: str = "user-1") -> dict:
    token = pyjwt.encode(
        {"sub": user_id, "email": "u@example.com"}, TEST_SECRET, algorithm="HS256"
    )
    return {"Authorization": f"Bearer {token}"}


def _image_b64(width: int = 128, height: int = 128, brightness: int = 200) -> str:
    image = Image.new("RGB", (width, height), (brightness, brightness, brightness))
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


class _Resp:
    def __init__(self, payload, headers=None, status: int = 200):
        self._payload = payload
        self.headers = headers or {}
        self.status_code = status

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


def test_analyze_requires_auth_and_merges_save(client, monkeypatch):
    # 1) No bearer token -> 401
    assert client.post("/api/analyze", json={}).status_code == 401

    # 2) Mock the model prediction
    monkeypatch.setattr(app_module, "model_is_ready", lambda: True)
    monkeypatch.setattr(
        app_module,
        "_predict_from_bytes",
        lambda b: {
            "predicted_day": "Day 14",
            "raw_predicted_day": "Day 14",
            "development_stage": "Mid Embryonic Development",
            "confidence": 91.23,
            "low_confidence": False,
            "status": "Prediction successful",
            "top_predictions": [
                {"day": "Day 14", "confidence": 91.23},
                {"day": "Day 13", "confidence": 4.1},
                {"day": "Day 15", "confidence": 2.05},
            ],
        },
    )

    calls = {"upload": 0, "insert": 0}

    def fake_post(url, **kwargs):
        if "/storage/" in url:
            calls["upload"] += 1
            return _Resp({})
        if "/rest/v1/egg_scans" in url:
            calls["insert"] += 1
            row = kwargs["json"]
            return _Resp([{**row, "id": 7, "created_at": "2026-10-08T12:00:00+00:00"}])
        raise AssertionError(f"unexpected POST {url}")

    monkeypatch.setattr(app_module.requests, "post", fake_post)

    resp = client.post("/api/analyze", json={"image": _image_b64()}, headers=_auth())
    assert resp.status_code == 200
    data = resp.get_json()

    assert data["success"] is True
    assert data["predicted_day"] == "Day 14"
    assert data["stage"] == "Mid Embryonic Development"
    assert data["confidence"] == pytest.approx(91.23)
    assert data["low_confidence"] is False
    assert data["warnings"] == []
    assert data["image_url"].startswith("https://test.supabase.co/storage/")
    # The merged endpoint uploaded the image AND inserted exactly one row.
    assert calls == {"upload": 1, "insert": 1}


def test_logs_filters_and_response_shape(client, monkeypatch):
    rows = [
        {
            "id": 3,
            "image_url": "https://x/storage/v1/object/public/egg-images/Day_9/a.jpg",
            "predicted_day": "Day 9",
            "stage": "Embryonic Development",
            "confidence": 88.0,
            "top_predictions": [{"day": "Day 9", "confidence": 88.0}],
            "low_confidence": False,
            "warning": None,
            "is_archived": False,
            "created_at": "2026-10-07T09:15:00+00:00",
        }
    ]

    def fake_get(url, **kwargs):
        params = dict(kwargs.get("params") or [])
        # day + date filters must reach PostgREST
        assert params.get("predicted_day") == 'eq."Day 9"'
        assert "created_at.gte.2026-10-07" in params.get("and", "")
        assert "created_at.lt.2026-10-08" in params.get("and", "")
        return _Resp(rows, headers={"Content-Range": "0-0/1"})

    monkeypatch.setattr(app_module.requests, "get", fake_get)

    resp = client.get(
        "/api/logs",
        query_string={"day": "Day 9", "date": "2026-10-07"},
        headers=_auth(),
    )
    assert resp.status_code == 200
    data = resp.get_json()

    assert data["success"] is True
    assert data["total"] == 1
    assert data["pages"] == 1
    log = data["logs"][0]
    assert log["predicted_day"] == "Day 9"
    assert log["stage"] == "Embryonic Development"
    assert log["date"] == "2026-10-07"
    assert log["is_archived"] is False
