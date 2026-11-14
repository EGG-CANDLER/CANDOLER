"""Real YOLO inference tests (marked slow — requires models/egg_candling_best.pt).

These tests run the actual trained model on real sample images to verify the
prediction pipeline end to end. They are skipped if the model file is missing.
"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from predict import MODEL_MISSING_MESSAGE, model_is_ready, predict_image  # noqa: E402

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "egg_candling_best.pt")
SAMPLE_IMAGE = os.path.join(os.path.dirname(__file__), "fixtures", "sample_day_14.jpg")


@pytest.mark.slow
def test_real_inference_on_sample_image():
    """Run real inference on a sample egg image and verify output format."""
    if not model_is_ready():
        pytest.skip(MODEL_MISSING_MESSAGE)

    result = predict_image(SAMPLE_IMAGE)

    # Output format must match what /api/analyze returns
    assert result["success"] is True
    assert isinstance(result["predicted_class"], str)
    assert result["predicted_day"] is None or isinstance(result["predicted_day"], str)
    assert isinstance(result["raw_predicted_day"], str)
    assert result["development_stage"] is None or isinstance(result["development_stage"], str)
    assert isinstance(result["confidence"], float)
    assert isinstance(result["low_confidence"], bool)
    assert isinstance(result["status"], str)
    assert isinstance(result["top_predictions"], list)
    assert len(result["top_predictions"]) > 0

    # Confidence consistency
    assert 0.0 <= result["confidence"] <= 100.0
    # top_predictions[0] confidence matches the top-level confidence
    assert result["top_predictions"][0]["confidence"] == result["confidence"]

    # Low confidence implies no predicted_day / stage
    if result["low_confidence"]:
        assert result["predicted_day"] is None
        assert result["development_stage"] is None


@pytest.mark.slow
def test_real_inference_output_matches_api_shape():
    """Verify predict_image output keys match /api/analyze response fields."""
    if not model_is_ready():
        pytest.skip(MODEL_MISSING_MESSAGE)

    result = predict_image(SAMPLE_IMAGE)

    # These are the fields /api/analyze reads from predict_image output
    required_keys = {
        "predicted_class",
        "predicted_day",
        "raw_predicted_day",
        "development_stage",
        "confidence",
        "confidence_raw",
        "low_confidence",
        "min_confidence",
        "status",
        "top_predictions",
    }
    missing = required_keys - set(result.keys())
    assert not missing, f"Missing keys in predict_image output: {missing}"

    # top_predictions items must have day + confidence
    for item in result["top_predictions"]:
        assert "day" in item
        assert "confidence" in item
