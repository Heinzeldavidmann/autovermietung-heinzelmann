#!/usr/bin/env python3
"""
Konvertiert neue Bilder im images/-Ordner zu WebP.

Aufruf:
    python3 convert_to_webp.py                  # alle neuen Bilder konvertieren
    python3 convert_to_webp.py meinbild.jpg      # nur ein bestimmtes Bild

Unterstützte Formate: JPG, JPEG, PNG, HEIC, HEIF
WebP-Dateien und Logo/Preislisten-Vorschauen werden übersprungen.

Zusätzlich entstehen in images/responsive/ verkleinerte Fassungen
(480, 800 und 1200 px breit), die im HTML per srcset eingebunden werden:
    <source type="image/webp" sizes="..."
            srcset="images/responsive/NAME-480.webp 480w,
                    images/responsive/NAME-800.webp 800w,
                    images/responsive/NAME-1200.webp 1200w,
                    images/NAME.webp 1600w">
Das Handy lädt so nur die Größe, die es wirklich anzeigt.
"""

import sys
import os
from pathlib import Path
from PIL import Image

IMAGES_DIR = Path(__file__).parent / "images"
QUALITY = 82
RESPONSIVE_DIR = IMAGES_DIR / "responsive"
RESPONSIVE_WIDTHS = (480, 800, 1200)
RESPONSIVE_QUALITY = 80
SKIP_PATTERNS = ["Logo_", "preislisten-preview"]
SUPPORTED = {".jpg", ".jpeg", ".png", ".heic", ".heif"}


def convert(src: Path) -> None:
    dst = src.with_suffix(".webp")
    if dst.exists():
        print(f"  Übersprungen (WebP existiert bereits): {src.name}")
        return

    try:
        img = Image.open(src)
        img = img.convert("RGBA" if img.mode in ("RGBA", "LA", "P") else "RGB")
        img.save(dst, "WEBP", quality=QUALITY, method=6)
        src_kb = src.stat().st_size / 1024
        dst_kb = dst.stat().st_size / 1024
        saving = (1 - dst_kb / src_kb) * 100
        print(f"  {src.name}: {src_kb:.0f} KB -> {dst_kb:.0f} KB ({saving:.0f}% kleiner)")
    except Exception as e:
        print(f"  FEHLER bei {src.name}: {e}")


def make_variants(src: Path) -> None:
    """Verkleinerte WebP-Fassungen für srcset anlegen (nur kleiner als das Original)."""
    RESPONSIVE_DIR.mkdir(exist_ok=True)
    try:
        img = Image.open(src)
        img = img.convert("RGBA" if img.mode in ("RGBA", "LA", "P") else "RGB")
    except Exception as e:
        print(f"  FEHLER bei {src.name}: {e}")
        return
    # Obergrenze ist die Breite der großen WebP-Datei, die im srcset als größte Stufe steht
    webp = src.with_suffix(".webp")
    max_width = Image.open(webp).width if webp.exists() else img.width
    for width in RESPONSIVE_WIDTHS:
        if width >= max_width:
            continue
        dst = RESPONSIVE_DIR / f"{src.stem}-{width}.webp"
        if dst.exists():
            continue
        height = round(img.height * width / img.width)
        img.resize((width, height), Image.LANCZOS).save(
            dst, "WEBP", quality=RESPONSIVE_QUALITY, method=6)
        print(f"  {dst.name}: {dst.stat().st_size / 1024:.0f} KB")


def should_skip(path: Path) -> bool:
    return any(p in path.name for p in SKIP_PATTERNS)


def main():
    if len(sys.argv) > 1:
        # Einzelne Datei angegeben
        target = IMAGES_DIR / sys.argv[1]
        if not target.exists():
            print(f"Datei nicht gefunden: {target}")
            sys.exit(1)
        print(f"Konvertiere {target.name} ...")
        convert(target)
        make_variants(target)
    else:
        # Alle neuen Bilder im images/-Ordner
        candidates = [
            p for p in IMAGES_DIR.iterdir()
            if p.suffix.lower() in SUPPORTED and not should_skip(p)
        ]
        if not candidates:
            print("Keine neuen Bilder zum Konvertieren gefunden.")
            return
        print(f"Konvertiere {len(candidates)} Bild(er) in {IMAGES_DIR.name}/\n")
        for src in sorted(candidates):
            convert(src)
            make_variants(src)
        print("\nFertig.")


if __name__ == "__main__":
    main()
