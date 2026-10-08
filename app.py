"""
CANDOLER backend — Flask API (Supabase edition).

* Verifies the Supabase JWT (Bearer token) on EVERY /api route.
* Runs YOLO prediction via the sealed predict.py + models/egg_candling_best.pt.
* /api/analyze validates, predicts, uploads the image to Supabase Storage
  (bucket: egg-images) and inserts a row into Postgres (egg_scans) in ONE request.
* Secrets are read from environment variables; CORS origins come from
  ALLOWED_ORIGINS. Runs under gunicorn in production.

Training code lives in training/ and is NOT part of this deployment.
"""

from __future__ import annotations

import base64
import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from io import BytesIO

import jwt  # PyJWT
import numpy as np
import requests
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError

from config import (
    DARK_MEAN_THRESHOLD,
    MIN_CONFIDENCE,
    MIN_IMAGE_HEIGHT,
    MIN_IMAGE_WIDTH,
    MODEL_PATH,
)
from predict import (
    MODEL_MISSING_MESSAGE,
    ModelNotTrainedError,
    model_is_ready,
    predict_image,
)

# ------------------------------------------------------------------
# Environment-driven configuration
# ------------------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
IMAGE_BUCKET = "egg-images"

_origins_raw = os.environ.get("ALLOWED_ORIGINS", "")
if _origins_raw:
    ALLOWED_ORIGINS = [o.strip() for o in _origins_raw.split(",") if o.strip()]
else:
    # Local dev fallback for the Vite dev server.
    ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

app = Flask(__name__)
CORS(
    app,
    origins=ALLOWED_ORIGINS,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS"],
    supports_credentials=False,
)


# ------------------------------------------------------------------
# Authentication (Supabase JWT)
# ------------------------------------------------------------------
def _extract_token() -> str | None:
    header = request.headers.get("Authorization", "")
    if header[:7].lower() == "bearer ":
        return header[7:].strip()
    return None


def _verify_token():
    """Return (user, None) on success, or (None, (message, http_code)) on failure."""
    token = _extract_token()
    if not token:
        return None, ("Missing bearer token", 401)
    if not SUPABASE_JWT_SECRET:
        return None, ("Server not configured: SUPABASE_JWT_SECRET is missing", 503)
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None, ("Token expired", 401)
    except jwt.InvalidTokenError as error:
        return None, (f"Invalid token: {error}", 401)
    user_id = payload.get("sub")
    if not user_id:
        return None, ("Token has no subject (sub) claim", 401)
    return {"user_id": user_id, "email": payload.get("email")}, None


