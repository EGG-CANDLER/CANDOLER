from __future__ import annotations

import base64
import sqlite3
from datetime import datetime
from io import BytesIO
from pathlib import Path

import numpy as np
from flask import Flask, jsonify, render_template, request, send_from_directory
from PIL import Image, UnidentifiedImageError

from config import (
    BASE_DIR,
    CAPTURED_DIR,
    DATASET_DIR,
    DB_PATH,
    DARK_MEAN_THRESHOLD,
    MIN_CONFIDENCE,
    MIN_IMAGE_HEIGHT,
    MIN_IMAGE_WIDTH,
    MODEL_PATH,
    class_folder_from_display,
)
from predict import (
    MODEL_MISSING_MESSAGE,
    ModelNotTrainedError,
    model_is_ready,
    predict_image,
)

app = Flask(__name__)

ALLOWED_SAVE_DAYS = {f"Day_{d}" for d in range(1, 22)}


# ============================================================
# DATABASE
# ============================================================

def get_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    CAPTURED_DIR.mkdir(parents=True, exist_ok=True)

    with get_db() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS egg_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_path TEXT NOT NULL,
                predicted_day TEXT,
                development_stage TEXT,
                confidence REAL,
                top_prediction_1 TEXT,
                top_confidence_1 REAL,
                top_prediction_2 TEXT,
                top_confidence_2 REAL,
                top_prediction_3 TEXT,
                top_confidence_3 REAL,
                low_confidence INTEGER DEFAULT 0,
                warning TEXT,
                created_at TEXT NOT NULL,
                is_archived INTEGER DEFAULT 0
            )
            """
        )

        # Add archive column to older databases if needed.
        columns = connection.execute(
            "PRAGMA table_info(egg_logs)"
        ).fetchall()

        column_names = {
            column["name"]
            for column in columns
        }

        if "is_archived" not in column_names:
            connection.execute(
                """
                ALTER TABLE egg_logs
                ADD COLUMN is_archived INTEGER DEFAULT 0
                """
            )

        connection.commit()


# ============================================================
# IMAGE FUNCTIONS
# ============================================================

def decode_image_payload(payload: str) -> bytes:
    if not payload:
        raise ValueError("No image received")

    data = payload

    if "," in data:
        data = data.split(",", 1)[1]

    return base64.b64decode(data)


def validate_image_bytes(
    image_bytes: bytes,
) -> tuple[Image.Image, list[str]]:

    warnings: list[str] = []

    if not image_bytes:
        raise ValueError("Image is empty")

    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
    except (UnidentifiedImageError, OSError) as error:
        raise ValueError(
            f"Image could not be opened: {error}"
        ) from error

    width, height = image.size

    if (
        width < MIN_IMAGE_WIDTH
        or height < MIN_IMAGE_HEIGHT
    ):
        raise ValueError(
            f"Image is too small ({width}x{height}). "
            f"Need at least "
            f"{MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT}."
        )

    rgb = image.convert("RGB")
    array = np.asarray(
        rgb,
        dtype=np.float32,
    )

    if array.size == 0:
        raise ValueError(
            "Image contains no pixels"
        )

    mean_brightness = float(array.mean())

    if mean_brightness < DARK_MEAN_THRESHOLD:
        warnings.append(
            "Captured image looks too dark or unusable. "
            "Improve candling light and recapture."
        )

    return rgb, warnings


def unique_capture_name(
    when: datetime,
) -> str:

    stamp = when.strftime(
        "%Y%m%d_%H%M%S"
    )

    name = f"egg_{stamp}.jpg"
    path = CAPTURED_DIR / name

    counter = 1

    while path.exists():
        name = (
            f"egg_{stamp}_{counter:02d}.jpg"
        )
        path = CAPTURED_DIR / name
        counter += 1

    return name


def public_image_url(
    filename: str,
) -> str:

    return f"/media/captured/{filename}"


# ============================================================
# PREDICTION / LOG FUNCTIONS
# ============================================================

def pad_top(
    prediction: dict,
) -> list[dict]:

    items = list(
        prediction.get(
            "top_predictions"
        ) or []
    )

    while len(items) < 3:
        items.append(
            {
                "day": None,
                "confidence": None,
            }
        )

    return items[:3]


def insert_log(
    *,
    image_path: str,
    prediction: dict | None,
    warning: str | None,
    created_at: str,
) -> int:

    top = pad_top(
        prediction or {}
    )

    with get_db() as connection:
        cursor = connection.execute(
            """
            INSERT INTO egg_logs (
                image_path,
                predicted_day,
                development_stage,
                confidence,
                top_prediction_1,
                top_confidence_1,
                top_prediction_2,
                top_confidence_2,
                top_prediction_3,
                top_confidence_3,
                low_confidence,
                warning,
                created_at,
                is_archived
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, 0
            )
            """,
            (
                image_path,
                (
                    prediction or {}
                ).get("predicted_day")
                or (
                    prediction or {}
                ).get("raw_predicted_day"),

                (
                    prediction or {}
                ).get("development_stage"),

                (
                    prediction or {}
                ).get("confidence"),

                top[0]["day"],
                top[0]["confidence"],

                top[1]["day"],
                top[1]["confidence"],

                top[2]["day"],
                top[2]["confidence"],

                1 if (
                    prediction or {}
                ).get("low_confidence") else 0,

                warning,
                created_at,
            ),
        )

        connection.commit()

        return int(
            cursor.lastrowid
        )


def row_to_dict(
    row: sqlite3.Row,
) -> dict:

    created = datetime.fromisoformat(
        row["created_at"]
    )

    filename = Path(
        row["image_path"]
    ).name

    return {
        "id": row["id"],
        "image_path": row["image_path"],
        "image_url": public_image_url(
            filename
        ),
        "predicted_day": row[
            "predicted_day"
        ],
        "development_stage": row[
            "development_stage"
        ],
        "confidence": row[
            "confidence"
        ],
        "top_prediction_1": row[
            "top_prediction_1"
        ],
        "top_confidence_1": row[
            "top_confidence_1"
        ],
        "top_prediction_2": row[
            "top_prediction_2"
        ],
        "top_confidence_2": row[
            "top_confidence_2"
        ],
        "top_prediction_3": row[
            "top_prediction_3"
        ],
        "top_confidence_3": row[
            "top_confidence_3"
        ],
        "low_confidence": bool(
            row["low_confidence"]
        ),
        "warning": row["warning"],
        "created_at": row["created_at"],
        "date": created.strftime(
            "%Y-%m-%d"
        ),
        "time": created.strftime(
            "%H:%M:%S"
        ),
        "date_display": created.strftime(
            "%B %d, %Y"
        ),
        "time_display": created.strftime(
            "%I:%M %p"
        ).lstrip("0"),
        "is_archived": bool(
            row["is_archived"]
        ),
    }


# ============================================================
# PAGE ROUTES
# ============================================================

@app.route("/")
def home():
    return render_template(
        "index.html",
        model_ready=model_is_ready(),
        model_path=str(MODEL_PATH),
        min_confidence=int(
            MIN_CONFIDENCE * 100
        ),
        dataset_dir=str(DATASET_DIR),
    )


@app.route("/logs")
def logs_page():
    return render_template(
        "logs.html"
    )


@app.route("/archives")
def archives_page():
    return render_template(
        "archives.html"
    )


# ============================================================
# CAPTURED IMAGE ROUTE
# ============================================================

@app.route(
    "/media/captured/<path:filename>"
)
def captured_media(
    filename: str,
):
    safe_name = Path(filename).name

    return send_from_directory(
        CAPTURED_DIR,
        safe_name,
    )


# ============================================================
# STATUS
# ============================================================

@app.get("/api/status")
def api_status():
    return jsonify(
        {
            "success": True,
            "model_ready": model_is_ready(),
            "model_path": str(
                MODEL_PATH
            ),
            "model_message": (
                None
                if model_is_ready()
                else MODEL_MISSING_MESSAGE
            ),
            "dataset_dir": str(
                DATASET_DIR
            ),
            "captured_dir": str(
                CAPTURED_DIR
            ),
            "min_confidence": MIN_CONFIDENCE,
        }
    )


# ============================================================
# YOLO ANALYSIS
# ============================================================

@app.post("/api/analyze")
def api_analyze():
    init_db()

    payload = (
        request.get_json(
            silent=True
        )
        or {}
    )

    image_data = payload.get(
        "image"
    )

    now = datetime.now()

    try:
        image_bytes = decode_image_payload(
            image_data
        )

        rgb, quality_warnings = (
            validate_image_bytes(
                image_bytes
            )
        )

    except (
        ValueError,
        OSError,
    ) as error:

        return jsonify(
            {
                "success": False,
                "message": str(error),
            }
        ), 400

    CAPTURED_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    filename = unique_capture_name(
        now
    )

    save_path = (
        CAPTURED_DIR / filename
    )

    rgb.save(
        save_path,
        format="JPEG",
        quality=95,
    )

    try:
        stored_path = str(
            save_path.relative_to(
                BASE_DIR
            )
        ).replace(
            "\\",
            "/",
        )

    except ValueError:

        stored_path = str(
            save_path
        ).replace(
            "\\",
            "/",
        )

    created_at = now.isoformat(
        timespec="seconds"
    )

    warning_text = (
        " ".join(
            quality_warnings
        )
        if quality_warnings
        else None
    )

    # --------------------------------------------------------
    # MODEL NOT READY
    # --------------------------------------------------------

    if not model_is_ready():

        log_id = insert_log(
            image_path=stored_path,
            prediction=None,
            warning=MODEL_MISSING_MESSAGE,
            created_at=created_at,
        )

        return jsonify(
            {
                "success": False,
                "code": "MODEL_NOT_TRAINED",
                "message": MODEL_MISSING_MESSAGE,
                "image": public_image_url(
                    filename
                ),
                "image_path": stored_path,
                "saved": True,
                "log_id": log_id,
                "date": now.strftime(
                    "%Y-%m-%d"
                ),
                "time": now.strftime(
                    "%H:%M:%S"
                ),
                "date_display": now.strftime(
                    "%B %d, %Y"
                ),
                "time_display": now.strftime(
                    "%I:%M %p"
                ).lstrip("0"),
                "warnings": quality_warnings,
            }
        ), 409

    # --------------------------------------------------------
    # YOLO PREDICTION
    # --------------------------------------------------------

    try:
        prediction = predict_image(
            save_path
        )

    except ModelNotTrainedError as error:

        return jsonify(
            {
                "success": False,
                "code": "MODEL_NOT_TRAINED",
                "message": str(error),
            }
        ), 409

    except Exception as error:

        return jsonify(
            {
                "success": False,
                "message": (
                    f"YOLO analysis failed: "
                    f"{error}"
                ),
                "image": public_image_url(
                    filename
                ),
                "image_path": stored_path,
            }
        ), 500

    if quality_warnings:

        prediction["status"] = (
            f"{prediction['status']}. "
            f"{quality_warnings[0]}"
        )

    log_id = insert_log(
        image_path=stored_path,
        prediction=prediction,
        warning=warning_text,
        created_at=created_at,
    )

    top = prediction[
        "top_predictions"
    ]

    return jsonify(
        {
            "success": True,
            "log_id": log_id,
            "image": public_image_url(
                filename
            ),
            "image_path": stored_path,
            "predicted_day": prediction[
                "predicted_day"
            ],
            "raw_predicted_day": prediction[
                "raw_predicted_day"
            ],
            "development_stage": prediction[
                "development_stage"
            ],
            "confidence": prediction[
                "confidence"
            ],
            "low_confidence": prediction[
                "low_confidence"
            ],
            "status": prediction[
                "status"
            ],
            "top_predictions": top,
            "date": now.strftime(
                "%Y-%m-%d"
            ),
            "time": now.strftime(
                "%H:%M:%S"
            ),
            "date_display": now.strftime(
                "%B %d, %Y"
            ),
            "time_display": now.strftime(
                "%I:%M %p"
            ).lstrip("0"),
            "warnings": quality_warnings,
        }
    )


# ============================================================
# NORMAL / ACTIVE LOGS
# ============================================================

@app.get("/api/logs")
def api_logs():

    init_db()

    day = (
        request.args.get("day")
        or ""
    ).strip()

    date = (
        request.args.get("date")
        or ""
    ).strip()

    page = max(
        int(
            request.args.get(
                "page"
            )
            or 1
        ),
        1,
    )

    per_page = min(
        max(
            int(
                request.args.get(
                    "per_page"
                )
                or 10
            ),
            1,
        ),
        50,
    )

    # NORMAL LOGS ONLY
    clauses = [
        "is_archived = 0"
    ]

    params: list = []

    if day:

        clauses.append(
            "predicted_day LIKE ?"
        )

        params.append(
            f"%{day.replace('_', ' ')}%"
        )

    if date:

        clauses.append(
            "date(created_at) = ?"
        )

        params.append(date)

    where = (
        f"WHERE {' AND '.join(clauses)}"
    )

    with get_db() as connection:

        total = connection.execute(
            f"""
            SELECT COUNT(*) AS n
            FROM egg_logs
            {where}
            """,
            params,
        ).fetchone()["n"]

        rows = connection.execute(
            f"""
            SELECT *
            FROM egg_logs
            {where}
            ORDER BY
                datetime(created_at) DESC,
                id DESC
            LIMIT ? OFFSET ?
            """,
            [
                *params,
                per_page,
                (page - 1) * per_page,
            ],
        ).fetchall()

    return jsonify(
        {
            "success": True,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (
                (
                    total
                    + per_page
                    - 1
                )
                // per_page
                if total
                else 1
            ),
            "logs": [
                row_to_dict(row)
                for row in rows
            ],
        }
    )


# ============================================================
# ARCHIVED RECORDS
# ============================================================

@app.get("/api/archives")
def api_archives():

    init_db()

    day = (
        request.args.get("day")
        or ""
    ).strip()

    date = (
        request.args.get("date")
        or ""
    ).strip()

    page = max(
        int(
            request.args.get(
                "page"
            )
            or 1
        ),
        1,
    )

    per_page = min(
        max(
            int(
                request.args.get(
                    "per_page"
                )
                or 10
            ),
            1,
        ),
        50,
    )

    # ARCHIVED RECORDS ONLY
    clauses = [
        "is_archived = 1"
    ]

    params: list = []

    if day:

        clauses.append(
            "predicted_day LIKE ?"
        )

        params.append(
            f"%{day.replace('_', ' ')}%"
        )

    if date:

        clauses.append(
            "date(created_at) = ?"
        )

        params.append(date)

    where = (
        f"WHERE {' AND '.join(clauses)}"
    )

    with get_db() as connection:

        total = connection.execute(
            f"""
            SELECT COUNT(*) AS n
            FROM egg_logs
            {where}
            """,
            params,
        ).fetchone()["n"]

        rows = connection.execute(
            f"""
            SELECT *
            FROM egg_logs
            {where}
            ORDER BY
                datetime(created_at) DESC,
                id DESC
            LIMIT ? OFFSET ?
            """,
            [
                *params,
                per_page,
                (page - 1) * per_page,
            ],
        ).fetchall()

    return jsonify(
        {
            "success": True,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (
                (
                    total
                    + per_page
                    - 1
                )
                // per_page
                if total
                else 1
            ),
            "logs": [
                row_to_dict(row)
                for row in rows
            ],
        }
    )


# ============================================================
# SINGLE LOG
# ============================================================

@app.get(
    "/api/logs/<int:log_id>"
)
def api_log_detail(
    log_id: int,
):

    init_db()

    with get_db() as connection:

        row = connection.execute(
            """
            SELECT *
            FROM egg_logs
            WHERE id = ?
            """,
            (log_id,),
        ).fetchone()

    if row is None:

        return jsonify(
            {
                "success": False,
                "message": "Log not found",
            }
        ), 404

    return jsonify(
        {
            "success": True,
            "log": row_to_dict(
                row
            ),
        }
    )


# ============================================================
# ARCHIVE
# ============================================================

@app.post(
    "/api/logs/<int:log_id>/archive"
)
def archive_log(
    log_id: int,
):

    init_db()

    with get_db() as connection:

        row = connection.execute(
            """
            SELECT id, is_archived
            FROM egg_logs
            WHERE id = ?
            """,
            (log_id,),
        ).fetchone()

        if row is None:

            return jsonify(
                {
                    "success": False,
                    "message": "Log not found",
                }
            ), 404

        if row["is_archived"]:

            return jsonify(
                {
                    "success": False,
                    "message": (
                        "This detection is "
                        "already archived."
                    ),
                }
            ), 400

        connection.execute(
            """
            UPDATE egg_logs
            SET is_archived = 1
            WHERE id = ?
            """,
            (log_id,),
        )

        connection.commit()

    return jsonify(
        {
            "success": True,
            "message": (
                "Detection log archived "
                "successfully."
            ),
            "log_id": log_id,
        }
    )


# ============================================================
# RESTORE FROM ARCHIVE
# ============================================================

@app.post(
    "/api/logs/<int:log_id>/restore"
)
def restore_log(
    log_id: int,
):

    init_db()

    with get_db() as connection:

        row = connection.execute(
            """
            SELECT id, is_archived
            FROM egg_logs
            WHERE id = ?
            """,
            (log_id,),
        ).fetchone()

        if row is None:

            return jsonify(
                {
                    "success": False,
                    "message": "Log not found",
                }
            ), 404

        if not row["is_archived"]:

            return jsonify(
                {
                    "success": False,
                    "message": (
                        "This detection is "
                        "already active."
                    ),
                }
            ), 400

        connection.execute(
            """
            UPDATE egg_logs
            SET is_archived = 0
            WHERE id = ?
            """,
            (log_id,),
        )

        connection.commit()

    return jsonify(
        {
            "success": True,
            "message": (
                "Detection log restored "
                "successfully."
            ),
            "log_id": log_id,
        }
    )


# ============================================================
# DELETE FOREVER
# ============================================================

@app.delete(
    "/api/logs/<int:log_id>/permanent"
)
def delete_log_forever(
    log_id: int,
):

    init_db()

    with get_db() as connection:

        row = connection.execute(
            """
            SELECT
                id,
                image_path,
                is_archived
            FROM egg_logs
            WHERE id = ?
            """,
            (log_id,),
        ).fetchone()

        if row is None:

            return jsonify(
                {
                    "success": False,
                    "message": "Log not found",
                }
            ), 404

        # Safety rule:
        # DELETE FOREVER is allowed ONLY
        # for archived records.
        if not row["is_archived"]:

            return jsonify(
                {
                    "success": False,
                    "message": (
                        "Only archived records "
                        "can be permanently deleted."
                    ),
                }
            ), 400

        image_path = row[
            "image_path"
        ]

        connection.execute(
            """
            DELETE FROM egg_logs
            WHERE id = ?
            """,
            (log_id,),
        )

        connection.commit()

    # --------------------------------------------------------
    # Delete captured image AFTER DB deletion.
    # --------------------------------------------------------

    try:

        filename = Path(
            image_path
        ).name

        image_file = (
            CAPTURED_DIR / filename
        )

        # Extra safety:
        # Only delete files inside
        # CAPTURED_DIR.
        if (
            image_file.exists()
            and image_file.is_file()
        ):
            image_file.unlink()

    except (
        OSError,
        ValueError,
    ):
        pass

    return jsonify(
        {
            "success": True,
            "message": (
                "Archived detection and "
                "captured image were "
                "permanently deleted."
            ),
            "log_id": log_id,
        }
    )


# ============================================================
# SAVE LABELED IMAGE TO DATASET
# ============================================================

@app.post("/save-image")
def save_image():
    """Kept from the original app: save a labeled image into Day_* folders."""

    try:

        data = (
            request.get_json()
            or {}
        )

        image_data = data.get(
            "image"
        )

        stage = data.get(
            "stage"
        )

        if not image_data:

            return jsonify(
                {
                    "success": False,
                    "message": (
                        "No image received"
                    ),
                }
            ), 400

        if not stage:

            return jsonify(
                {
                    "success": False,
                    "message": (
                        "No stage selected"
                    ),
                }
            ), 400

        folder_name = (
            class_folder_from_display(
                stage
            )
        )

        if (
            folder_name
            not in ALLOWED_SAVE_DAYS
        ):

            return jsonify(
                {
                    "success": False,
                    "message": (
                        "Invalid stage"
                    ),
                }
            ), 400

        folder = (
            DATASET_DIR
            / folder_name
        )

        folder.mkdir(
            parents=True,
            exist_ok=True,
        )

        image_bytes = (
            decode_image_payload(
                image_data
            )
        )

        rgb, _warnings = (
            validate_image_bytes(
                image_bytes
            )
        )

        existing = [
            f
            for f in folder.iterdir()
            if f.suffix.lower()
            in {
                ".jpg",
                ".jpeg",
            }
        ]

        number = (
            len(existing) + 1
        )

        filename = (
            f"egg_{folder_name}_"
            f"{number:03d}.jpg"
        )

        filepath = (
            folder / filename
        )

        rgb.save(
            filepath,
            format="JPEG",
            quality=95,
        )

        return jsonify(
            {
                "success": True,
                "filename": filename,
                "path": str(filepath),
            }
        )

    except Exception as error:

        return jsonify(
            {
                "success": False,
                "message": str(error),
            }
        ), 500


# ============================================================
# STARTUP
# ============================================================

init_db()


if __name__ == "__main__":

    print()
    print(
        "======================================"
    )
    print(
        " CHICKEN EGG CANDLING COMPUTER VISION"
    )
    print(
        "======================================"
    )

    print(
        f"Dataset : {DATASET_DIR}"
    )

    print(
        f"Captures: {CAPTURED_DIR}"
    )

    print(
        f"Database: {DB_PATH}"
    )

    print(
        f"Model   : {MODEL_PATH}"
    )

    if model_is_ready():

        print(
            "Model status: trained model found"
        )

    else:

        print(
            "Model status:",
            MODEL_MISSING_MESSAGE,
        )

        print(
            "Train with: py prepare_dataset.py"
        )

        print(
            "            py train_model.py"
        )

    print(
        "Open: http://127.0.0.1:5000"
    )

    print(
        "======================================"
    )

    print()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )