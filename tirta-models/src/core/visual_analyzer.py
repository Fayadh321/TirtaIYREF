import io
import sys
import pathlib

import cv2
import torch
import numpy as np
import torch.nn.functional as F

from PIL import Image

from transformers import (
    SegformerImageProcessor,
    SegformerForSemanticSegmentation,
)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

"""
CITYSCAPES LABELS
0  = road
1  = sidewalk
2  = building
8  = vegetation
9  = terrain
10 = sky
"""

FLOOD_CLASS_MAP = {
    "vegetation": [8],
    "soil": [9],
    "impervious": [0, 1],
    "building": [2],
    "sky": [10],
}

WEIGHTS = {
    # increase flood risk
    "impervious": 0.35,
    "building":   0.30,
    # reduce flood risk
    "vegetation": 0.15,
    "soil":       0.10,
}


def clean_mask(mask: np.ndarray) -> np.ndarray:
    """
    Cleanup segmentation noise
    """
    kernel_small = np.ones((3, 3), np.uint8)
    kernel_large = np.ones((7, 7), np.uint8)

    # remove tiny noise
    mask = cv2.morphologyEx(
        mask.astype(np.uint8),
        cv2.MORPH_OPEN,
        kernel_small
    )

    # fill holes
    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_CLOSE,
        kernel_large
    )

    return mask

class VisualAnalyzer:
    def __init__(self):
        print(f"[VisualAnalyzer] Init on {DEVICE}...")

        MODEL_NAME = (
            "nvidia/segformer-b5-finetuned-cityscapes-1024-1024"
        )

        self.seg_processor = (
            SegformerImageProcessor.from_pretrained(
                MODEL_NAME
            )
        )

        self.seg_model = (
            SegformerForSemanticSegmentation.from_pretrained(
                MODEL_NAME
            ).to(DEVICE)
        )

        self.seg_model.eval()

        print("[VisualAnalyzer] Ready.")

    def _run_segformer(
        self,
        image: Image.Image
    ) -> np.ndarray:
        inputs = self.seg_processor(
            images=image,
            return_tensors="pt"
        )

        inputs = {
            k: v.to(DEVICE)
            for k, v in inputs.items()
        }

        with torch.inference_mode():

            outputs = self.seg_model(**inputs)

        upsampled = F.interpolate(
            outputs.logits,
            size=(image.size[1], image.size[0]),
            mode="bilinear",
            align_corners=False,
        )

        seg_map = (
            upsampled
            .argmax(dim=1)
            .squeeze()
            .cpu()
            .numpy()
        )

        return seg_map

    def _calculate_areas(
        self,
        seg_map: np.ndarray
    ):
        total = seg_map.size

        sky_px = sum(
            int((seg_map == c).sum())
            for c in FLOOD_CLASS_MAP["sky"]
        )

        effective = max(total - sky_px, 1)

        vegetation_px = sum(
            int((seg_map == c).sum())
            for c in FLOOD_CLASS_MAP["vegetation"]
        )

        soil_px = sum(
            int((seg_map == c).sum())
            for c in FLOOD_CLASS_MAP["soil"]
        )

        impervious_px = sum(
            int((seg_map == c).sum())
            for c in FLOOD_CLASS_MAP["impervious"]
        )

        building_px = sum(
            int((seg_map == c).sum())
            for c in FLOOD_CLASS_MAP["building"]
        )

        return {
            "vegetation_ratio": vegetation_px / effective,
            "soil_ratio": soil_px / effective,
            "impervious_ratio": impervious_px / effective,
            "building_ratio": building_px / effective,
        }
    
    def _calculate_fri(
        self,
        areas: dict
    ) -> float:
        raw = (areas["impervious_ratio"] * WEIGHTS["impervious"] + areas["building_ratio"] * WEIGHTS["building"] - areas["vegetation_ratio"] * WEIGHTS["vegetation"] - areas["soil_ratio"] * WEIGHTS["soil"])

        density_bonus = (areas["building_ratio"] ** 2) * 0.60

        raw += density_bonus

        if areas["building_ratio"] > 0.70:
            raw += 0.25

        fri = max(0.0, min(1.0, raw))

        return float(fri)

    def _risk_label(
        self,
        fri: float
    ) -> str:
        if fri < 0.30:
            return "LOW"
        if fri < 0.60:
            return "MEDIUM"

        return "HIGH"

    def _generate_overlay(
        self,
        image: Image.Image,
        seg_map: np.ndarray
    ) -> bytes:
        overlay = image.convert("RGBA").copy()

        draw = Image.new("RGBA", image.size, (0, 0, 0, 0))

        def paste(
            mask_np,
            color,
            alpha,
            apply_clean=False
        ):
            if apply_clean:
                mask_np = clean_mask(mask_np)

            m = Image.fromarray((mask_np * alpha).astype(np.uint8)).convert("L")

            draw.paste(color, (0, 0), m)

        vegetation = np.zeros_like(seg_map)

        for c in FLOOD_CLASS_MAP["vegetation"]:
            vegetation[seg_map == c] = 1

        paste(
            vegetation,
            (0, 255, 0, 120),
            120,
            apply_clean=True
        )

        soil = np.zeros_like(seg_map)

        for c in FLOOD_CLASS_MAP["soil"]:
            soil[seg_map == c] = 1

        paste(
            soil,
            (139, 69, 19, 120),
            120,
            apply_clean=True
        )

        impervious = np.zeros_like(seg_map)

        for c in FLOOD_CLASS_MAP["impervious"]:
            impervious[seg_map == c] = 1

        paste(
            impervious,
            (255, 180, 0, 120),
            120,
            apply_clean=False
        )

        building = np.zeros_like(seg_map)

        for c in FLOOD_CLASS_MAP["building"]:
            building[seg_map == c] = 1

        paste(
            building,
            (255, 0, 0, 140),
            140,
            apply_clean=False
        )

        # combine
        combined = Image.alpha_composite(
            overlay,
            draw
        ).convert("RGB")

        buf = io.BytesIO()

        combined.save(
            buf,
            format="JPEG",
            quality=95
        )

        return buf.getvalue()

    def analyze_with_overlay(
        self,
        image_bytes: bytes
    ):
        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")

        # segmentation
        seg_map = self._run_segformer(image)

        # area composition
        areas = self._calculate_areas(seg_map)

        # calculate fri
        fri = self._calculate_fri(areas)

        result = {
            "fri_score": round(fri, 4),
            "risk_level": self._risk_label(fri),
            "vegetation_ratio": round(areas["vegetation_ratio"], 4),
            "soil_ratio": round(areas["soil_ratio"], 4),
            "impervious_ratio": round(areas["impervious_ratio"], 4),
            "building_ratio": round(areas["building_ratio"], 4),
        }

        # overlay
        overlay = self._generate_overlay(image, seg_map)

        return result, overlay


if __name__ == "__main__":
    if len(sys.argv) < 2:

        print(
            "Usage:\n"
            "python visual_analyzer.py <image>"
        )

        sys.exit(1)

    img_path = pathlib.Path(sys.argv[1])
    analyzer = VisualAnalyzer()
    with open(img_path, "rb") as f:
        raw = f.read()
    result, overlay = analyzer.analyze_with_overlay(raw)
    print("\n── RESULT ─────────────────────")
    for k, v in result.items():
        print(f"{k}: {v}")

    out_path = img_path.with_stem(
        img_path.stem + "_overlay"
    ).with_suffix(".jpg")
    out_path.write_bytes(overlay)
    print(f"\nSaved overlay -> {out_path}")