from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from src.core.visual_analyzer import WEIGHTS

router = APIRouter()


def aggregate(results: list[dict]) -> dict:
    veg    = sum(r["vegetation_ratio"]  for r in results) / len(results)
    imperv = sum(r["impervious_ratio"]  for r in results) / len(results)
    drain  = sum(r["drainage_ratio"]    for r in results) / len(results)

    raw = imperv * WEIGHTS["impervious"] - veg * WEIGHTS["vegetation"] - drain * WEIGHTS["drainage"]
    fri = float(max(0.0, min(1.0, raw / 0.5)))

    if fri < 0.3:
        risk = "LOW"
    elif fri < 0.6:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

    return {
        "fri_score":        round(fri,    4),
        "risk_level":       risk,
        "vegetation_ratio": round(veg,    4),
        "impervious_ratio": round(imperv, 4),
        "drainage_ratio":   round(drain,  4),
    }


@router.get("/health")
def health(request: Request):
    return {"status": "ok", "models_loaded": request.app.state.analyzer is not None}


@router.post("/analyze")
async def analyze(request: Request, files: list[UploadFile] = File(...)):
    for f in files:
        if not f.content_type or not f.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"{f.filename} is not an image")

    analyzer = request.app.state.analyzer
    results  = []
    for f in files:
        image_bytes = await f.read()
        results.append(analyzer.analyze(image_bytes))

    if len(results) == 1:
        return {"aggregate": results[0], "per_photo": results}

    return {"aggregate": aggregate(results), "per_photo": results}
