/* Kamera-AR: Der Fund schwebt im Kamerabild in der Richtung, in der er wirklich liegt.
   Richtung aus GPS (Peilung Spieler → Ziel) und Kompass/Lagesensor des Handys.
   Ohne Kompass (z. B. am PC) schwebt er frei vor der Kamera, ohne Kamera vor einem Hintergrund.
   Aufgenommen oder verschickt wird nichts: Das Kamerabild wird nur angezeigt. */
(function () {
  "use strict";

  const H_FOV = 55;          // horizontaler Bildwinkel im Hochformat (ca.)
  const V_FOV = 70;          // vertikaler Bildwinkel
  const ZIEL_HOEHE = -8;     // Fund liegt etwas unter Augenhöhe
  const $ = (id) => document.getElementById(id);
  const rad = (g) => (g * Math.PI) / 180;
  const grad = (r) => (r * 180) / Math.PI;
  const norm = (w) => ((w % 360) + 540) % 360 - 180; // auf -180..180

  function peilung(a, b) {
    const f1 = rad(a.lat), f2 = rad(b.lat), dl = rad(b.lng - a.lng);
    const y = Math.sin(dl) * Math.cos(f2);
    const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return (grad(Math.atan2(y, x)) + 360) % 360;
  }

  // Blickrichtung der Rückkamera aus alpha/beta/gamma (W3C-Rotation Z-X-Y).
  // Liefert Kompassrichtung (0 = Norden, im Uhrzeigersinn) und Höhenwinkel.
  function kameraRichtung(alpha, beta, gamma) {
    const cA = Math.cos(rad(alpha)), sA = Math.sin(rad(alpha));
    const cB = Math.cos(rad(beta)), sB = Math.sin(rad(beta));
    const cG = Math.cos(rad(gamma)), sG = Math.sin(rad(gamma));
    const ost = -cA * sG - sA * sB * cG;
    const nord = -sA * sG + cA * sB * cG;
    const hoch = -cB * cG;
    return {
      richtung: (grad(Math.atan2(ost, nord)) + 360) % 360,
      hoehe: grad(Math.asin(Math.max(-1, Math.min(1, hoch)))),
    };
  }

  let offen = null; // laufende Sitzung

  function fangen(opt) {
    if (offen) offen.beenden(false);
    // iOS: Erlaubnis für den Lagesensor muss direkt aus dem Tipp heraus angefragt werden.
    let sensorErlaubnis = Promise.resolve("granted");
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      sensorErlaubnis = DOE.requestPermission().catch(() => "denied");
    }

    return new Promise((fertig) => {
      const box = $("ar");
      const video = $("ar-video");
      const obj = $("ar-objekt");
      const pfeil = $("ar-pfeil");
      const hinweis = $("ar-hinweis");
      $("ar-titel").textContent = opt.titel;
      obj.textContent = opt.icon;
      obj.className = "ar-objekt " + (opt.klasse || "");
      obj.hidden = false;
      pfeil.hidden = true;
      box.classList.remove("ohne-kamera", "gefangen");
      box.hidden = false;

      let stream = null;
      let sensor = null;          // {richtung, hoehe} geglättet
      let sensorZeit = 0;
      let rafId = 0;
      const start = performance.now();
      const beweglich = opt.beweglich || 0; // 0 ruhig … 1 flink

      const s = {
        beenden(ergebnis) {
          if (offen !== s) return;
          offen = null;
          cancelAnimationFrame(rafId);
          window.removeEventListener("deviceorientationabsolute", aufLage, true);
          window.removeEventListener("deviceorientation", aufLage, true);
          if (stream) stream.getTracks().forEach((t) => t.stop());
          video.srcObject = null;
          box.hidden = true;
          fertig(ergebnis);
        },
      };
      offen = s;

      // Kamera
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
          .then((st) => {
            if (offen !== s) { st.getTracks().forEach((t) => t.stop()); return; }
            stream = st;
            video.srcObject = st;
            return video.play();
          })
          .catch(() => {
            box.classList.add("ohne-kamera");
            hinweis.textContent = "Kamera nicht verfügbar. Fang ihn trotzdem!";
          });
      } else {
        box.classList.add("ohne-kamera");
      }

      // Lagesensor
      function aufLage(e) {
        let r;
        if (typeof e.webkitCompassHeading === "number" && e.beta !== null) {
          // iOS: Kompass direkt, Höhenwinkel aus beta/gamma
          r = kameraRichtung(0, e.beta, e.gamma || 0);
          r.richtung = e.webkitCompassHeading;
        } else if ((e.absolute || e.type === "deviceorientationabsolute") && e.alpha !== null) {
          r = kameraRichtung(e.alpha, e.beta, e.gamma);
        } else {
          return; // relative Werte ohne Norden helfen nicht
        }
        if (!sensor) sensor = r;
        else {
          sensor.richtung = (sensor.richtung + norm(r.richtung - sensor.richtung) * 0.25 + 360) % 360;
          sensor.hoehe += (r.hoehe - sensor.hoehe) * 0.25;
        }
        sensorZeit = performance.now();
      }
      sensorErlaubnis.then((st) => {
        if (st !== "granted" || offen !== s) return;
        if ("ondeviceorientationabsolute" in window) window.addEventListener("deviceorientationabsolute", aufLage, true);
        window.addEventListener("deviceorientation", aufLage, true);
      });

      // Fangen per Tipp
      obj.onclick = (ev) => {
        ev.stopPropagation();
        if (offen !== s) return;
        box.classList.add("gefangen");
        if (navigator.vibrate) navigator.vibrate([30, 30, 60]);
        setTimeout(() => s.beenden(true), 650);
      };
      $("ar-abbrechen").onclick = () => s.beenden(false);

      // Zeichnen
      function bild(t) {
        if (offen !== s) return;
        if (box.classList.contains("gefangen")) { rafId = requestAnimationFrame(bild); return; }
        const w = box.clientWidth, h = box.clientHeight;
        const sek = (t - start) / 1000;
        const spieler = opt.spieler();
        const d = spieler ? opt.distanz(spieler, opt.ziel) : 20;
        const groesse = Math.max(72, Math.min(150, 160 - d * 2));
        // eigene Bewegung: leichtes Schweben, flinke Funde weichen aus
        const wx = Math.sin(sek * (0.9 + beweglich * 1.6)) * (6 + beweglich * 14);
        const wy = Math.cos(sek * (1.3 + beweglich * 1.2)) * (4 + beweglich * 8);

        let x, y, sichtbar = true;
        const sensorAktiv = sensor && t - sensorZeit < 1500;
        if (sensorAktiv && spieler) {
          const diff = norm(peilung(spieler, opt.ziel) - sensor.richtung);
          x = w / 2 + (diff / (H_FOV / 2)) * (w / 2) + rad(wx) * w;
          y = h / 2 + ((sensor.hoehe - ZIEL_HOEHE) / (V_FOV / 2)) * (h / 2) + rad(wy) * h;
          sichtbar = Math.abs(diff) < H_FOV / 2 + 8;
          if (!sichtbar) {
            pfeil.hidden = false;
            pfeil.className = "ar-pfeil " + (diff > 0 ? "rechts" : "links");
            pfeil.textContent = diff > 0 ? "Dreh dich nach rechts ➜" : "⬅ Dreh dich nach links";
          } else pfeil.hidden = true;
          if (!box.classList.contains("ohne-kamera")) {
            hinweis.textContent = sichtbar ? "Tipp drauf, um ihn zu fangen!" : "Schau dich um …";
          }
        } else {
          // ohne Kompass: frei schwebend in der Bildmitte
          pfeil.hidden = true;
          x = w / 2 + Math.sin(sek * (0.5 + beweglich)) * w * (0.18 + beweglich * 0.12);
          y = h * 0.45 + Math.sin(sek * (0.8 + beweglich * 0.7)) * h * 0.08;
          if (!box.classList.contains("ohne-kamera")) hinweis.textContent = "Tipp drauf, um ihn zu fangen!";
        }
        obj.style.visibility = sichtbar ? "visible" : "hidden";
        obj.style.fontSize = Math.round(groesse * 0.62) + "px";
        obj.style.width = obj.style.height = groesse + "px";
        obj.style.transform = "translate(" + (x - groesse / 2) + "px," + (y - groesse / 2) + "px)";
        rafId = requestAnimationFrame(bild);
      }
      hinweis.textContent = "Tipp drauf, um ihn zu fangen!";
      rafId = requestAnimationFrame(bild);
    });
  }

  window.KorbinianAR = {
    fangen,
    moeglich: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  };
})();
