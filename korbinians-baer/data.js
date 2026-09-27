/*
 * Spielinhalte für „Korbinians Bär – Die verlorene Reiselast".
 *
 * Koordinaten: Dom, Bahnhof, Brauerei Weihenstephan und Sichtungsgarten sind
 * aus öffentlichen Quellen übernommen, alle anderen sind geschätzt
 * (Feld `geprueft: false`). Vor Ort lassen sie sich mit dem Ortseditor
 * korrigieren: index.html?editor öffnen, Marker verschieben, „Export" tippen
 * und die kopierten Werte hier eintragen.
 */
window.SPIEL = {
  start: { lat: 48.4005, lng: 11.7445, zoom: 16 },

  // Radius (Meter), in dem ein Schatz eingesammelt werden kann
  radiusSchatz: 45,
  radiusFund: 40,

  kapitel: [
    {
      id: "innenstadt",
      titel: "Kapitel 1: Die Innenstadt",
      intro:
        "Der Bär ist mit Korbinians Gepäck durch die Hauptstraße gepoltert, und die Riemen sind gerissen. " +
        "Zwischen Oberer Hauptstraße, Marienplatz und Unterer Hauptstraße liegen die ersten Stücke.",
    },
    {
      id: "domberg",
      titel: "Kapitel 2: Der Domberg",
      intro:
        "Oben auf dem Domberg hat Korbinian um 724 seine Kirche gegründet. " +
        "Hier liegen die wertvollsten Teile seiner Reiselast.",
    },
    {
      id: "weihenstephan",
      titel: "Kapitel 3: Weihenstephan",
      intro:
        "Der Bär hat Durst bekommen und ist hinüber zum Weihenstephaner Berg getrottet. " +
        "Unterwegs hat er natürlich wieder etwas verloren.",
    },
    {
      id: "isar",
      titel: "Kapitel 4: An der Isar",
      intro:
        "Zum Schluss wollte sich der Bär an der Isar abkühlen. " +
        "Sammle die letzten Stücke, dann kann die Reise nach Rom weitergehen!",
    },
  ],

  // Feste Schätze an echten Orten
  schaetze: [
    // ---------- Kapitel 1: Innenstadt ----------
    {
      id: "obere-hauptstrasse",
      kapitel: "innenstadt",
      ort: "Obere Hauptstraße – an der Moosach",
      lat: 48.4015, lng: 11.7425, geprueft: false,
      name: "Glatter Moosachkiesel",
      icon: "🪨",
      punkte: 50,
      frage: "Welcher Bach fließt mitten durch die Freisinger Altstadt?",
      antworten: ["Die Moosach", "Die Amper", "Die Würm"],
      richtig: 0,
      text:
        "Die Stadtmoosach ist ein Arm der Moosach und fließt quer durch die Altstadt. " +
        "Früher trieb ihr Wasser Mühlen und Handwerksbetriebe an. Seit der Umgestaltung der Innenstadt " +
        "ist sie in der Oberen Hauptstraße wieder offen zu sehen, und man kann direkt am Wasser sitzen.",
    },
    {
      id: "marienplatz",
      kapitel: "innenstadt",
      ort: "Marienplatz – Mariensäule",
      lat: 48.4010, lng: 11.7456, geprueft: false,
      name: "Marienmedaille",
      icon: "🏅",
      punkte: 50,
      frage: "Wem ist die Säule auf dem Marienplatz geweiht?",
      antworten: ["Dem heiligen Georg", "Der Gottesmutter Maria", "Dem heiligen Korbinian"],
      richtig: 1,
      text:
        "Der Marienplatz ist das Herz der Altstadt. Die Mariensäule aus dem 17. Jahrhundert gab dem Platz " +
        "seinen Namen. Rundherum liegen das Rathaus, das Asamgebäude und St. Georg, und " +
        "von hier führen die Obere und die Untere Hauptstraße in beide Richtungen.",
    },
    {
      id: "asamgebaeude",
      kapitel: "innenstadt",
      ort: "Asamgebäude am Marienplatz",
      lat: 48.4007, lng: 11.7451, geprueft: false,
      name: "Farbtöpfchen der Asams",
      icon: "🎨",
      punkte: 50,
      frage: "Wofür war die Familie Asam berühmt?",
      antworten: ["Fürs Bierbrauen", "Für Barock-Malerei und Stuck", "Für den Brückenbau"],
      richtig: 1,
      text:
        "Das Asamgebäude trägt den Namen der Künstlerfamilie Asam. Hans Georg Asam und seine Söhne " +
        "Cosmas Damian und Egid Quirin schmückten Kirchen in ganz Bayern mit Fresken und Stuck, " +
        "in Freising auch den Dom. Heute ist das Gebäude ein Kulturzentrum.",
    },
    {
      id: "st-georg",
      kapitel: "innenstadt",
      ort: "Stadtpfarrkirche St. Georg",
      lat: 48.4008, lng: 11.7470, geprueft: false,
      name: "Silbernes Turmglöckchen",
      icon: "🔔",
      punkte: 50,
      frage: "Wie hoch ist der Turm von St. Georg ungefähr?",
      antworten: ["Etwa 40 Meter", "Etwa 84 Meter", "Etwa 150 Meter"],
      richtig: 1,
      text:
        "St. Georg ist die Pfarrkirche der Altstadt. Ihr Turm ist rund 84 Meter hoch und neben dem Dom " +
        "das Wahrzeichen Freisings. Man sieht ihn schon von Weitem.",
    },
    {
      id: "untere-hauptstrasse",
      kapitel: "innenstadt",
      ort: "Untere Hauptstraße – Heiliggeist",
      lat: 48.4020, lng: 11.7500, geprueft: false,
      name: "Brotlaib aus dem Spital",
      icon: "🍞",
      punkte: 50,
      frage: "Wozu diente ein Heiliggeist-Spital im Mittelalter?",
      antworten: ["Als Pferdestall", "Zur Pflege von Armen, Alten und Kranken", "Zum Prägen von Münzen"],
      richtig: 1,
      text:
        "Die Untere Hauptstraße führt vom Marienplatz Richtung Isar. Hier steht die Heiliggeistkirche, " +
        "die zum alten Heiliggeist-Spital gehört: Diese Stiftung versorgte Arme, Alte und Kranke " +
        "und gibt es seit dem Mittelalter.",
    },

    // ---------- Kapitel 2: Domberg ----------
    {
      id: "domberg-aufgang",
      kapitel: "domberg",
      ort: "Aufgang zum Domberg",
      lat: 48.3996, lng: 11.7460, geprueft: false,
      name: "Das Halsband des Bären",
      icon: "📿",
      punkte: 60,
      frage: "In welchem berühmten Wappen taucht der Korbiniansbär auf?",
      antworten: ["Im Wappen von Papst Benedikt XVI.", "Auf der Bayernfahne", "Auf der Euro-Münze"],
      richtig: 0,
      text:
        "Die Legende: Auf dem Weg nach Rom riss ein Bär Korbinians Packpferd. Zur Strafe musste der Bär " +
        "das Gepäck selbst bis nach Rom tragen, danach ließ Korbinian ihn frei. Joseph Ratzinger war " +
        "Erzbischof von München und Freising und übernahm den Bären später in sein Papstwappen.",
    },
    {
      id: "dom",
      kapitel: "domberg",
      ort: "Freisinger Dom St. Maria und St. Korbinian",
      lat: 48.39889, lng: 11.74639, geprueft: true,
      name: "Korbinians Bischofsstab",
      icon: "🪄",
      punkte: 100,
      frage: "Wem ist der Freisinger Dom geweiht?",
      antworten: ["Peter und Paul", "Maria und Korbinian", "Georg und Stephan"],
      richtig: 1,
      text:
        "Der romanische Dom stammt aus dem späten 12. Jahrhundert. Zum 1000-jährigen Jubiläum von " +
        "Korbinians Ankunft gestalteten die Brüder Asam ihn 1724 barock um. In der Krypta steht die " +
        "rätselhafte Bestiensäule mit kämpfenden Fabelwesen. Schau sie dir an!",
    },
    {
      id: "dioezesanmuseum",
      kapitel: "domberg",
      ort: "Diözesanmuseum auf dem Domberg",
      lat: 48.3987, lng: 11.7433, geprueft: false,
      name: "Vergoldetes Buchsiegel",
      icon: "📜",
      punkte: 60,
      frage: "Was zeigt das Diözesanmuseum vor allem?",
      antworten: ["Kirchliche Kunst und Kultur", "Oldtimer-Autos", "Dinosaurier-Skelette"],
      richtig: 0,
      text:
        "Das Diözesanmuseum am Westende des Dombergs zählt mit über 40.000 Objekten zu den größten " +
        "Museen für kirchliche Kunst weltweit, von mittelalterlichen Figuren bis zur Gegenwartskunst.",
    },
    {
      id: "bahnhof",
      kapitel: "domberg",
      ort: "Bahnhof Freising",
      lat: 48.39528, lng: 11.74417, geprueft: true,
      name: "Korbinians Pilgerkarte",
      icon: "🗺️",
      punkte: 40,
      frage: "Welches Tier musste Korbinians Gepäck nach Rom tragen?",
      antworten: ["Ein Esel", "Ein Bär", "Ein Pferd"],
      richtig: 1,
      text:
        "Korbinian war ein Wanderbischof und viel zu Fuß unterwegs, sogar über die Alpen nach Rom. " +
        "Heute kommen die Reisenden bequemer an: Am Bahnhof Freising halten Regionalzüge und die S-Bahn.",
    },

    // ---------- Kapitel 3: Weihenstephan ----------
    {
      id: "lindenkeller",
      kapitel: "weihenstephan",
      ort: "Lindenkeller – Fußweg nach Weihenstephan",
      lat: 48.3985, lng: 11.7370, geprueft: false,
      name: "Goldenes Lindenblatt",
      icon: "🍃",
      punkte: 50,
      frage: "Nach welchem Baum ist der Lindenkeller benannt?",
      antworten: ["Nach der Eiche", "Nach der Kastanie", "Nach der Linde"],
      richtig: 2,
      text:
        "Der Lindenkeller liegt direkt am Fußweg von der Innenstadt hinauf nach Weihenstephan. " +
        "Im Biergarten sitzt man im Schatten alter Bäume, und im Haus gibt es Konzerte, Kabarett und Theater.",
    },
    {
      id: "brauerei",
      kapitel: "weihenstephan",
      ort: "Bayerische Staatsbrauerei Weihenstephan",
      lat: 48.39611, lng: 11.72917, geprueft: true,
      name: "Uralter Hopfenzapfen",
      icon: "🌿",
      punkte: 100,
      frage: "Seit wann wird in Weihenstephan Bier gebraut?",
      antworten: ["Seit 1040", "Seit 1516", "Seit 1810"],
      richtig: 0,
      text:
        "Die Brauerei Weihenstephan gilt als älteste noch bestehende Brauerei der Welt. Seit 1040 wird " +
        "hier gebraut, zuerst von den Mönchen des Klosters, heute vom Freistaat Bayern.",
    },
    {
      id: "hofgarten",
      kapitel: "weihenstephan",
      ort: "Hofgarten Weihenstephan",
      lat: 48.3957, lng: 11.7265, geprueft: false,
      name: "Schlüssel des Abtes",
      icon: "🗝️",
      punkte: 60,
      frage: "Wer lebte früher auf dem Weihenstephaner Berg?",
      antworten: ["Römische Soldaten", "Benediktinermönche", "Raubritter"],
      richtig: 1,
      text:
        "Bis zur Säkularisation 1803 stand hier ein Benediktinerkloster. Im Hofgarten steht das „Salettl“, " +
        "das barocke Sommerhaus der Äbte. Bei klarem Wetter reicht der Blick bis zu den Alpen.",
    },
    {
      id: "sichtungsgarten",
      kapitel: "weihenstephan",
      ort: "Sichtungsgarten Weihenstephan",
      lat: 48.40083, lng: 11.72889, geprueft: true,
      name: "Beutel mit Wundersamen",
      icon: "🌱",
      punkte: 50,
      frage: "Was wird in einem Sichtungsgarten getestet?",
      antworten: ["Stauden und Gartenpflanzen", "Neue Biersorten", "Fahrräder"],
      richtig: 0,
      text:
        "Im Sichtungsgarten wird geprüft, welche Stauden und Gehölze sich für Gärten eignen. " +
        "Heute ist Weihenstephan einer der wichtigsten Standorte für Agrar-, Garten- und " +
        "Lebensmittelforschung, mit der TU München und der Hochschule Weihenstephan-Triesdorf.",
    },

    // ---------- Kapitel 4: Isar ----------
    {
      id: "luitpoldanlage",
      kapitel: "isar",
      ort: "Luitpoldanlage",
      lat: 48.4015, lng: 11.7545, geprueft: false,
      name: "Korbinians Wanderstock",
      icon: "🦯",
      punkte: 50,
      frage: "Nach wem ist die Luitpoldanlage benannt?",
      antworten: ["Nach Prinzregent Luitpold", "Nach König Ludwig II.", "Nach Kaiser Karl dem Großen"],
      richtig: 0,
      text:
        "Die Luitpoldanlage ist ein Park zwischen Altstadt und Isar mit Spielplatz, Skateanlage und viel Grün. " +
        "Wie viele Orte in Bayern trägt sie den Namen von Prinzregent Luitpold.",
    },
    {
      id: "isar",
      kapitel: "isar",
      ort: "An der Isar",
      lat: 48.4008, lng: 11.7585, geprueft: false,
      name: "Silberne Flussmuschel",
      icon: "🐚",
      punkte: 80,
      frage: "In welchen Fluss mündet die Isar?",
      antworten: ["In den Rhein", "In den Inn", "In die Donau"],
      richtig: 2,
      text:
        "Die Isar entspringt im Karwendel, fließt durch München und Freising und mündet bei Deggendorf in die Donau. " +
        "Damit hast du Korbinians Reiselast komplett, und der Bär kann weiter nach Rom ziehen!",
    },
  ],

  // Zufällige Funde, die überall in der Nähe des Spielers auftauchen
  funde: [
    { id: "brezn", name: "Brezn", icon: "🥨", seltenheit: "gewöhnlich", punkte: 10, gewicht: 30 },
    { id: "hopfen", name: "Hopfendolde", icon: "🌾", seltenheit: "gewöhnlich", punkte: 10, gewicht: 30 },
    { id: "tatze", name: "Bärenspur", icon: "🐾", seltenheit: "gewöhnlich", punkte: 10, gewicht: 30 },
    { id: "pfennig", name: "Freisinger Silberpfennig", icon: "🪙", seltenheit: "selten", punkte: 25, gewicht: 10 },
    { id: "honig", name: "Honigtopf", icon: "🍯", seltenheit: "selten", punkte: 25, gewicht: 10 },
    { id: "kerze", name: "Pilgerkerze", icon: "🕯️", seltenheit: "selten", punkte: 25, gewicht: 10 },
    { id: "edelstein", name: "Edelstein vom Reliquienschrein", icon: "💎", seltenheit: "episch", punkte: 75, gewicht: 3 },
  ],
};
