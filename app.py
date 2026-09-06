from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
from tensorflow.keras.layers import DepthwiseConv2D
import numpy as np
import tensorflow as tf
import os
from pathlib import Path
from utils.preprocess import preprocess_image
from utils.pesticide_dict import disease_to_pesticide
from flask_cors import CORS  # <-- add this

app = Flask(__name__)
CORS(app)  # <-- enable CORS for all routes


# -------------------------------------------------------------------
# FIX DepthwiseConv2D (Needed for EfficientNetB3 compatibility)
# -------------------------------------------------------------------

class FixedDepthwiseConv2D(DepthwiseConv2D):
    """Custom class to handle loading issues with DepthwiseConv2D layer."""
    def __init__(self, *args, **kwargs):
        # The 'groups' argument causes issues when loading the model in some TF versions
        kwargs.pop("groups", None)
        super().__init__(*args, **kwargs)




# -------------------------------------------------------------------
# LOAD MODEL
# -------------------------------------------------------------------

MODEL_PATH = "model/efficientnetb3-Plant Village Disease-97.72.h5"

custom_objects = {"DepthwiseConv2D": FixedDepthwiseConv2D}

try:
    model = load_model(MODEL_PATH, custom_objects=custom_objects)
except Exception as e:
    print("⚠ Error loading model:", e)
    print("Trying compile=False...")
    model = tf.keras.models.load_model(MODEL_PATH, custom_objects=custom_objects, compile=False)

print("\n✅ Model Loaded Successfully!")
print("Output Shape:", model.output_shape)

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
    return "🌿 Plant Disease Detection API is Running!"


@app.route("/predict", methods=["POST"])
def predict():

    # ---------------------------------------
    # 🔍 IMAGE INPUT HANDLING
    # ---------------------------------------
    # Accept ANY image/jpeg with parameters
    if request.content_type and request.content_type.startswith("image/jpeg"):
        image_bytes = request.data
+
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
    predictions = model.predict(img)
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


# -------------------------------------------------------------------
# START SERVER
# -------------------------------------------------------------------

if __name__ == "__main__":
    print("🚀 Server running at: http://0.0.0.0:5000")
    # Setting host="0.0.0.0" makes the server accessible from your ESP32-CAM on the local network.
    app.run(host="0.0.0.0", port=5000)
