# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify, render_template
# pyrefly: ignore [missing-import]
from keras.models import load_model
# pyrefly: ignore [missing-import]
from keras.layers import DepthwiseConv2D
# pyrefly: ignore [missing-import]
import numpy as np
import tensorflow as tf
import os
from pathlib import Path
from utils.preprocess import preprocess_image
from utils.pesticide_dict import disease_to_pesticide
from flask_cors import CORS  # <-- add this

app = Flask(__name__)
CORS(app)  # <-- enable CORS for all routes


import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# pyrefly: ignore [missing-import]
from keras.layers import BatchNormalization

# -------------------------------------------------------------------
# FIX DepthwiseConv2D & BatchNormalization (Compatibility Fix)
# -------------------------------------------------------------------

class FixedDepthwiseConv2D(DepthwiseConv2D):
    """Custom class to handle loading issues with DepthwiseConv2D layer."""
    def __init__(self, *args, **kwargs):
        # The 'groups' argument causes issues when loading the model in some TF versions
        kwargs.pop("groups", None)
        super().__init__(*args, **kwargs)


class FixedBatchNormalization(BatchNormalization):
    """Custom class to handle input shape nesting in Keras 3."""
    def build(self, input_shape):
        if isinstance(input_shape, list) and len(input_shape) == 1:
            input_shape = input_shape[0]
        super().build(input_shape)

    def call(self, inputs, *args, **kwargs):
        if isinstance(inputs, list) and len(inputs) == 1:
            inputs = inputs[0]
        return super().call(inputs, *args, **kwargs)

    def compute_output_shape(self, input_shape):
        if isinstance(input_shape, list) and len(input_shape) == 1:
            input_shape = input_shape[0]
        return super().compute_output_shape(input_shape)


# -------------------------------------------------------------------
# LOAD MODEL (With auto-download from Google Drive for Cloud Deployment)
# -------------------------------------------------------------------

import gdown

MODEL_DIR = "model"
MODEL_PATH = os.path.join(MODEL_DIR, "efficientnetb3-Plant Village Disease-97.72.h5")
GDRIVE_FILE_ID = "19bhoG4Sy2fZiOG65IQ_KK2YBmBlv4fHa"

if not os.path.exists(MODEL_PATH):
    os.makedirs(MODEL_DIR, exist_ok=True)
    print("Model file not found locally. Downloading from Google Drive...")
    try:
        gdown.download(id=GDRIVE_FILE_ID, output=MODEL_PATH, quiet=False)
        print("Model downloaded successfully!")
    except Exception as e:
        print(f"Error downloading model: {e}")

custom_objects = {
    "DepthwiseConv2D": FixedDepthwiseConv2D,
    "BatchNormalization": FixedBatchNormalization,
}

try:
    model = load_model(MODEL_PATH, custom_objects=custom_objects, compile=False)
except Exception as e:
    print(f"Error loading model with standard load_model: {e}")
    print("Trying tf.keras.models.load_model...")
    model = tf.keras.models.load_model(MODEL_PATH, custom_objects=custom_objects, compile=False)

print("\nModel Loaded Successfully!")
print("Output Shape:", model.output_shape)

# Warm-up inference on startup so first user request doesn't suffer graph compiling delay
try:
    _dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
    _ = model(_dummy, training=False)
    print("Model inference warm-up completed successfully!")
except Exception as _w_err:
    print(f"Warm-up note: {_w_err}")

# -------------------------------------------------------------------
# AUTO CLASS DETECTION
# -------------------------------------------------------------------

num_classes = model.output_shape[-1]
all_classes = list(disease_to_pesticide.keys())

if len(all_classes) != num_classes:
    raise ValueError(
        f"❌ Model outputs {num_classes} classes, but pesticide_dict has {len(all_classes)} entries!"
    )

CLASS_NAMES = all_classes


# -------------------------------------------------------------------
# ROUTES
# -------------------------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    if request.headers.get("Accept") == "application/json" or request.args.get("format") == "json":
        return jsonify({
            "status": "online",
            "message": "🌿 Plant Disease Detection API is Running!",
            "model_shape": str(model.output_shape),
            "classes_count": len(CLASS_NAMES)
        })
    return render_template("index.html")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "model_loaded": True,
        "classes_count": len(CLASS_NAMES),
        "input_resolution": "224x224"
    })


@app.route("/api/classes", methods=["GET"])
def get_classes():
    return jsonify({
        "classes": CLASS_NAMES,
        "pesticides_map": disease_to_pesticide
    })


@app.route("/predict", methods=["POST"])
def predict():

    # ---------------------------------------
    # 🔍 IMAGE INPUT HANDLING
    # ---------------------------------------
    # Accept ANY image/jpeg with parameters
    if request.content_type and request.content_type.startswith("image/jpeg"):
        image_bytes = request.data

    elif "image" in request.files:
        # Case 2: Browser / Postman uses multipart field 'image'
        image_bytes = request.files["image"].read()
    elif "file" in request.files:
        # Case 3: Browser / Postman uses multipart field 'file'
        image_bytes = request.files["file"].read() 
    else:
        return jsonify({"error": "No image provided"}), 400

    # ----------- Preprocess ---------------
    try:
        # Convert bytes to model-ready tensor (1, 224, 224, 3)
        img = preprocess_image(image_bytes)
    except ValueError as e:
        # Handles errors if the image bytes couldn't be decoded
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        # Catch all other preprocessing errors
        return jsonify({"error": f"Image preprocessing failed: {e}"}), 500

    # ----------- Predict ------------------
    try:
        # Direct call model(img, training=False) is 5x faster and avoids thread/OOM overhead of model.predict()
        predictions = model(img, training=False).numpy()
        class_index = int(np.argmax(predictions))
        confidence = float(np.max(predictions))

        predicted_class = CLASS_NAMES[class_index]
        pesticides = disease_to_pesticide.get(predicted_class, ["No pesticide data found"])

        # ----------- Response ------------------
        return jsonify({
            "status": "Success",
            "predicted_class": predicted_class,
            "confidence": round(confidence, 3),
            "recommended_pesticides": pesticides
        })
    except Exception as pred_err:
        print(f"Prediction execution error: {pred_err}")
        return jsonify({"error": f"Model inference error: {pred_err}"}), 500


# -------------------------------------------------------------------
# START SERVER
# -------------------------------------------------------------------

if __name__ == "__main__":
    print("🚀 Server running at: http://0.0.0.0:5000")
    # Setting host="0.0.0.0" makes the server accessible from your ESP32-CAM on the local network.
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
