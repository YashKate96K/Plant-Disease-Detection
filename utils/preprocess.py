import numpy as np
import cv2
# Import the specific preprocessing function
from tensorflow.keras.applications.efficientnet import preprocess_input 

def preprocess_image(image_bytes):
    """
    Converts raw JPEG bytes → CV2 image → resized normalized tensor
    Output: (1,224,224,3)
    """
    # Convert byte stream to NumPy array
    image_array = np.frombuffer(image_bytes, np.uint8)

    # Decode JPEG → BGR image
    img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Failed to decode image. Input bytes are not a valid JPEG.")

    # Convert BGR → RGB for Keras models
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Resize to model input size (ensure this is 224x224 as required by B3)
    img = cv2.resize(img, (224, 224))
    
    # --- CRITICAL FIX: Replace Basic 0-1 Scaling with EfficientNet Preprocessing ---

    # 1. Convert to float32 (required before Keras preprocessing)
    img = img.astype("float32")
    
    # 2. Apply EfficientNet's specific normalization 
    # This involves scaling the pixel values to the [-1, 1] range.
    img = preprocess_input(img) 

    # --- END CRITICAL FIX ---

    # Add batch dimension
    img = np.expand_dims(img, axis=0)

    return img
