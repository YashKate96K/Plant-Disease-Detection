---
title: FloraScan AI - Plant Disease Detection
emoji: 🌿
colorFrom: green
colorTo: emerald
sdk: docker
app_port: 7860
pinned: false
---

# 🌿 Plant Disease Detection API

A Flask-based REST API powered by a deep learning model (**EfficientNetB3**) trained on the PlantVillage dataset to classify plant leaf diseases into 38 distinct classes and provide targeted pesticide recommendations.

---

## 📁 Project Structure

```text
plant_disease_api/
│
├── model/
│   └── efficientnetb3-Plant Village Disease-97.72.h5   # Trained EfficientNetB3 model (38 classes)
│
├── utils/
│   ├── __init__.py
│   ├── preprocess.py                                  # Image preprocessing (OpenCV, resizing to 224x224)
│   └── pesticide_dict.py                              # Mapping of 38 disease classes to pesticides
│
├── app.py                                             # Main Flask application and REST endpoints
├── requirements.txt                                   # Python dependencies
└── README.md                                          # Documentation
```

---

## 🚀 How to Run

### Step 1: Clone or Navigate to the Project Folder
Open your terminal (PowerShell, Command Prompt, or Bash) in this directory:
```bash
cd "plant_disease_api"
```

### Step 2: (Recommended) Create & Activate a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Start the Server
```bash
python app.py
```
The server will start at:
```
http://0.0.0.0:5000
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser to access the **FloraScan AI Web Diagnostic Studio**.

---

## 💻 Web User Interface Features

Access the web interface at `http://localhost:5000`:
- **Drag-and-Drop / Browse Upload**: Directly drag any leaf photo or click "Browse Image".
- **Camera Capture**: Click "Camera Capture" to snap a leaf photo directly on mobile or laptop.
- **Clipboard Paste (`Ctrl + V`)**: Copy any image or screenshot and press `Ctrl + V` anywhere on the page to paste and analyze instantly.
- **⚡ Instant 1-Click Samples**: Test immediately with preloaded sample leaves (e.g., Tomato Late Blight, Healthy Apple).
- **Interactive Laser Scanner**: Animated laser diagnostic line scanning the leaf while computing predictions.
- **Detailed Diagnosis & Treatments**:
  - Plant health indicator (Healthy vs. Diseased).
  - Crop & specific disease identification.
  - Confidence meter gauge.
  - Recommended chemical and organic pesticide treatments.
  - One-click "Copy Diagnosis Report" button.
- **Session History**: Keep track of recent scans during your session.
- **38-Disease Encyclopedia**: Search and explore all 38 supported crop diseases and treatments in real time.


---

## 📡 API Endpoints

### 1. Health Check
* **Endpoint:** `GET /`
* **Response:**
```text
🌿 Plant Disease Detection API is Running!
```

---

### 2. Predict Disease & Get Pesticides
* **Endpoint:** `POST /predict`
* **Input Formats Accepted:**
  1. **Multipart Form Data** with key `image` or `file` (standard for web forms, Postman, mobile apps)
  2. **Raw JPEG Byte Stream** with `Content-Type: image/jpeg` (standard for microcontrollers like ESP32-CAM)

#### Example 1: Using cURL (Multipart Form Data)
```bash
curl -X POST -F "image=@sample_leaf.jpg" http://127.0.0.1:5000/predict
```

#### Example 2: Using cURL (Raw Binary JPEG Stream)
```bash
curl -X POST -H "Content-Type: image/jpeg" --data-binary "@sample_leaf.jpg" http://127.0.0.1:5000/predict
```

#### Example 3: Using Python (`requests`)
```python
import requests

url = "http://127.0.0.1:5000/predict"
with open("sample_leaf.jpg", "rb") as f:
    response = requests.post(url, files={"image": f})

print(response.json())
```

#### Example Response:
```json
{
  "status": "Success",
  "predicted_class": "Tomato___Late_blight",
  "confidence": 0.985,
  "recommended_pesticides": [
    "Metalaxyl",
    "Cymoxanil"
  ]
}
```

---

## 🌾 Supported Crops & Diseases (38 Classes)
- **Apple:** Apple scab, Black rot, Cedar apple rust, Healthy
- **Blueberry:** Healthy
- **Cherry:** Powdery mildew, Healthy
- **Corn (Maize):** Cercospora leaf spot / Gray leaf spot, Common rust, Northern Leaf Blight, Healthy
- **Grape:** Black rot, Esca (Black Measles), Leaf blight (Isariopsis Leaf Spot), Healthy
- **Orange:** Huanglongbing (Citrus greening)
- **Peach:** Bacterial spot, Healthy
- **Pepper (Bell):** Bacterial spot, Healthy
- **Potato:** Early blight, Late blight, Healthy
- **Raspberry:** Healthy
- **Soybean:** Healthy
- **Squash:** Powdery mildew
- **Strawberry:** Leaf scorch, Healthy
- **Tomato:** Bacterial spot, Early blight, Late blight, Leaf Mold, Septoria leaf spot, Spider mites, Target Spot, Yellow Leaf Curl Virus, Mosaic virus, Healthy