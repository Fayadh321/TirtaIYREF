import io
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
from transformers import (
    SegformerImageProcessor,
    SegformerForSemanticSegmentation,
    AutoProcessor,
    AutoModelForZeroShotObjectDetection,
    SamModel,
    SamProcessor,
)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

CITYSCAPES_CLASSES = [
    "road", "sidewalk", "building", "wall", "fence", "pole",
    "traffic light", "traffic sign", "vegetation", "terrain", "sky",
    "person", "rider", "car", "truck", "bus", "train", "motorcycle", "bicycle",
]

FLOOD_CLASS_MAP = {
    "vegetation": [8, 9],
    "impervious": [0, 1, 2],
    "sky":        [10],
}

DRAINAGE_TEXT      = "drainage channel . concrete gutter . roadside gutter . open drain . selokan"
DRAINAGE_THRESHOLD = 0.15

WEIGHTS = {"impervious": 0.5, "vegetation": 0.3, "drainage": 0.2}


class VisualAnalyzer:
    def __init__(self):
        self.seg_processor = SegformerImageProcessor.from_pretrained(
            "nvidia/segformer-b0-finetuned-cityscapes-512-1024"
        )
        self.seg_model = SegformerForSemanticSegmentation.from_pretrained(
            "nvidia/segformer-b0-finetuned-cityscapes-512-1024"
        ).to(DEVICE)
        self.seg_model.eval()

        self.gdino_processor = AutoProcessor.from_pretrained("IDEA-Research/grounding-dino-tiny")
        self.gdino_model = AutoModelForZeroShotObjectDetection.from_pretrained(
            "IDEA-Research/grounding-dino-tiny"
        ).to(DEVICE)
        self.gdino_model.eval()

        self.sam_processor = SamProcessor.from_pretrained("facebook/sam-vit-base")
        self.sam_model = SamModel.from_pretrained("facebook/sam-vit-base").to(DEVICE)
        self.sam_model.eval()

    def _run_segformer(self, image: Image.Image) -> np.ndarray:
        inputs = self.seg_processor(images=image, return_tensors="pt")
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
        with torch.inference_mode():
            outputs = self.seg_model(**inputs)
        upsampled = F.interpolate(
            outputs.logits,
            size=(image.size[1], image.size[0]),
            mode="bilinear",
            align_corners=False,
        )
        return upsampled.argmax(dim=1).squeeze().cpu().numpy()

    def _run_grounded_sam(self, image: Image.Image) -> np.ndarray:
        inputs = self.gdino_processor(
            images=image, text=DRAINAGE_TEXT, return_tensors="pt"
        ).to(DEVICE)
        with torch.inference_mode():
            outputs = self.gdino_model(**inputs)

        results = self.gdino_processor.post_process_grounded_object_detection(
            outputs,
            inputs["input_ids"],
            target_sizes=[image.size[::-1]],
        )[0]

        keep  = results["scores"] >= DRAINAGE_THRESHOLD
        boxes = results["boxes"][keep].cpu().numpy()

        if len(boxes) == 0:
            return np.zeros((image.size[1], image.size[0]), dtype=np.uint8)

        sam_inputs = self.sam_processor(
            images=image, input_boxes=[boxes.tolist()], return_tensors="pt"
        ).to(DEVICE)
        with torch.inference_mode():
            sam_outputs = self.sam_model(**sam_inputs)

        masks = self.sam_processor.post_process_masks(
            sam_outputs.pred_masks.cpu(),
            sam_inputs["original_sizes"].cpu(),
            sam_inputs["reshaped_input_sizes"].cpu(),
        )[0]

        return masks[:, 0, :, :].any(dim=0).numpy().astype(np.uint8)

    def _calculate_areas(self, seg_map: np.ndarray, drainage_mask: np.ndarray) -> dict:
        total     = seg_map.size
        sky_px    = sum(int((seg_map == c).sum()) for c in FLOOD_CLASS_MAP["sky"])
        veg_px    = sum(int((seg_map == c).sum()) for c in FLOOD_CLASS_MAP["vegetation"])
        imperv_px = sum(int((seg_map == c).sum()) for c in FLOOD_CLASS_MAP["impervious"])
        drain_px  = int(drainage_mask.sum())
        effective = max(total - sky_px, 1)
        return {
            "vegetation_ratio":  veg_px    / effective,
            "impervious_ratio":  imperv_px / effective,
            "drainage_ratio":    drain_px  / effective,
        }

    def _calculate_fri(self, areas: dict) -> float:
        raw = (
            areas["impervious_ratio"] * WEIGHTS["impervious"]
            - areas["vegetation_ratio"]  * WEIGHTS["vegetation"]
            - areas["drainage_ratio"]    * WEIGHTS["drainage"]
        )
        return float(max(0.0, min(1.0, raw / 0.5)))

    def _risk_label(self, fri: float) -> str:
        if fri < 0.3:
            return "LOW"
        if fri < 0.6:
            return "MEDIUM"
        return "HIGH"

    def analyze(self, image_bytes: bytes) -> dict:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        seg_map       = self._run_segformer(image)
        drainage_mask = self._run_grounded_sam(image)
        areas         = self._calculate_areas(seg_map, drainage_mask)
        fri           = self._calculate_fri(areas)

        return {
            "fri_score":         round(fri, 4),
            "risk_level":        self._risk_label(fri),
            "vegetation_ratio":  round(areas["vegetation_ratio"],  4),
            "impervious_ratio":  round(areas["impervious_ratio"],  4),
            "drainage_ratio":    round(areas["drainage_ratio"],    4),
        }
