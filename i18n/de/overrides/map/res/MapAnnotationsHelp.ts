// upstream-sha256: 278fed33f15fda3fa5341b4fd7b9eeaed5c9c3d0a133fde21adc92d708b491f0
export const MapAnnotationsHelp = `
## Kartenanmerkungen

Kartenanmerkungen sind das allgemeine Konzept für jede Art von „da ist etwas auf der Karte, das der Roboter kennen muss und das sich womöglich nicht zuverlässig automatisch erkennen lässt“.
Je nach Firmware-Unterstützung kann das zum Beispiel eine überfahrbare Schwelle, ein Vorhang, eine Rampe oder Ähnliches sein.

Wenn diese Dinge in der Karte vorhanden sind, verhält sich die Firmware an der jeweiligen Stelle auf irgendeine Weise anders.
Sie nimmt dann vielleicht einen bestimmten Weg, vertraut ihrer Hindernisvermeidung weniger oder Ähnliches.

Im Einzelnen:

#### Schwellen

Schwellen geben der Firmware den Hinweis, dass das Hindernis, das sie sieht, eigentlich etwas ist, das sie überqueren kann, wenn sie sich nur mehr anstrengt.
Ohne die Anmerkung merkt sie vielleicht nicht, dass sie das kann.

#### Rampen

Rampen geben der Firmware den Hinweis, dass es einen funktionierenden, eigens dafür vorgesehenen Weg gibt, um einen bestimmten Bereich zu erreichen.
Ohne die Anmerkung merkt sie vielleicht nicht, dass es ihn gibt.

#### Vorhänge

Vorhänge geben der Firmware den Hinweis, dass das Hindernis, das sie gerade ansieht, eigentlich gar keins ist und sie einfach hineinfahren kann.
Ohne die Anmerkung merkt sie nicht, dass das der Fall ist.

`;
