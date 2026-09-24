# Übergabe Aufklärungsbogen → Anästhesieprotokoll (Format „AB1“)

Beide Apps laufen auf verschiedenen Domains; ihr `localStorage` ist getrennt und
Patientendaten verlassen das Gerät nie. Die Übergabe erfolgt deshalb **per QR-Code**:
kein Server, keine Cloud, kein Konto.

## Ablauf in der Praxis

1. Aufklärung im Aufklärungsbogen wie gewohnt durchführen.
2. Der QR-Code steht
   - auf dem **Arzt-Exemplar** des Ausdrucks (unten, mit Fall-ID) und
   - am Bildschirm über „③ Übergabe an das Anästhesieprotokoll (QR)“.
3. Am OP-Tag im Anästhesieprotokoll unter *Stammdaten* auf
   „Aufklärung übernehmen (QR scannen)“ tippen und den Code mit der Kamera scannen
   (oder „Foto aufnehmen“).
4. Eine Vorschau zeigt, was übernommen wird. Mit „Übernehmen“ werden die Felder gefüllt.

## Payload

Kompaktes JSON, ausschließlich ASCII (Nicht-ASCII als `\uXXXX`), höchstens ca. 900 Zeichen.
Ist der Inhalt zu lang, werden die Freitexte stufenweise gekürzt (120 → 80 → 50 → 30 → 15 → 0
Zeichen). QR-Fehlerkorrektur M, Byte-Modus. Im ungünstigsten Fall (alle Fragen „ja“) ergibt
das Version 22; gedruckt werden 50 × 50 mm.

| Schlüssel | Inhalt | Quelle (Aufklärungsbogen) |
|---|---|---|
| `t` | immer `"AB1"` | – |
| `id` | Fall-ID (UUID, `visit_id`) | `hf_visit_id` |
| `d` | Zeitpunkt der Übergabe, ISO UTC, 16 Zeichen | – |
| `p.n` / `p.g` / `p.s` | Name / Geburtsdatum / Geschlecht | `p_name`, `p_gebdat`, `p_geschlecht` |
| `p.kg` / `p.cm` / `p.h` | Gewicht / Größe / Händigkeit | `p_gewicht`, `p_groesse`, `haendigkeit` |
| `e` | geplanter Eingriff | `ein_eingriff` |
| `a` | aufklärende Ärztin / aufklärender Arzt | `arzt_name` |
| `v` | eingewilligte Verfahren (Schlüssel ohne `c_`) | `c_*` = true |
| `j` | mit „ja“ beantwortete Fragen: `{qkey: Freitext \| 1}`; zusätzlich `q33n:1`, wenn q33 = „nein“ | `q*`, `q*_txt` |
| `b` | Abholung/Betreuung | `q31` |
| `r` | Bemerkung der Ärztin / des Arztes | `arzt_bemerkung` |

## Zuordnung im Protokoll

| Payload | Protokollfeld | Regel |
|---|---|---|
| `p.n`, `p.g`, `p.s`, `p.kg`, `p.cm`, `e` | name, gebdat, geschlecht, gewicht, groesse, eingriff | wird überschrieben (Vorschau zeigt es vorher) |
| `j.q7` | allergien | Zeile wird angehängt |
| `j.q6`, `j.q10a` | dauermedikation | Zeile wird angehängt |
| übrige `j.*` | vorerkrankungen | Zeile wird angehängt, relevante mit „⚠“ |
| `j.q28` / `j.q28b` | nikotin / alkohol | nur, wenn das Feld leer ist |
| – | aufklaerung | wird auf „ja“ gesetzt |
| `v`, `a`, `d`, `p.h`, `b`, `r` | Infobox „Aus dem Aufklärungsbogen übernommen“ (Prämedikation) | nur Anzeige |

Das tatsächliche Anästhesieverfahren wird **nicht** vorbelegt; die eingewilligten Verfahren
stehen nur als Information in der Infobox. Doppelte Zeilen werden nicht erneut angehängt.
Jede Übernahme wird im Audit-Log als `aufklaerung_import` festgehalten.

## Fall-ID und Abrechnung

Das Protokoll übernimmt die `id` aus dem QR als eigene `visit_id`, **solange es noch nicht
gezählt wurde**. Damit tragen Aufklärung und Protokoll desselben Patienten dieselbe Fall-ID.
Abgerechnet wird deshalb **1 € pro Fall**:

- Beide Apps akzeptieren denselben Praxis-Token (`anaesthesie.practices`).
  `aprot-check-token` prüft zuerst die Praxis (inkl. Testzeitraum/Sperre) und fällt
  sonst auf die alten Protokoll-Zugänge (`aprot.customers`) zurück.
- `aprot-record-usage` schreibt bei einem Praxis-Token in `anaesthesie.visits`
  (`insert … on conflict (id) do nothing`). Ist die Fall-ID schon durch die Aufklärung
  gezählt, entsteht kein zweiter Eintrag.
- Die Rechnung erstellt weiterhin `anaesthesie-invoice` aus `anaesthesie.visits` –
  eine Rechnung pro Praxis.
- Ein Protokoll ohne vorherige Aufklärung zählt als eigener Fall. Alte Protokoll-Zugänge
  (`aprot.customers`) werden unverändert über `aprot.usage` gezählt.
