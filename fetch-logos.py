from pathlib import Path
from io import BytesIO
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

root = Path(__file__).resolve().parent
sources = json.loads((root / "logo-sources.json").read_text())

def save_asset(item):
    relative, url = item
    destination = root / relative
    if destination.exists():
        return relative, "already exists"
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=25) as response:
            data = response.read()
        image = Image.open(BytesIO(data)).convert("RGBA")
        image.thumbnail((1200, 1200))
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "PNG")
        return relative, "saved"
    except Exception as exc:
        return relative, str(exc)

if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(save_asset, sources.items()))
    for name, status in results:
        print(f"{name}: {status}")
