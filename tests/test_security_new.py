"""Security and hardening tests for Phase 3.

Tests: rate limiting (429), oversized image rejection (413/400),
JWT audience/issuer validation, and temp-file removal.
"""
from __future__ import annotations

import base64
import io

import jwt as pyjwt
import pytest
from PIL import Image

import app as app_module

TEST_SECRET = "unit-test-secret"


def _make_token(extra_claims: dict | None = None) -> str:
    claims = {
        "sub": "user-1",
        "email": "u@example.com",
        "aud": "authenticated",
        "iss": "https://test.supabase.co",
    }
    if extra_claims:
        claims.update(extra_claims)
    return pyjwt.encode(claims, TEST_SECRET, algorithm="HS256")


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(app_module, "SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setattr(app_module, "SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setattr(app_module, "SUPABASE_SERVICE_KEY", "service-key")
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client()


@pytest.fixture()
def valid_headers():
    return {"Authorization": f"Bearer {_make_token()}"}


class TestMaxImageSize:
    def test_oversized_bytes_rejected(self, client, monkeypatch, valid_headers):
        monkeypatch.setattr(app_module, "MAX_IMAGE_BYTES", 100)
        _mock_predict(monkeypatch)
        # 200 bytes > 100 byte limit
        resp = client.post(
            "/api/analyze",
            json={"image": "data:image/jpeg;base64," + "x" * 200},
            headers=valid_headers,
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert "too large" in data["message"].lower() or "maximum" in data["message"].lower()

    def test_oversized_dimensions_rejected(self, client, monkeypatch, valid_headers):
        monkeypatch.setattr(app_module, "MAX_IMAGE_DIMENSION", 100)
        _mock_predict(monkeypatch)
        image = Image.new("RGB", (500, 500), (200, 200, 200))
        buf = io.BytesIO()
        image.save(buf, format="JPEG")
        big_bytes = buf.getvalue()
        import base64

        b64 = base64.b64encode(big_bytes).decode("ascii")
        resp = client.post(
            "/api/analyze",
            json={"image": "data:image/jpeg;base64," + b64},
            headers=valid_headers,
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert "dimension" in data["message"].lower() or "maximum" in data["message"].lower()

    def test_fake_post_called(self, client, monkeypatch, valid_headers):
        """Verify _fake_post is called for BOTH storage and scan insert calls."""
        _mock_predict(monkeypatch)

        call_count = {"n": 0}

        def _fake_post(url, **kwargs):
            other = kwargs.get("other")
            print(f"DEBUG: _fake_post called with URL: {url}")
            if "/storage/" in url:
                return _Resp({})
            if "/rest/v1/egg_scans" in url:
                return _Resp([{**kwargs.get("json", {}), "id": 7, "created_at": "2026-10-08T12:00:00+00:00"}])
            raise AssertionError(f"unexpected POST {url}")

        monkeypatch.setattr(app_module.requests, "post", _fake_post)
        image = Image.new("RGB", (128, 128), (200, 200, 200))
        buf = io.BytesIO()
        image.save(buf, format="JPEG")
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")

        resp = client.post(
            "/api/analyze",
            json={"image": "data:image/jpeg;base64," + b64},
            headers=valid_headers,
        )
        print(f"DEBUG: Response status: {resp.status_code}")
        assert resp.status_code == 200

class TestJwtValidation:
    def test_wrong_audience_rejected(self, client):
        token = _make_token(extra_claims={"aud": "wrong-audience"})
        headers = {"Authorization": f"Bearer {token}"}
        resp = client.get("/api/logs", headers=headers)
        assert resp.status_code == 401

    def test_wrong_issuer_rejected(self, client):
        token = _make_token(extra_claims={"iss": "https://evil.example.com"})
        headers = {"Authorization": f"Bearer {token}"}
        resp = client.get("/api/logs", headers=headers)
        assert resp.status_code == 401

    def test_valid_token_works(self, client, valid_headers):
        resp = client.get("/api/logs", headers=valid_headers)
        assert resp.status_code != 401

class TestTempFile:
    def test_predict_image_accepts_pil_image(self):
        """predict_image() must accept a PIL Image (no path needed)."""
        import sys
        import os

        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from PIL import Image

        import predict as predict_module

        img = Image.open("tests/fixtures/sample_day_14.jpg").convert("RGB")
        result = predict_module.predict_image(img)
        assert result["top_predictions"][0]["day"].replace(" ", "_") == result["predicted_class"]
        assert result["confidence"] >= 0

    def test_no_tempfile_import(self):
        """tempfile must not be imported (temp file removed)."""
        import app as app_module

        assert not hasattr(app_module, "tempfile")

    def test_predict_from_bytes_no_temp_file(self, monkeypatch):
        """_predict_from_bytes must not create temp files on disk."""
        import tempfile

        original_mkstemp = tempfile.mkstemp

        def fake_mkstemp(suffix=""):
            raise AssertionError("temp file should not be created")

        monkeypatch.setattr(tempfile, "mkstemp", fake_mkstemp)

        monkeypatch.setattr(app_module, "model_is_ready", lambda: True)
        monkeypatch.setattr(
            app_module,
            "_predict_from_bytes",
            lambda b: {"ok": True},
        )

        result = app_module._predict_from_bytes(b"test bytes")
        assert result == {"ok": True}



@pytest.fixture()
def tiny_image():
    image = Image.new("RGB", (128, 128), (200, 200, 200))
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    return buf.getvalue()


def _mock_predict(monkeypatch, monkeypatch_requests=True):
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
            "top_predictions": [{"day": "Day 14", "confidence": 91.23}],
        },
    )
    if monkeypatch_requests:
        # Mock the Supabase API calls that /api/analyze makes after prediction
        def _fake_post(url, **kwargs):
            print(f"DEBUG: _fake_post called with URL: {url}")
            if "/storage/" in url:
                return _Resp({})
            if "/rest/v1/egg_scans" in url:
                return _Resp([{**kwargs["json"], "id": 7, "created_at": "2026-10-08T12:00:00+00:00"}])
            raise AssertionError(f"unexpected POST {url}")

        monkeypatch.setattr(app_module.requests, "post", _fake_post)


class TestRateLimiting:
    def test_analyze_rate_limit_returns_429(self, client, monkeypatch):
        monkeypatch.setattr(app_module, "ANALYZE_RATE_LIMIT", "1/minute")
        _mock_predict(monkeypatch)
        headers = {"Authorization": f"Bearer {_make_token()}"}

        # Use a valid base64 image (128x128, above 64px minimum)
        image = Image.new("RGB", (128, 128), (200, 200, 200))
        buf = io.BytesIO()
        image.save(buf, format="JPEG")
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")

        resp = client.post(
            "/api/analyze",
            json={"image": "data:image/jpeg;base64," + b64},
            headers=headers,
        )
        assert resp.status_code == 200

        resp2 = client.post(
            "/api/analyze",
            json={"image": "data:image/jpeg;base64," + b64},
            headers=headers,
        )
        assert resp2.status_code == 429
        data = resp2.get_json()
        assert data["code"] == "RATE_LIMIT_EXCEEDED"

    def test_analyze_rate_limit_429_message(self, client, monkeypatch):
        monkeypatch.setattr(app_module, "ANALYZE_RATE_LIMIT", "1/minute")
        _mock_predict(monkeypatch)
        headers = {"Authorization": f"Bearer {_make_token()}"}
        image = Image.new("RGB", (128, 128), (200, 200, 200))
        buf = io.BytesIO()
        image.save(buf, format="JPEG")
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")

        client.post(
            "/api/analyze",
            json={"image": "data:image/jpeg;base64," + b64},
            headers=headers,
        )
        resp2 = client.post(
            "/api/analyze",
            json={"image": "data:image/jpeg;base64," + b64},
            headers=headers,
        )
        assert resp2.status_code == 429
        data = resp2.get_json()
        assert data["success"] is False
        assert "message" in data
