# tirta-models

Flood Risk Indicator (FRI) analysis service using computer vision.

**Pipeline:** SegFormer-B0 (semantic segmentation) + Grounded SAM (drainage detection) → FRI score

---

## Setup

```bash
uv venv
uv sync
```

**Activate venv (optional — only needed if running python/uvicorn directly):**

```bash
# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate
```

> `uv run` already uses the venv automatically — no need to activate if using `uv run`.

## Run

```bash
# Recommended (no activation needed)
uv run uvicorn src.main:app --reload --port 8000

# Or with venv activated
uvicorn src.main:app --reload --port 8000
```

Models are downloaded from HuggingFace on first run (~1–2 GB). Subsequent runs load from cache.

---

## Endpoints

### `GET /health`

Check if service is running and models are loaded.

**Response**
```json
{
  "status": "ok",
  "models_loaded": true
}
```

---

### `POST /analyze`

Analyze one or more streetview images and return FRI scores.

**Request** — `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `files` | `File[]` | One or more image files (jpg, png, webp) |

**Example — curl**
```bash
# Single photo
curl -X POST http://localhost:8000/analyze \
  -F "files=@photo.jpg"

# Multiple photos
curl -X POST http://localhost:8000/analyze \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg"
```

**Example — JavaScript (fetch)**
```js
const form = new FormData()
photos.forEach(f => form.append("files", f))

const res = await fetch("http://localhost:8000/analyze", {
  method: "POST",
  body: form,
})
const data = await res.json()
```

**Response**
```json
{
  "aggregate": {
    "fri_score": 0.1500,
    "risk_level": "LOW",
    "vegetation_ratio": 0.4200,
    "impervious_ratio": 0.4300,
    "drainage_ratio": 0.0480
  },
  "per_photo": [
    {
      "fri_score": 0.1302,
      "risk_level": "LOW",
      "vegetation_ratio": 0.4410,
      "impervious_ratio": 0.4156,
      "drainage_ratio": 0.0531
    },
    {
      "fri_score": 0.1698,
      "risk_level": "LOW",
      "vegetation_ratio": 0.3990,
      "impervious_ratio": 0.4444,
      "drainage_ratio": 0.0429
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `aggregate` | object | Averaged ratios across all photos, FRI recalculated from average |
| `per_photo` | array | Individual result per uploaded photo, in submission order |
| `fri_score` | float [0–1] | Flood Risk Indicator score |
| `risk_level` | string | `LOW` < 0.3 · `MEDIUM` 0.3–0.6 · `HIGH` > 0.6 |
| `vegetation_ratio` | float [0–1] | Fraction of effective pixels classified as vegetation/terrain |
| `impervious_ratio` | float [0–1] | Fraction of effective pixels classified as road/sidewalk/building |
| `drainage_ratio` | float [0–1] | Fraction of effective pixels detected as drainage channels |

**FRI formula**
```
FRI = (impervious × 0.5) − (vegetation × 0.3) − (drainage × 0.2)
     normalized to [0, 1]
```

---

## Project Structure

```
tirta-models/
  src/
    main.py              # FastAPI app instance + lifespan
    api/
      routes.py          # Endpoints + aggregation logic
    core/
      visual_analyzer.py # VisualAnalyzer — model loading & inference
  pyproject.toml
```
