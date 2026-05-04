#!/usr/bin/env python3
import json
import sys
from pathlib import Path

from rapidocr import RapidOCR


def parse_image(engine: RapidOCR, image_path: Path) -> dict:
    if not image_path.exists():
        raise FileNotFoundError("Image file not found")

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

    return {
        "lines": lines,
        "image": image,
        "elapsed": float(getattr(result, "elapse", 0) or 0),
    }


def emit(message: dict) -> None:
    print(json.dumps(message, ensure_ascii=False), flush=True)


def main() -> int:
    engine = RapidOCR()
    emit({"ready": True})

    for line in sys.stdin:
        request = {}
        try:
            request = json.loads(line)
            request_id = request["id"]
            image_path = Path(request["image_path"])
            payload = parse_image(engine, image_path)
            emit({"id": request_id, "ok": True, **payload})
        except Exception as error:
            emit(
                {
                    "id": request.get("id") if isinstance(request, dict) else None,
                    "ok": False,
                    "error": str(error),
                }
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
