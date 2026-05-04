#!/usr/bin/env python3
import json
import sys
from pathlib import Path

from rapidocr import RapidOCR


def main() -> int:
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: rapidocr_runner.py <image_path>"}), file=sys.stderr)
        return 2

    image_path = Path(sys.argv[1])
    if not image_path.exists():
        print(json.dumps({"error": "Image file not found"}), file=sys.stderr)
        return 2

    engine = RapidOCR()
    result = engine(str(image_path))

    boxes = getattr(result, "boxes", None)
    txts = getattr(result, "txts", None) or []
    scores = getattr(result, "scores", None) or []
    img = getattr(result, "img", None)

    lines = []
    for index, text in enumerate(txts):
        box = None
        if boxes is not None and index < len(boxes):
            raw_box = boxes[index]
            box = [[float(point[0]), float(point[1])] for point in raw_box]

        score = None
        if index < len(scores):
            score = float(scores[index])

        lines.append(
            {
                "text": str(text),
                "score": score,
                "box": box,
            }
        )

    image = None
    if img is not None and hasattr(img, "shape") and len(img.shape) >= 2:
        image = {
            "height": int(img.shape[0]),
            "width": int(img.shape[1]),
        }

    print(
        json.dumps(
            {
                "lines": lines,
                "image": image,
                "elapsed": float(getattr(result, "elapse", 0) or 0),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
