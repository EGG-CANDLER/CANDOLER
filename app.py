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
from dotenv import load_dotenv
load_dotenv()
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from io import BytesIO

import jwt  # PyJWT
import numpy as np
import requests
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from PIL import Image, UnidentifiedImageError

from config import (
    DARK_MEAN_THRESHOLD,
    MAX_IMAGE_BYTES,
    MAX_IMAGE_DIMENSION,
    MIN_CONFIDENCE,
    MIN_IMAGE_HEIGHT,
    MIN_IMAGE_WIDTH,
    MODEL_PATH,
)
from predict import (
    MODEL_MISSING_MESSAGE,
    ModelNotTrainedError,
    load_model,
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

try:
    FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
except AttributeError:
    FLASK_DEBUG = False

# Rate limit for POST /api/analyze (configurable via env var, e.g. "30/minute")
ANALYZE_RATE_LIMIT = os.environ.get("ANALYZE_RATE_LIMIT", "30/minute")


def _rate_limit_key() -> str:
    """Use authenticated user_id when available, fall back to client IP."""
    try:
        user = g.get("user")
        if user and user.get("user_id"):
            return f"user:{user['user_id']}"
    except Exception:
        pass
    return f"ip:{get_remote_address()}"


limiter = Limiter(
    key_func=_rate_limit_key,
    storage_uri="memory://",
    default_limits=[],
)


def _validate_startup() -> None:
    """Fail fast if required backend configuration is missing.

    Messages name the missing variable only — never its value.
    """
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY:
        missing.append("SUPABASE_SERVICE_KEY")
    if not SUPABASE_JWT_SECRET:
        missing.append("SUPABASE_JWT_SECRET")
    if missing:
        names = ", ".join(missing)
        raise RuntimeError(
            f"Missing required backend configuration: {names}. "
            "Copy .env.example to .env and fill in the values."
        )
    if not _origins_raw:
        print(
            "WARNING: ALLOWED_ORIGINS is not set. "
            "CORS will only allow http://localhost:5173 and http://127.0.0.1:5173."
        )

app = Flask(__name__)
CORS(
    app,
    origins=ALLOWED_ORIGINS,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "DELETE", "OPTIONS"],
    supports_credentials=False,
)
limiter.init_app(app)


# ------------------------------------------------------------------
# Authentication (Supabase JWT with JWKS & Secret Support)
# ------------------------------------------------------------------
_jwk_client = None


def _get_jwk_client():
    global _jwk_client
    if _jwk_client is None and SUPABASE_URL:
        jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        _jwk_client = jwt.PyJWKClient(jwks_url, timeout=10)
    return _jwk_client


def _extract_token() -> str | None:
    header = request.headers.get("Authorization", "")
    if header[:7].lower() == "bearer ":
        return header[7:].strip()
    return None


def _verify_token():
    """Return (user, None) on success, or (None, (response_dict, http_code)) on failure."""
    token = _extract_token()
    if not token:
        app.logger.warning("Auth failed: Missing bearer token")
        return None, ({"error": "token_missing", "message": "Missing bearer token"}, 401)

    try:
        header = jwt.get_unverified_header(token)
        token_alg = header.get("alg", "HS256")
        kid = header.get("kid")
    except Exception as e:
        app.logger.warning(f"Could not parse token header: {e}")
        token_alg = "HS256"
        kid = None

    payload = None
    # 1. Asymmetric token (ES256 / RS256) -> verify against Supabase JWKS public keys
    if token_alg in ["ES256", "RS256"]:
        try:
            jwk_client = _get_jwk_client()
            if jwk_client:
                signing_key = jwk_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[token_alg],
                    audience="authenticated",
                )
        except jwt.PyJWTError as e:
            app.logger.warning(f"Auth failed: Asymmetric verification failed ({e})")
            return None, ({"error": "token_invalid", "message": f"Invalid token: {e}"}, 401)
        except Exception as e:
            app.logger.warning(f"Auth failed: JWKS fetch failed ({e})")

    # 2. Symmetric token (HS256 / HS384 / HS512) or fallback -> verify with SUPABASE_JWT_SECRET
    if payload is None:
        if not SUPABASE_JWT_SECRET:
            app.logger.error("Auth failed: SUPABASE_JWT_SECRET is missing")
            return None, ({"error": "server_misconfigured", "message": "Server not configured: SUPABASE_JWT_SECRET is missing"}, 503)

        try:
            allowed_algs = ["HS256", "HS384", "HS512"]
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=allowed_algs,
                audience="authenticated",
            )
        except jwt.ExpiredSignatureError:
            app.logger.warning("Auth failed: Token expired")
            return None, ({"error": "token_expired", "message": "Token expired"}, 401)
        except jwt.InvalidAudienceError as err:
            app.logger.warning(f"Auth failed: Invalid audience ({err})")
            return None, ({"error": "token_invalid", "message": f"Invalid token audience: {err}"}, 401)
        except jwt.InvalidTokenError as error:
            app.logger.warning(f"Auth failed: Invalid token ({error})")
            return None, ({"error": "token_invalid", "message": f"Invalid token: {error}"}, 401)

    # Verify issuer against Supabase project URL (accept base URL, /auth/v1 suffix, or 'supabase')
    issuer = payload.get("iss")
    if issuer and SUPABASE_URL:
        expected_issuers = {SUPABASE_URL, f"{SUPABASE_URL}/auth/v1", "supabase"}
        if issuer not in expected_issuers:
            app.logger.warning(f"Auth failed: Invalid issuer '{issuer}'. Expected one of {expected_issuers}")
            return None, ({"error": "token_invalid", "message": f"Invalid token issuer: {issuer}"}, 401)

    user_id = payload.get("sub")
    if not user_id:
        app.logger.warning("Auth failed: Token has no subject claim")
        return None, ({"error": "token_invalid", "message": "Token has no subject (sub) claim"}, 401)
    return {"user_id": user_id, "email": payload.get("email")}, None


