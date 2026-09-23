#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Icon-Generator für die PWA „Anästhesieprotokoll".
Neutrales Motiv: Petrol-Verlauf + weiße EKG-/Vitalkurve (P-QRS-T), Amber-Endpunkt
(„live cursor"). Keine fremden Logos, keine medizinischen Aussagen – reines Signet.

Erzeugt:
  icons/icon-192.png            (any, Safe-Zone-Inset 0.10)
  icons/icon-512.png            (any, Safe-Zone-Inset 0.10)
  icons/icon-192-maskable.png   (maskable, Inset 0.14)
  icons/icon-512-maskable.png   (maskable, Inset 0.14)

Nutzung:  python gen_icons.py
Benötigt: Pillow  (pip install pillow)
"""
import os
import math

try:
    from PIL import Image, ImageDraw
except ImportError:
    raise SystemExit("Pillow fehlt. Bitte installieren: pip install pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "icons")
os.makedirs(OUT, exist_ok=True)

# Vaydena-Look
PETROL_TOP = (14, 124, 134)   # #0e7c86
PETROL_BOT = (10, 91, 99)     # #0a5b63
AMBER = (224, 138, 30)        # #e08a1e
WHITE = (255, 255, 255)

SS = 4  # Supersampling für glatte Kanten


def vgrad(size, top, bot):
    """Vertikaler Farbverlauf als RGB-Bild."""
    img = Image.new("RGB", (size, size), top)
    px = img.load()
    for y in range(size):
        t = y / max(1, size - 1)
        r = round(top[0] + (bot[0] - top[0]) * t)
        g = round(top[1] + (bot[1] - top[1]) * t)
        b = round(top[2] + (bot[2] - top[2]) * t)
        for x in range(size):
            px[x, y] = (r, g, b)
    return img


def ecg_points(x0, x1, ymid, amp):
    """
    Eine Vitalkurve über die Breite [x0, x1]. Zwei Zyklen: ruhige Grundlinie mit
    je einem P-QRS-T-Komplex. Rein dekorativ (kein echtes EKG).
    Rückgabe: Liste (x, y)-Punkte.
    """
    pts = []
    span = x1 - x0
    cycles = 2
    N = 240
    for i in range(N + 1):
        f = i / N               # 0..1 über gesamte Breite
        x = x0 + span * f
        p = (f * cycles) % 1.0  # Phase 0..1 innerhalb eines Zyklus
        y = 0.0
        # P-Welle (kleiner Bauch)
        if 0.12 <= p < 0.22:
            y += 0.16 * math.sin((p - 0.12) / 0.10 * math.pi)
        # QRS-Komplex (flaches Q, hohe R, flaches S) – bewusst schlank,
        # damit die dicke Linie an den Umkehrpunkten nicht verklumpt.
        elif 0.31 <= p < 0.35:            # Q (leichte Senke)
            y -= 0.12 * ((p - 0.31) / 0.04)
        elif 0.35 <= p < 0.41:            # R (steil hoch)
            y += 1.00 * ((p - 0.35) / 0.06) - 0.12
        elif 0.41 <= p < 0.47:            # zurück durch S
            y += 0.88 - 1.18 * ((p - 0.41) / 0.06)
        elif 0.47 <= p < 0.50:            # S zurück zur Linie
            y += -0.30 + 0.30 * ((p - 0.47) / 0.03)
        # T-Welle (breiter Bauch)
        elif 0.58 <= p < 0.74:
            y += 0.28 * math.sin((p - 0.58) / 0.16 * math.pi)
        pts.append((x, ymid - amp * y))
    return pts


def make_icon(size, maskable=False):
    S = size * SS
    img = vgrad(S, PETROL_TOP, PETROL_BOT).convert("RGBA")
    d = ImageDraw.Draw(img)

    inset = 0.14 if maskable else 0.10
    x0 = S * inset
    x1 = S * (1 - inset)
    ymid = S * 0.52
    amp = S * 0.20

    pts = ecg_points(x0, x1, ymid, amp)

    # dezente Grundlinie
    lw_base = max(2, int(S * 0.010))
    d.line([(x0, ymid), (x1, ymid)], fill=(255, 255, 255, 60), width=lw_base)

    # Hauptkurve
    lw = max(3, int(S * 0.038))
    d.line(pts, fill=WHITE, width=lw, joint="curve")
    # runde Enden
    r = lw / 2
    for (cx, cy) in (pts[0], pts[-1]):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)

    # Amber „live"-Punkt am Kurvenende
    ex, ey = pts[-1]
    dot = max(4, int(S * 0.055))
    d.ellipse([ex - dot, ey - dot, ex + dot, ey + dot], fill=AMBER)

    img = img.resize((size, size), Image.LANCZOS)
    return img.convert("RGB")


def main():
    jobs = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-192-maskable.png", 192, True),
        ("icon-512-maskable.png", 512, True),
    ]
    for name, sz, mask in jobs:
        p = os.path.join(OUT, name)
        make_icon(sz, mask).save(p, "PNG", optimize=True)
        print("geschrieben:", p)


if __name__ == "__main__":
    main()
