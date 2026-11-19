"""Tests for the new Trash and Archive flow endpoints:
- POST /api/logs/<id>/archive
- POST /api/logs/<id>/restore
- POST /api/logs/<id>/trash
- POST /api/logs/<id>/restore-trash
- GET /api/trash
- DELETE /api/logs/<id> (permanent delete with storage purge)
"""

import jwt as pyjwt
import pytest

import app as app_module

TEST_SECRET = "unit-test-secret-at-least-32-chars-long-1234"


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(app_module, "SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setattr(app_module, "SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setattr(app_module, "SUPABASE_SERVICE_KEY", "service-key")
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client()


def _auth(user_id: str = "user-1") -> dict:
    token = pyjwt.encode(
        {
            "sub": user_id,
            "email": "tester@example.com",
            "aud": "authenticated",
            "iss": "https://test.supabase.co",
        },
        TEST_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


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


def test_trash_endpoints_require_auth(client):
    assert client.get("/api/trash").status_code == 401
    assert client.post("/api/logs/1/trash").status_code == 401
    assert client.post("/api/logs/1/restore-trash").status_code == 401
    assert client.delete("/api/logs/1").status_code == 401


def test_trash_flow_move_to_trash_and_list(client, monkeypatch):
    # Mock row lookup and update
    scans_db = {
        10: {
            "id": 10,
            "user_id": "user-1",
            "is_archived": True,
            "deleted_at": None,
            "predicted_day": "Day 7",
            "stage": "Development",
            "created_at": "2026-11-19T10:00:00+00:00",
        }
    }

    def fake_get(url, **kwargs):
        params = dict(kwargs.get("params", []))
        if "/rest/v1/egg_scans" in url:
            # Check if this is a single scan lookup or a query
            if "limit" in params and params.get("limit") == "1":
                log_id = int(params["id"].replace("eq.", ""))
                row = scans_db.get(log_id)
                return _Resp([row] if row else [])
            else:
                # Query list
                is_trash_query = "deleted_at" in params and params["deleted_at"] == "not.is.null"
                rows = [
                    r for r in scans_db.values()
                    if (r["deleted_at"] is not None) == is_trash_query
                ]
                return _Resp(rows, headers={"Content-Range": f"0-{len(rows)-1}/{len(rows)}"})
        raise AssertionError(f"unexpected GET {url}")

    def fake_patch(url, **kwargs):
        params = dict(kwargs.get("params", []))
        log_id = int(params["id"].replace("eq.", ""))
        patch = kwargs.get("json", {})
        if log_id in scans_db:
            scans_db[log_id].update(patch)
            return _Resp([scans_db[log_id]])
        return _Resp([])

    monkeypatch.setattr(app_module.requests, "get", fake_get)
    monkeypatch.setattr(app_module.requests, "patch", fake_patch)

    # 1. Move scan 10 to trash
    res = client.post("/api/logs/10/trash", headers=_auth("user-1"))
    assert res.status_code == 200
    assert res.get_json()["success"] is True
    assert scans_db[10]["deleted_at"] is not None

    # 2. List trash should now contain scan 10
    trash_res = client.get("/api/trash", headers=_auth("user-1"))
    assert trash_res.status_code == 200
    data = trash_res.get_json()
    assert data["total"] == 1
    assert data["logs"][0]["id"] == 10
    assert data["logs"][0]["is_trashed"] is True

    # 3. Trying to trash again should fail
    res_repeat = client.post("/api/logs/10/trash", headers=_auth("user-1"))
    assert res_repeat.status_code == 400


def test_restore_from_trash(client, monkeypatch):
    scans_db = {
        20: {
            "id": 20,
            "user_id": "user-1",
            "is_archived": True,
            "deleted_at": "2026-11-19T10:00:00+00:00",
            "predicted_day": "Day 12",
            "created_at": "2026-11-19T09:00:00+00:00",
        }
    }

    def fake_get(url, **kwargs):
        params = dict(kwargs.get("params", []))
        log_id = int(params["id"].replace("eq.", ""))
        row = scans_db.get(log_id)
        return _Resp([row] if row else [])

    def fake_patch(url, **kwargs):
        params = dict(kwargs.get("params", []))
        log_id = int(params["id"].replace("eq.", ""))
        patch = kwargs.get("json", {})
        scans_db[log_id].update(patch)
        return _Resp([scans_db[log_id]])

    monkeypatch.setattr(app_module.requests, "get", fake_get)
    monkeypatch.setattr(app_module.requests, "patch", fake_patch)

    res = client.post("/api/logs/20/restore-trash", headers=_auth("user-1"))
    assert res.status_code == 200
    assert res.get_json()["success"] is True
    assert scans_db[20]["deleted_at"] is None
    assert scans_db[20]["is_archived"] is True


def test_permanent_delete_purges_storage_and_db(client, monkeypatch):
    image_url = "https://test.supabase.co/storage/v1/object/public/egg-images/Day_5/sample.jpg"
    scans_db = {
        30: {
            "id": 30,
            "user_id": "user-1",
            "image_url": image_url,
            "deleted_at": "2026-11-19T10:00:00+00:00",
            "created_at": "2026-11-19T09:00:00+00:00",
        }
    }

    storage_deleted = []
    db_deleted = []

    def fake_get(url, **kwargs):
        params = dict(kwargs.get("params", []))
        log_id = int(params["id"].replace("eq.", ""))
        row = scans_db.get(log_id)
        return _Resp([row] if row else [])

    def fake_delete(url, **kwargs):
        if "/storage/v1/object/egg-images/" in url:
            storage_deleted.append(url)
            return _Resp({}, status=200)
        if "/rest/v1/egg_scans" in url:
            params = dict(kwargs.get("params", []))
            log_id = int(params["id"].replace("eq.", ""))
            db_deleted.append(log_id)
            scans_db.pop(log_id, None)
            return _Resp({}, status=200)
        raise AssertionError(f"unexpected DELETE {url}")

    monkeypatch.setattr(app_module.requests, "get", fake_get)
    monkeypatch.setattr(app_module.requests, "delete", fake_delete)

    res = client.delete("/api/logs/30", headers=_auth("user-1"))
    assert res.status_code == 200
    assert res.get_json()["success"] is True
    assert len(storage_deleted) == 1
    assert "Day_5/sample.jpg" in storage_deleted[0]
    assert 30 in db_deleted
    assert 30 not in scans_db
