/* Korbinians Bär – Spiellogik */
(function () {
  "use strict";

  const S = window.SPIEL;
  const SPEICHER = "korbinian-v1";
  const ORTE_SPEICHER = "korbinian-orte";
  const EDITOR = new URLSearchParams(location.search).has("editor");
  const FUND_FENSTER_MS = 15 * 60 * 1000; // Zufallsfunde wechseln alle 15 Minuten
  const ZELLE_LAT = 0.0009;               // ca. 100 m
  const ZELLE_LNG = 0.00135;              // ca. 100 m
  const FUND_SICHTWEITE = 350;            // Meter

  // ---------- Hilfsfunktionen ----------
  const $ = (id) => document.getElementById(id);

  function ladeJSON(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function speichereJSON(key, wert) {
    try { localStorage.setItem(key, JSON.stringify(wert)); } catch (e) { /* privat/voll */ }
  }

  function distanz(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function meterText(m) {
    return m >= 1000 ? (m / 1000).toFixed(1).replace(".", ",") + " km" : Math.round(m) + " m";
  }

  // Deterministischer Zufall: gleiche Zelle + gleiches Zeitfenster = gleicher Fund
  function hash(a, b, c) {
    let h = 2166136261 ^ a;
    h = Math.imul(h ^ b, 16777619);
    h = Math.imul(h ^ c, 16777619);
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return h >>> 0;
  }
  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Zustand ----------
  const zustand = Object.assign(
    { xp: 0, schaetze: {}, funde: {}, eingesammelt: {}, intro: false, test: false, testPos: null, ar: true },
    ladeJSON(SPEICHER, {})
  );
  const speichern = () => speichereJSON(SPEICHER, zustand);

  // Ortskorrekturen aus dem Editor anwenden
  const orte = ladeJSON(ORTE_SPEICHER, {});
  S.schaetze.forEach((s) => {
    if (orte[s.id]) { s.lat = orte[s.id][0]; s.lng = orte[s.id][1]; }
  });

  let spielerPos = null;     // {lat, lng, acc}
  let gpsPos = null;
  let gpsFehler = null;
  let folgen = true;         // Karte läuft mit, bis man sie selbst verschiebt
  const inReichweiteGemeldet = {};

  // ---------- Stufen ----------
  const xpFuerStufe = (n) => 50 * n * (n - 1); // 1:0, 2:100, 3:300, 4:600 …
  function stufe(xp) {
    let n = 1;
    while (xp >= xpFuerStufe(n + 1)) n++;
    return n;
  }

  // ---------- Kapitel ----------
  const schaetzeVon = (kapId) => S.schaetze.filter((s) => s.kapitel === kapId);
  const kapitelFertig = (kapId) => schaetzeVon(kapId).every((s) => zustand.schaetze[s.id]);
  function kapitelOffen(kapId) {
    if (EDITOR) return true;
    const i = S.kapitel.findIndex((k) => k.id === kapId);
    return i <= 0 || kapitelFertig(S.kapitel[i - 1].id);
  }
  const kapitelVon = (kapId) => S.kapitel.find((k) => k.id === kapId);

  // ---------- Karte ----------
  const karte = L.map("map", { zoomControl: false, attributionControl: true })
    .setView([S.start.lat, S.start.lng], S.start.zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(karte);

  function icon(klasse, inhalt, groesse) {
    return L.divIcon({
      className: "mk " + klasse,
      html: '<div class="mk-inner">' + inhalt + "</div>",
      iconSize: [groesse, groesse],
      iconAnchor: [groesse / 2, groesse / 2],
    });
  }

  const spielerMarker = L.marker([0, 0], {
    icon: icon("mk-spieler", "🧭", 40), zIndexOffset: 1000, interactive: false, keyboard: false,
  });
  const reichweiteKreis = L.circle([0, 0], {
    radius: S.radiusFund, color: "#5b3a1e", weight: 2, dashArray: "6 6", fill: true, fillOpacity: 0.06, interactive: false,
  });

  // Schatz-Marker
  const schatzMarker = {};
  S.schaetze.forEach((s) => {
    const m = L.marker([s.lat, s.lng], { draggable: EDITOR, keyboard: true, title: s.ort });
    m.on("click", () => schatzAntippen(s));
    if (EDITOR) {
      m.bindTooltip(s.id + (s.geprueft ? " ✓" : ""), { permanent: true, direction: "bottom", className: "editor-label", offset: [0, 16] });
      m.on("dragend", () => {
        const p = m.getLatLng();
        s.lat = +p.lat.toFixed(6); s.lng = +p.lng.toFixed(6);
        orte[s.id] = [s.lat, s.lng];
        speichereJSON(ORTE_SPEICHER, orte);
        toast("📍 " + s.id + " verschoben");
      });
    }
    m.addTo(karte);
    schatzMarker[s.id] = m;
  });

  function schatzStatus(s) {
    if (zustand.schaetze[s.id]) return "gefunden";
    if (!kapitelOffen(s.kapitel)) return "gesperrt";
    return "offen";
  }

  function schatzMarkerAktualisieren() {
    S.schaetze.forEach((s) => {
      const st = schatzStatus(s);
      const nah = st === "offen" && spielerPos && distanz(spielerPos, s) <= reichweite(S.radiusSchatz);
      let ic;
      if (st === "gefunden") ic = icon("mk-gefunden", "✔️", 34);
      else if (st === "gesperrt") ic = icon("mk-gesperrt", "🔒", 32);
      else ic = icon("mk-schatz" + (nah ? " nah" : ""), "🎁", 44);
      schatzMarker[s.id].setIcon(ic);
      schatzMarker[s.id].setZIndexOffset(st === "offen" ? 500 : 0);
      if (nah && !inReichweiteGemeldet[s.id]) {
        inReichweiteGemeldet[s.id] = true;
        toast("🎁 Ein Schatz ist in Reichweite! Tippe ihn an.");
        if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
      }
    });
  }

  // GPS-Ungenauigkeit etwas ausgleichen (max. +25 m)
  function reichweite(basis) {
    const acc = spielerPos && spielerPos.acc ? spielerPos.acc : 0;
    return basis + Math.min(25, acc / 2);
  }

  // ---------- Zufallsfunde ----------
  const fundLayer = L.layerGroup().addTo(karte);
  let fundSchluessel = "";
  let aktuelleFunde = [];
  const gesamtGewicht = S.funde.reduce((a, f) => a + f.gewicht, 0);

  function fundTyp(r) {
    let x = r * gesamtGewicht;
    for (const f of S.funde) { if ((x -= f.gewicht) < 0) return f; }
    return S.funde[0];
  }

  function fundeBerechnen() {
    if (!spielerPos || EDITOR) { fundLayer.clearLayers(); aktuelleFunde = []; return; }
    const fenster = Math.floor(Date.now() / FUND_FENSTER_MS);
    const cy = Math.floor(spielerPos.lat / ZELLE_LAT);
    const cx = Math.floor(spielerPos.lng / ZELLE_LNG);
    const schluessel = cx + ":" + cy + ":" + fenster;
    if (schluessel !== fundSchluessel) {
      fundSchluessel = schluessel;
      aktuelleFunde = [];
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const zx = cx + dx, zy = cy + dy;
          const r = rng(hash(zx, zy, fenster));
          if (r() > 0.3) continue;
          const id = zx + "_" + zy + "_" + fenster;
          if (zustand.eingesammelt[id]) continue;
          aktuelleFunde.push({
            id,
            lat: (zy + 0.15 + r() * 0.7) * ZELLE_LAT,
            lng: (zx + 0.15 + r() * 0.7) * ZELLE_LNG,
            typ: fundTyp(r()),
          });
        }
      }
      altesAufraeumen(fenster);
    }
    fundeZeichnen();
  }

  function fundeZeichnen() {
    fundLayer.clearLayers();
    aktuelleFunde.forEach((f) => {
      const d = distanz(spielerPos, f);
      if (d > FUND_SICHTWEITE) return;
      const nah = d <= reichweite(S.radiusFund);
      const klasse = "mk-fund " + (f.typ.seltenheit === "gewöhnlich" ? "" : f.typ.seltenheit === "selten" ? "selten" : "episch") + (nah ? " nah" : "");
      const m = L.marker([f.lat, f.lng], { icon: icon(klasse, f.typ.icon, 34), title: f.typ.name });
      m.on("click", () => fundAntippen(f));
      fundLayer.addLayer(m);
    });
  }

  function altesAufraeumen(fenster) {
    let geaendert = false;
    for (const id in zustand.eingesammelt) {
      const w = +id.split("_")[2];
      if (w < fenster - 1) { delete zustand.eingesammelt[id]; geaendert = true; }
    }
    if (geaendert) speichern();
  }

  function fundAntippen(f) {
    const d = distanz(spielerPos, f);
    if (d > reichweite(S.radiusFund)) {
      toast(f.typ.icon + " " + f.typ.name + ": noch " + meterText(d) + ". Geh näher ran!");
      return;
    }
    if (!arAn()) return fundEinsammeln(f);
    const beweglich = { gewöhnlich: 0, selten: 0.45, episch: 1 }[f.typ.seltenheit] || 0;
    window.KorbinianAR.fangen({
      titel: f.typ.name, icon: f.typ.icon, ziel: f, beweglich,
      klasse: f.typ.seltenheit === "gewöhnlich" ? "" : f.typ.seltenheit === "selten" ? "selten" : "episch",
      spieler: () => spielerPos, distanz,
    }).then((ok) => { if (ok && !zustand.eingesammelt[f.id]) fundEinsammeln(f); });
  }

  // Kamera-AR nur, wenn eingeschaltet und das Gerät eine Kamera-Schnittstelle hat
  const arAn = () => zustand.ar !== false && !EDITOR && window.KorbinianAR && window.KorbinianAR.moeglich();

  function fundEinsammeln(f) {
    zustand.eingesammelt[f.id] = 1;
    zustand.funde[f.typ.id] = (zustand.funde[f.typ.id] || 0) + 1;
    aktuelleFunde = aktuelleFunde.filter((x) => x.id !== f.id);
    const vorher = stufe(zustand.xp);
    punkteGeben(f.typ.punkte);
    speichern();
    fundeZeichnen();
    toast(f.typ.icon + " " + f.typ.name + " eingesammelt! +" + f.typ.punkte);
    if (navigator.vibrate) navigator.vibrate(40);
    stufeGeprueft(vorher);
  }

  // ---------- Schätze ----------
  function schatzAntippen(s) {
    if (EDITOR) {
      modal({ icon: s.icon, titel: s.ort, html: "<p>" + s.id + "<br>" + s.lat + ", " + s.lng + "</p>", aktionen: [{ text: "OK" }] });
      return;
    }
    const st = schatzStatus(s);
    if (st === "gefunden") return schatzZeigen(s);
    if (st === "gesperrt") {
      const i = S.kapitel.findIndex((k) => k.id === s.kapitel);
      modal({
        icon: "🔒", titel: "Noch versiegelt",
        html: "<p>Dieser Schatz gehört zu <b>" + S.kapitel[i].titel + "</b>. Schließe zuerst <b>" +
          S.kapitel[i - 1].titel + "</b> ab.</p>",
        aktionen: [{ text: "Verstanden" }],
      });
      return;
    }
    const d = spielerPos ? distanz(spielerPos, s) : null;
    if (d === null || d > reichweite(S.radiusSchatz)) {
      modal({
        icon: "🎁", titel: "Ein Stück von Korbinians Gepäck",
        html: '<p class="ort">📍 ' + s.ort + "</p><p>" +
          (d === null ? "Dein Standort ist noch unbekannt." : "Noch <b>" + meterText(d) + "</b> entfernt.") +
          " Geh bis auf etwa " + S.radiusSchatz + " m heran, dann kannst du den Schatz bergen.</p>",
        aktionen: [{ text: "Los geht's" }],
      });
      return;
    }
    if (!arAn()) return frageStellen(s, false);
    window.KorbinianAR.fangen({
      titel: s.ort, icon: "🎁", ziel: s, klasse: "schatz",
      spieler: () => spielerPos, distanz,
    }).then((ok) => { if (ok) frageStellen(s, false); });
  }

  function frageStellen(s, schonFalsch) {
    const html =
      '<p class="ort">📍 ' + s.ort + "</p>" +
      "<p>Der Bär gibt ihn nur her, wenn du seine Frage beantwortest:</p>" +
      "<p><b>" + s.frage + "</b></p>";
    modal({
      icon: "🐻", titel: "Schatz gefunden!", html,
      aktionen: s.antworten.map((a, i) => ({
        text: a, klasse: "antwort", schliessen: false,
        klick: (btn) => {
          if (i === s.richtig) {
            schatzBergen(s, schonFalsch);
          } else {
            btn.classList.add("falsch");
            btn.disabled = true;
            schonFalsch = true;
            toast("🐻 Brumm … leider nicht. Versuch's nochmal!");
          }
        },
      })),
    });
  }

  function schatzBergen(s, schonFalsch) {
    const punkte = schonFalsch ? Math.round(s.punkte / 2) : s.punkte;
    const vorher = stufe(zustand.xp);
    zustand.schaetze[s.id] = Date.now();
    punkteGeben(punkte);
    speichern();
    schatzMarkerAktualisieren();
    albumZeichnen(); kapitelZeichnen();
    if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
    modal({
      icon: s.icon, titel: s.name,
      html: '<p class="punkte">+' + punkte + " Punkte" + (schonFalsch ? " (2. Versuch)" : "") + "</p>" +
        '<p class="ort">📍 ' + s.ort + "</p><p>" + s.text + "</p>",
      aktionen: [{
        text: "Ins Album legen",
        klick: () => { stufeGeprueft(vorher); kapitelGeprueft(s.kapitel); },
      }],
    });
  }

  function schatzZeigen(s) {
    modal({
      icon: s.icon, titel: s.name,
      html: '<p class="ort">📍 ' + s.ort + "</p><p>" + s.text + "</p>",
      aktionen: [{ text: "Schließen" }],
    });
  }

  function kapitelGeprueft(kapId) {
    if (!kapitelFertig(kapId)) return;
    const i = S.kapitel.findIndex((k) => k.id === kapId);
    const naechstes = S.kapitel[i + 1];
    if (naechstes) {
      modal({
        icon: "🎉", titel: S.kapitel[i].titel + " geschafft!",
        html: "<p>Alle Stücke dieses Kapitels sind wieder im Gepäck. Ein neues Kapitel ist freigeschaltet:</p>" +
          "<p><b>" + naechstes.titel + "</b><br>" + naechstes.intro + "</p>",
        aktionen: [{ text: "Weiter geht's", klick: () => zeigeKapitelAufKarte(naechstes.id) }],
      });
    } else {
      modal({
        icon: "🐻🎒", titel: "Die Reiselast ist komplett!",
        html: "<p>Du hast alle " + S.schaetze.length + " Stücke von Korbinians Gepäck gefunden. " +
          "Der Bär schnallt sich die Last auf den Rücken und stapft zufrieden Richtung Alpen und weiter nach Rom.</p>" +
          "<p>Danke, dass du Freising erkundet hast! Kleine Funde kannst du weiterhin überall sammeln.</p>",
        aktionen: [{ text: "Brumm! 🐾" }],
      });
    }
  }

  function zeigeKapitelAufKarte(kapId) {
    const punkte = schaetzeVon(kapId).map((s) => [s.lat, s.lng]);
    if (punkte.length) karte.fitBounds(punkte, { padding: [50, 50], maxZoom: 17 });
  }

  // ---------- Punkte & HUD ----------
  function punkteGeben(p) {
    zustand.xp += p;
    hudAktualisieren();
  }
  function stufeGeprueft(vorher) {
    const jetzt = stufe(zustand.xp);
    if (jetzt > vorher) setTimeout(() => toast("⭐ Stufe " + jetzt + " erreicht!"), 900);
  }
  function hudAktualisieren() {
    const n = stufe(zustand.xp);
    const a = xpFuerStufe(n), b = xpFuerStufe(n + 1);
    $("hud-level").textContent = n;
    $("hud-xp").style.width = Math.round(((zustand.xp - a) / (b - a)) * 100) + "%";
    $("hud-count").textContent = "🎁 " + Object.keys(zustand.schaetze).length + "/" + S.schaetze.length;
    $("hud-count").title = zustand.xp + " Punkte";
  }

  // ---------- Album & Kapitel ----------
  function albumZeichnen() {
    let html = "";
    S.kapitel.forEach((k) => {
      html += '<div class="album-gruppe"><h3>' + k.titel.replace(/^Kapitel \d+: /, "") + '</h3><div class="grid">';
      schaetzeVon(k.id).forEach((s) => {
        const hat = zustand.schaetze[s.id];
        html += hat
          ? '<button class="karte" data-schatz="' + s.id + '"><span class="ic">' + s.icon + "</span>" + s.name + "</button>"
          : '<div class="karte leer"><span class="ic">' + s.icon + "</span>???</div>";
      });
      html += "</div></div>";
    });
    html += '<div class="album-gruppe"><h3>Kleine Funde</h3><div class="grid">';
    S.funde.forEach((f) => {
      const n = zustand.funde[f.id] || 0;
      html += '<div class="karte' + (n ? "" : " leer") + '"><span class="ic">' + f.icon + "</span>" +
        (n ? f.name : "???") + '<br><span class="anz">×' + n + "</span></div>";
    });
    html += '</div></div><p class="small">Gesamt: ' + zustand.xp + " Punkte · Stufe " + stufe(zustand.xp) + "</p>";
    $("album").innerHTML = html;
    $("album").querySelectorAll("[data-schatz]").forEach((el) => {
      el.addEventListener("click", () => schatzZeigen(S.schaetze.find((s) => s.id === el.dataset.schatz)));
    });
  }

  function kapitelZeichnen() {
    let html = "";
    S.kapitel.forEach((k) => {
      const liste = schaetzeVon(k.id);
      const anz = liste.filter((s) => zustand.schaetze[s.id]).length;
      const offen = kapitelOffen(k.id);
      html += '<div class="kap' + (offen ? "" : " gesperrt") + '"><h3>' + (offen ? "" : "🔒 ") + k.titel + "</h3>";
      html += "<p>" + (offen ? k.intro : "Wird freigeschaltet, sobald das vorige Kapitel komplett ist.") + "</p>";
      html += '<div class="balken"><div style="width:' + Math.round((anz / liste.length) * 100) + '%"></div></div>';
      html += '<div class="small">' + anz + " von " + liste.length + " gefunden</div>";
      if (offen) {
        html += '<ul class="kap-liste">';
        liste.forEach((s) => {
          html += "<li>" + (zustand.schaetze[s.id] ? "✔️ " : "🎁 ") +
            '<button data-ziel="' + s.id + '">' + s.ort + "</button></li>";
        });
        html += "</ul>";
      }
      html += "</div>";
    });
    $("kapitel").innerHTML = html;
    $("kapitel").querySelectorAll("[data-ziel]").forEach((el) => {
      el.addEventListener("click", () => {
        const s = S.schaetze.find((x) => x.id === el.dataset.ziel);
        panelZeigen("");
        karte.setView([s.lat, s.lng], 18);
      });
    });
  }

  // ---------- Panels ----------
  function panelZeigen(name) {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.panel === name));
    ["album", "kapitel", "info"].forEach((p) => { $("panel-" + p).hidden = p !== name; });
    if (name === "album") albumZeichnen();
    if (name === "kapitel") kapitelZeichnen();
    if (!name) setTimeout(() => karte.invalidateSize(), 50);
  }
  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => panelZeigen(b.dataset.panel)));

  // ---------- Modal & Toast ----------
  function modal({ icon: ic, titel, html, aktionen }) {
    $("modal-icon").textContent = ic || "";
    $("modal-title").textContent = titel || "";
    $("modal-body").innerHTML = html || "";
    const box = $("modal-actions");
    box.innerHTML = "";
    (aktionen || [{ text: "OK" }]).forEach((a) => {
      const b = document.createElement("button");
      b.className = a.klasse || "btn";
      b.textContent = a.text;
      b.addEventListener("click", () => {
        if (a.schliessen !== false) $("modal").hidden = true;
        if (a.klick) a.klick(b);
      });
      box.appendChild(b);
    });
    $("modal").hidden = false;
    const erster = box.querySelector("button");
    if (erster) erster.focus();
  }

  let toastTimer;
  function toast(text) {
    const t = $("toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }

  // ---------- Position ----------
  function positionSetzen(pos) {
    const erstes = !spielerPos;
    spielerPos = pos;
    spielerMarker.setLatLng([pos.lat, pos.lng]);
    reichweiteKreis.setLatLng([pos.lat, pos.lng]).setRadius(reichweite(S.radiusFund));
    if (!karte.hasLayer(spielerMarker)) { spielerMarker.addTo(karte); reichweiteKreis.addTo(karte); }
    if (erstes && !EDITOR) karte.setView([pos.lat, pos.lng], 17);
    else if (folgen && !EDITOR && !zustand.test) karte.panTo([pos.lat, pos.lng]);
    fundeBerechnen();
    schatzMarkerAktualisieren();
    statusAktualisieren();
  }

  function statusAktualisieren() {
    const st = $("status");
    st.classList.toggle("test", !!zustand.test);
    if (EDITOR) { st.textContent = ""; return; }
    if (zustand.test) { st.textContent = "🧪 Testmodus: Tippe auf die Karte, um dich zu bewegen"; return; }
    if (gpsFehler) { st.textContent = "⚠️ " + gpsFehler; return; }
    if (!gpsPos) { st.textContent = "📡 Suche deinen Standort …"; return; }
    if (gpsPos.acc > 60) { st.textContent = "📡 GPS ungenau (±" + Math.round(gpsPos.acc) + " m)"; return; }
    st.textContent = "";
  }

  let gpsGestartet = false;
  function gpsStarten() {
    if (gpsGestartet) return;
    gpsGestartet = true;
    if (!("geolocation" in navigator)) {
      gpsFehler = "Dein Gerät unterstützt keine Standortbestimmung.";
      statusAktualisieren();
      return;
    }
    navigator.geolocation.watchPosition(
      (p) => {
        gpsFehler = null;
        gpsPos = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
        if (!zustand.test) positionSetzen(gpsPos);
        else statusAktualisieren();
      },
      (e) => {
        gpsFehler = e.code === 1
          ? "Standort nicht freigegeben. Bitte in den Browser-Einstellungen erlauben."
          : "Standort gerade nicht verfügbar.";
        statusAktualisieren();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    statusAktualisieren();
  }

  // Testmodus: Tippen auf die Karte bewegt die Figur
  karte.on("click", (e) => {
    if (!zustand.test || EDITOR) return;
    zustand.testPos = { lat: e.latlng.lat, lng: e.latlng.lng };
    speichern();
    positionSetzen({ lat: e.latlng.lat, lng: e.latlng.lng, acc: 0 });
  });

  $("opt-ar").checked = zustand.ar !== false;
  $("opt-ar").addEventListener("change", (e) => { zustand.ar = e.target.checked; speichern(); });

  $("opt-test").checked = !!zustand.test;
  $("opt-test").addEventListener("change", (e) => {
    zustand.test = e.target.checked;
    if (zustand.test) {
      const p = zustand.testPos || { lat: 48.4010, lng: 11.7452 };
      zustand.testPos = p;
      positionSetzen({ lat: p.lat, lng: p.lng, acc: 0 });
      toast("🧪 Testmodus an: Tippe auf die Karte");
    } else if (gpsPos) {
      positionSetzen(gpsPos);
    }
    speichern();
    statusAktualisieren();
  });

  karte.on("dragstart", () => { folgen = false; });

  $("btn-center").addEventListener("click", () => {
    folgen = true;
    if (spielerPos) karte.setView([spielerPos.lat, spielerPos.lng], Math.max(karte.getZoom(), 17));
    else toast("📡 Standort noch unbekannt");
  });

  $("btn-reset").addEventListener("click", () => {
    modal({
      icon: "⚠️", titel: "Spielstand löschen?",
      html: "<p>Alle Schätze, Funde und Punkte gehen verloren.</p>",
      aktionen: [
        { text: "Ja, alles löschen", klick: () => { try { localStorage.removeItem(SPEICHER); } catch (e) { /* egal */ } location.reload(); } },
        { text: "Abbrechen", klasse: "btn sek" },
      ],
    });
  });

  // ---------- Editor ----------
  if (EDITOR) {
    $("editor-bar").hidden = false;
    $("btn-export").addEventListener("click", () => {
      const text = S.schaetze.map((s) => s.id + ": " + s.lat.toFixed(6) + ", " + s.lng.toFixed(6)).join("\n");
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      modal({
        icon: "📋", titel: "Koordinaten",
        html: '<p>In die Zwischenablage kopiert:</p><textarea readonly style="width:100%;height:220px;font-size:12px">' + text + "</textarea>",
        aktionen: [{ text: "OK" }],
      });
    });
    $("btn-editor-reset").addEventListener("click", () => {
      try { localStorage.removeItem(ORTE_SPEICHER); } catch (e) { /* egal */ }
      location.reload();
    });
  }

  // ---------- Start ----------
  function start() {
    hudAktualisieren();
    schatzMarkerAktualisieren();
    statusAktualisieren();
    if (zustand.test && zustand.testPos) positionSetzen(Object.assign({ acc: 0 }, zustand.testPos));
    gpsStarten();
    setInterval(() => { if (spielerPos) fundeBerechnen(); }, 20000);
  }

  if (!zustand.intro && !EDITOR) {
    modal({
      icon: "🐻", titel: "Korbinians Bär",
      html:
        "<p>Vor langer Zeit wanderte der heilige Korbinian von Freising nach Rom. Unterwegs riss ein Bär sein Packpferd. " +
        "Zur Strafe musste der Bär das Gepäck selbst tragen.</p>" +
        "<p>Doch der Bär ist tollpatschig: Überall in Freising hat er Stücke der Reiselast verloren, in der Innenstadt, " +
        "auf dem Domberg, in Weihenstephan und an der Isar.</p>" +
        "<p><b>Hilf ihm, alles wiederzufinden!</b> Geh zu den goldenen 🎁-Markern und sammle unterwegs kleine Funde ein.</p>" +
        '<p class="small">Die App braucht deinen Standort. Er bleibt auf deinem Gerät.</p>',
      aktionen: [{ text: "Los geht's!", klick: () => { zustand.intro = true; speichern(); start(); } }],
    });
  } else {
    start();
  }

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