def auth_required(func):
    """Require a valid Supabase Bearer token on every /api route."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        user, error = _verify_token()
        if error:
            message, code = error
            return jsonify({"success": False, "message": message}), code
        g.user = user
        return func(*args, **kwargs)

    return wrapper


def _current_user_id() -> str:
    return g.user["user_id"]


# ------------------------------------------------------------------
# Supabase helpers (Postgres + Storage over REST, service role key)
# ------------------------------------------------------------------
def _supabase_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


def _require_supabase() -> None:
    if not _supabase_configured():
        raise RuntimeError(
            "Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY."
        )


def _service_headers(content_type: str = "application/json") -> dict:
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": content_type,
    }


def _insert_scan(row: dict) -> dict:
    _require_supabase()
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/egg_scans",
        headers={**_service_headers(), "Prefer": "return=representation"},
        json=row,
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    return data[0] if data else row


def _get_scan(log_id: int) -> dict | None:
    _require_supabase()
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/egg_scans",
        headers=_service_headers(),
        params=[
            ("select", "*"),
            ("id", f"eq.{log_id}"),
            ("user_id", f"eq.{_current_user_id()}"),
            ("limit", "1"),
        ],
        timeout=60,
    )
    response.raise_for_status()
    rows = response.json()
    return rows[0] if rows else None


def _update_scan(log_id: int, patch: dict) -> dict | None:
    _require_supabase()
    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/egg_scans",
        headers={**_service_headers(), "Prefer": "return=representation"},
        params=[("id", f"eq.{log_id}"), ("user_id", f"eq.{_current_user_id()}")],
        json=patch,
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    return data[0] if data else None


def _query_scans(
    archived: bool, day: str | None, date: str | None, page: int, per_page: int
):
    """Return (rows, total) for the current user with day/date filters."""
    _require_supabase()
    params = [
        ("select", "*"),
        ("user_id", f"eq.{_current_user_id()}"),
        ("is_archived", f"eq.{str(archived).lower()}"),
        ("order", "created_at.desc"),
        ("limit", str(per_page)),
        ("offset", str((page - 1) * per_page)),
    ]
    if day:
        normalized = day.replace("_", " ").strip()
        if normalized.isdigit():
            normalized = f"Day {normalized}"
        params.append(("predicted_day", f'eq."{normalized}"'))
    if date:
        try:
            start = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            start = None
        if start:
            end = start + timedelta(days=1)
            params.append(
                (
                    "and",
                    f"(created_at.gte.{start.strftime('%Y-%m-%d')},"
                    f"created_at.lt.{end.strftime('%Y-%m-%d')})",
                )
            )
    headers = {**_service_headers(), "Prefer": "count=representation"}
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/egg_scans",
        headers=headers,
        params=params,
        timeout=60,
    )
    response.raise_for_status()
    rows = response.json()
    total = len(rows)
    content_range = response.headers.get("Content-Range", "")
    if "/" in content_range:
        try:
            total = int(content_range.rsplit("/", 1)[-1])
        except ValueError:
            pass
    return rows, total


def upload_to_storage(jpeg_bytes: bytes, day_label: str | None) -> str:
    """Upload JPEG bytes to the egg-images bucket, organized by predicted day."""
    _require_supabase()
    folder = day_label.replace(" ", "_") if day_label else "unassigned"
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"{stamp}_{uuid.uuid4().hex[:8]}.jpg"
    object_path = f"{folder}/{filename}"
    headers = _service_headers("image/jpeg")
    headers["x-upsert"] = "true"
    response = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{IMAGE_BUCKET}/{object_path}",
        headers=headers,
        data=jpeg_bytes,
        timeout=60,
    )
    response.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1/object/public/{IMAGE_BUCKET}/{object_path}"


# ------------------------------------------------------------------
# Image validation (kept from the original app: min 64x64 + brightness)
# ------------------------------------------------------------------
def decode_image_payload(payload: str) -> bytes:
    if not payload:
        raise ValueError("No image received")
    data = payload.split(",", 1)[1] if "," in payload else payload
    return base64.b64decode(data)


def validate_image_bytes(image_bytes: bytes):
    warnings: list[str] = []
    if not image_bytes:
        raise ValueError("Image is empty")
    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
    except (UnidentifiedImageError, OSError) as error:
        raise ValueError(f"Image could not be opened: {error}") from error

    width, height = image.size
    if width < MIN_IMAGE_WIDTH or height < MIN_IMAGE_HEIGHT:
        raise ValueError(
            f"Image is too small ({width}x{height}). "
            f"Need at least {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT}."
        )

    rgb = image.convert("RGB")
    array = np.asarray(rgb, dtype=np.float32)
    if array.size == 0:
        raise ValueError("Image contains no pixels")

    if float(array.mean()) < DARK_MEAN_THRESHOLD:
        warnings.append(
            "Captured image looks too dark or unusable. "
            "Improve candling light and recapture."
        )
    return rgb, warnings


def _to_jpeg(rgb: Image.Image) -> bytes:
    buffer = BytesIO()
    rgb.save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()


def _predict_from_bytes(jpeg_bytes: bytes) -> dict:
    """predict.py reads from a path, so stage the bytes in a temp file."""
    fd, path = tempfile.mkstemp(suffix=".jpg")
    with os.fdopen(fd, "wb") as handle:
        handle.write(jpeg_bytes)
    try:
        return predict_image(path)
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


# ------------------------------------------------------------------
# Row formatting
# ------------------------------------------------------------------
def _row_to_dict(row: dict) -> dict:
    created = row.get("created_at")
    date_s = time_s = date_d = time_d = ""
    if created:
        try:
            parsed = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
            date_s = parsed.strftime("%Y-%m-%d")
            time_s = parsed.strftime("%H:%M:%S")
            date_d = parsed.strftime("%B %d, %Y")
            time_d = parsed.strftime("%I:%M %p").lstrip("0")
        except ValueError:
            pass
    stage = row.get("stage")
    return {
        "id": row.get("id"),
        "image_url": row.get("image_url"),
        "predicted_day": row.get("predicted_day"),
        "stage": stage,
        "development_stage": stage,
        "confidence": row.get("confidence"),
        "top_predictions": row.get("top_predictions") or [],
        "low_confidence": bool(row.get("low_confidence")),
        "warning": row.get("warning"),
        "is_archived": bool(row.get("is_archived")),
        "created_at": row.get("created_at"),
        "date": date_s,
        "time": time_s,
        "date_display": date_d,
        "time_display": time_d,
    }


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------
@app.get("/")
def home():
    return jsonify(
        {
            "success": True,
            "service": "CANDOLER API",
            "endpoints": [
                "/api/status",
                "/api/analyze",
                "/api/logs",
                "/api/logs/<id>",
                "/api/logs/<id>/archive",
                "/api/logs/<id>/restore",
                "/api/archives",
            ],
        }
    )


@app.get("/api/status")
@auth_required
def api_status():
    return jsonify(
        {
            "success": True,
            "model_ready": model_is_ready(),
            "model_path": str(MODEL_PATH),
            "model_message": None if model_is_ready() else MODEL_MISSING_MESSAGE,
            "min_confidence": MIN_CONFIDENCE,
            "supabase_configured": _supabase_configured(),
            "user": g.user,
        }
    )


@app.post("/api/analyze")
@auth_required
def api_analyze():
    """Validate + predict + upload to Storage + insert log — in ONE request."""
    payload = request.get_json(silent=True) or {}
    try:
        image_bytes = decode_image_payload(payload.get("image"))
        rgb, quality_warnings = validate_image_bytes(image_bytes)
    except (ValueError, OSError) as error:
        return jsonify({"success": False, "message": str(error)}), 400

    if not model_is_ready():
        return jsonify(
            {
                "success": False,
                "code": "MODEL_NOT_TRAINED",
                "message": MODEL_MISSING_MESSAGE,
            }
        ), 409

    jpeg_bytes = _to_jpeg(rgb)
    try:
        prediction = _predict_from_bytes(jpeg_bytes)
    except ModelNotTrainedError as error:
        return jsonify(
            {"success": False, "code": "MODEL_NOT_TRAINED", "message": str(error)}
        ), 409
    except Exception as error:
        return jsonify(
            {"success": False, "message": f"YOLO analysis failed: {error}"}
        ), 500

    # Low-confidence behaviour is preserved: prediction["status"] carries the
    # low-confidence message and prediction["low_confidence"] flags it.
    warnings = list(quality_warnings)
    warning_text = " ".join(warnings) if warnings else None
    if prediction.get("low_confidence"):
        low_msg = prediction.get("status") or "Low confidence"
        warning_text = f"{warning_text} {low_msg}" if warning_text else low_msg

    try:
        image_url = upload_to_storage(jpeg_bytes, prediction.get("predicted_day"))
    except Exception as error:
        return jsonify({"success": False, "message": f"Image upload failed: {error}"}), 502

    row = {
        "user_id": _current_user_id(),
        "image_url": image_url,
        "predicted_day": prediction.get("predicted_day"),
        "stage": prediction.get("development_stage"),
        "confidence": prediction.get("confidence"),
        "top_predictions": prediction.get("top_predictions") or [],
        "low_confidence": bool(prediction.get("low_confidence")),
        "warning": warning_text,
        "is_archived": False,
    }
    try:
        saved = _insert_scan(row)
    except Exception as error:
        return jsonify(
            {"success": False, "message": f"Database save failed: {error}"}
        ), 502

    log = _row_to_dict(saved)
    return jsonify(
        {
            "success": True,
            "id": log["id"],
            "log_id": log["id"],
            "saved": True,
            "predicted_day": prediction.get("predicted_day"),
            "raw_predicted_day": prediction.get("raw_predicted_day"),
            "stage": prediction.get("development_stage"),
            "development_stage": prediction.get("development_stage"),
            "confidence": prediction.get("confidence"),
            "top_predictions": prediction.get("top_predictions") or [],
            "low_confidence": bool(prediction.get("low_confidence")),
            "status": prediction.get("status"),
            "warnings": warnings,
            "warning": warning_text,
            "image_url": image_url,
            "date": log["date"],
            "time": log["time"],
            "date_display": log["date_display"],
            "time_display": log["time_display"],
        }
    )


# ------------------------------------------------------------------
# Logs / archives
# ------------------------------------------------------------------
def _handle_list(archived: bool):
    day = (request.args.get("day") or "").strip()
    date = (request.args.get("date") or "").strip()
    try:
        page = max(int(request.args.get("page") or 1), 1)
    except ValueError:
        page = 1
    try:
        per_page = min(max(int(request.args.get("per_page") or 10), 1), 50)
    except ValueError:
        per_page = 10

    try:
        rows, total = _query_scans(archived, day or None, date or None, page, per_page)
    except Exception as error:
        return jsonify({"success": False, "message": f"Database error: {error}"}), 502

    pages = (total + per_page - 1) // per_page if total else 1
    return jsonify(
        {
            "success": True,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
            "logs": [_row_to_dict(row) for row in rows],
        }
    )


@app.get("/api/logs")
@auth_required
def api_logs():
    return _handle_list(False)


@app.get("/api/archives")
@auth_required
def api_archives():
    return _handle_list(True)


@app.get("/api/logs/<int:log_id>")
@auth_required
def api_log_detail(log_id: int):
    try:
        row = _get_scan(log_id)
    except Exception as error:
        return jsonify({"success": False, "message": f"Database error: {error}"}), 502
    if row is None:
        return jsonify({"success": False, "message": "Log not found"}), 404
    return jsonify({"success": True, "log": _row_to_dict(row)})


def _set_archived(log_id: int, value: bool, active_msg: str, archived_msg: str):
    try:
        row = _get_scan(log_id)
    except Exception as error:
        return jsonify({"success": False, "message": f"Database error: {error}"}), 502
    if row is None:
        return jsonify({"success": False, "message": "Log not found"}), 404
    if bool(row.get("is_archived")) == value:
        return jsonify(
            {"success": False, "message": archived_msg if value else active_msg}
        ), 400
    try:
        _update_scan(log_id, {"is_archived": value})
    except Exception as error:
        return jsonify({"success": False, "message": f"Database error: {error}"}), 502
    verb = "archived" if value else "restored"
    return jsonify(
        {
            "success": True,
            "message": f"Detection log {verb} successfully.",
            "log_id": log_id,
        }
    )


@app.post("/api/logs/<int:log_id>/archive")
@auth_required
def archive_log(log_id: int):
    return _set_archived(
        log_id,
        True,
        "This detection is already active.",
        "This detection is already archived.",
    )


@app.post("/api/logs/<int:log_id>/restore")
@auth_required
def restore_log(log_id: int):
    return _set_archived(
        log_id,
        False,
        "This detection is already active.",
        "This detection is already archived.",
    )


# ------------------------------------------------------------------
# Startup
# ------------------------------------------------------------------
if __name__ == "__main__":
    print("======================================")
    print(" CHICKEN EGG CANDLING API (Supabase)")
    print("======================================")
    print(f"Model         : {MODEL_PATH} ({'ready' if model_is_ready() else 'MISSING'})")
    print(f"Supabase URL  : {SUPABASE_URL or '(not set)'}")
    print(f"Service key   : {'set' if SUPABASE_SERVICE_KEY else '(not set)'}")
    print(f"JWT secret    : {'set' if SUPABASE_JWT_SECRET else '(not set)'}")
    print(f"CORS origins  : {', '.join(ALLOWED_ORIGINS)}")
    print("======================================")
    app.run(host="127.0.0.1", port=5000, debug=True)