def auth_required(func):
    """Require a valid Supabase Bearer token on every /api route."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            return func(*args, **kwargs)
        user, error = _verify_token()
        if error:
            error_data, code = error
            return jsonify({
                "success": False,
                **error_data,
            }), code
        g.user = user
        return func(*args, **kwargs)

    return wrapper


def _current_user_id() -> str:
    return g.user["user_id"]


@app.errorhandler(429)
def _rate_limit_exceeded(error):
    return jsonify(
        {
            "success": False,
            "code": "RATE_LIMIT_EXCEEDED",
            "message": "Too many analyze requests. Please slow down and try again later.",
        }
    ), 429


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


def _delete_scan(log_id: int) -> bool:
    _require_supabase()
    response = requests.delete(
        f"{SUPABASE_URL}/rest/v1/egg_scans",
        headers=_service_headers(),
        params=[("id", f"eq.{log_id}"), ("user_id", f"eq.{_current_user_id()}")],
        timeout=60,
    )
    response.raise_for_status()
    return True


def delete_from_storage(image_url: str | None) -> bool:
    """Extract object path from public storage URL and remove it from Supabase Storage."""
    if not image_url or f"/{IMAGE_BUCKET}/" not in image_url:
        return False
    _require_supabase()
    try:
        # URL format: .../storage/v1/object/public/egg-images/<object_path>
        object_path = image_url.split(f"/{IMAGE_BUCKET}/", 1)[1].split("?")[0]
        if not object_path:
            return False
        response = requests.delete(
            f"{SUPABASE_URL}/storage/v1/object/{IMAGE_BUCKET}/{object_path}",
            headers=_service_headers(),
            timeout=60,
        )
        return response.status_code in (200, 204)
    except Exception as e:
        app.logger.warning(f"Failed to delete storage file {image_url}: {e}")
        return False


def _query_scans(
    status_mode: str, day: str | None, date: str | None, page: int, per_page: int
):
    """Return (rows, total) for the current user with status/day/date filters.

    status_mode can be 'active', 'archived', or 'trash'.
    """
    _require_supabase()
    params = [
        ("select", "*"),
        ("user_id", f"eq.{_current_user_id()}"),
        ("order", "created_at.desc"),
        ("limit", str(per_page)),
        ("offset", str((page - 1) * per_page)),
    ]
    if status_mode == "trash":
        params.append(("deleted_at", "not.is.null"))
    elif status_mode == "archived":
        params.append(("deleted_at", "is.null"))
        params.append(("is_archived", "eq.true"))
    else:  # active (logs)
        params.append(("deleted_at", "is.null"))
        params.append(("is_archived", "eq.false"))
    if day:
        normalized = day.replace("_", " ").strip()
        if normalized.isdigit():
            normalized = f"Day {normalized}"
        params.append(("predicted_day", f"eq.{normalized}"))
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
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError(
            f"Image is too large ({len(image_bytes)} bytes). "
            f"Maximum allowed size is {MAX_IMAGE_BYTES} bytes."
        )
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
    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise ValueError(
            f"Image dimensions too large ({width}x{height}). "
            f"Maximum allowed dimension is {MAX_IMAGE_DIMENSION}px."
        )

    # Downscale image if larger than 1024px to prevent OOM on memory-constrained servers
    if width > 1024 or height > 1024:
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)

    rgb = image.convert("RGB")
    array = np.asarray(rgb, dtype=np.float32)
    if array.size == 0:
        raise ValueError("Image contains no pixels")

    if float(array.mean()) < DARK_MEAN_THRESHOLD:
        warnings.append(
            "Lighting recommendation: Candling illumination appears low. "
            "For optimal accuracy, align the candling light source directly beneath the egg."
        )
    return rgb, warnings


def _to_jpeg(rgb: Image.Image) -> bytes:
    buffer = BytesIO()
    rgb.save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()


def _predict_from_bytes(jpeg_bytes: bytes) -> dict:
    """Run YOLO prediction directly from image bytes via PIL (no temp file)."""
    image = Image.open(BytesIO(jpeg_bytes))
    image.load()
    return predict_image(image)


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
        "deleted_at": row.get("deleted_at"),
        "is_trashed": bool(row.get("deleted_at")),
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
                "/api/logs/<id>/trash",
                "/api/logs/<id>/restore-trash",
                "/api/archives",
                "/api/trash",
            ],
        }
    )


@app.get("/api/status")
def api_status():
    ready = model_is_ready()
    if ready:
        try:
            load_model()
        except Exception:
            pass

    user = None
    token = _extract_token()
    if token and SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            user = {"user_id": payload.get("sub"), "email": payload.get("email")}
        except jwt.PyJWTError:
            pass

    return jsonify(
        {
            "success": True,
            "model_ready": model_is_ready(),
            "model_path": str(MODEL_PATH),
            "model_message": None if model_is_ready() else MODEL_MISSING_MESSAGE,
            "min_confidence": MIN_CONFIDENCE,
            "supabase_configured": _supabase_configured(),
            "user": user,
        }
    )


@app.post("/api/analyze")
@auth_required
@limiter.limit(lambda: ANALYZE_RATE_LIMIT)
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
# Logs / archives / trash
# ------------------------------------------------------------------
def _handle_list(status_mode: str):
    day = (request.args.get("day") or "").strip()
    date = (request.args.get("date") or "").strip()
    try:
        page = max(int(request.args.get("page") or 1), 1)
    except ValueError:
        page = 1
    try:
        per_page = min(max(int(request.args.get("per_page") or 10), 1), 100)
    except ValueError:
        per_page = 10

    try:
        rows, total = _query_scans(status_mode, day or None, date or None, page, per_page)
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
    return _handle_list("active")


@app.get("/api/archives")
@auth_required
def api_archives():
    return _handle_list("archived")


@app.get("/api/trash")
@auth_required
def api_trash():
    return _handle_list("trash")


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
    if row.get("deleted_at"):
        return jsonify(
            {"success": False, "message": "Item is in trash. Restore from trash first."}
        ), 400
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


@app.post("/api/logs/<int:log_id>/trash")
@auth_required
def trash_log(log_id: int):
    """Move scan to trash (Logs -> Archive -> Trash flow)."""
    try:
        row = _get_scan(log_id)
    except Exception as error:
        return jsonify({"success": False, "message": f"Database error: {error}"}), 502
    if row is None:
        return jsonify({"success": False, "message": "Log not found"}), 404
    if row.get("deleted_at"):
        return jsonify({"success": False, "message": "This detection is already in trash."}), 400

    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        # Preserve is_archived = true so restoring returns it back to Archive
        _update_scan(log_id, {"deleted_at": now_iso, "is_archived": True})
    except Exception as error:
        return jsonify({"success": False, "message": f"Database error: {error}"}), 502

    return jsonify(
        {
            "success": True,
            "message": "Detection log moved to trash successfully.",
            "log_id": log_id,
        }
    )


@app.post("/api/logs/<int:log_id>/restore-trash")
@auth_required
def restore_trash_log(log_id: int):
    """Restore scan from trash back to Archive."""
    try:
        row = _get_scan(log_id)
    except Exception as error:
        return jsonify({"success": False, "message": f"Database error: {error}"}), 502
    if row is None:
        return jsonify({"success": False, "message": "Log not found"}), 404
    if not row.get("deleted_at"):
        return jsonify({"success": False, "message": "This detection is not in trash."}), 400

    try:
        _update_scan(log_id, {"deleted_at": None, "is_archived": True})
    except Exception as error:
        return jsonify({"success": False, "message": f"Database error: {error}"}), 502

    return jsonify(
        {
            "success": True,
            "message": "Detection log restored from trash successfully.",
            "log_id": log_id,
        }
    )


@app.delete("/api/logs/<int:log_id>")
@auth_required
def delete_log_permanent(log_id: int):
    """Permanently delete scan row and remove image from Supabase Storage."""
    try:
        row = _get_scan(log_id)
    except Exception as error:
        return jsonify({"success": False, "message": f"Database error: {error}"}), 502
    if row is None:
        return jsonify({"success": False, "message": "Log not found"}), 404

    image_url = row.get("image_url")
    if image_url:
        delete_from_storage(image_url)

    try:
        _delete_scan(log_id)
    except Exception as error:
        return jsonify({"success": False, "message": f"Database delete failed: {error}"}), 502

    return jsonify(
        {
            "success": True,
            "message": "Detection log permanently deleted.",
            "log_id": log_id,
        }
    )


# ------------------------------------------------------------------
# Startup
# ------------------------------------------------------------------
if __name__ == "__main__":
    _validate_startup()
    print("======================================")
    print(" CHICKEN EGG CANDLING API (Supabase)")
    print("======================================")
    print(f"Model         : {MODEL_PATH} ({'ready' if model_is_ready() else 'MISSING'})")
    print(f"Supabase URL  : {SUPABASE_URL or '(not set)'}")
    print(f"Service key   : {'set' if SUPABASE_SERVICE_KEY else '(not set)'}")
    print(f"JWT secret    : {'set' if SUPABASE_JWT_SECRET else '(not set)'}")
    print(f"CORS origins  : {', '.join(ALLOWED_ORIGINS)}")
    print("======================================")
    app.run(host="127.0.0.1", port=5000, debug=FLASK_DEBUG)

