// upstream-sha256: 2f777dcc5e992204de9b709179c84162a490ec0480a68115097ff70f55aff23c
export const SegmentEditHelp = `
## Bereichsverwaltung

Ein Bereich ist ein Teil der Karte, so wie ihn die Firmware des Roboters festgelegt hat.
Mit Bereichen kannst du gezielt nur einen oder mehrere davon reinigen. Bei den meisten Firmwares kannst du sie auch benennen.

Vielleicht kennst du sie als Räume, allerdings müssen sie nicht unbedingt echte Räume sein.
Es könnte zum Beispiel einen Bereich geben, der nur die Fläche um deinen Esstisch umfasst.

Bei den meisten Firmwares nutzt der Roboter die Bereichsdaten, um seine Navigation zu optimieren und den effizientesten Weg zu fahren.


Du kannst einen Bereich auswählen, indem du darauf klickst. Je nach Firmware kannst du ihn dann in zwei teilen oder ihm einen Namen geben.
Wenn du einen weiteren Bereich auswählst, kannst du die beiden auch zu einem größeren Bereich zusammenführen, sofern die Firmware das zulässt.


Die Farben der Bereiche werden vom Karten-Renderer spontan festgelegt und haben keine Bedeutung. Sie sind einfach unterschiedlich, damit du
sie voneinander unterscheiden kannst. Ab und zu können Bereiche auch die Farbe wechseln, weil sich eines oder mehrere ihrer Pixel geändert haben.

### Häufige Probleme/Fragen

#### Ich sehe keine Bereiche

Du kannst Bereiche nur bearbeiten, wenn es welche gibt. Wenn du nur eine blaue Karte siehst, hast du keine Bereiche.

Stell sicher, dass du eine Komplettreinigung durchgeführt hast, bei der der Roboter ohne jede Unterbrechung von selbst zu seiner Station zurückgekehrt ist.
Das ist normalerweise nötig, damit der Roboter die Karte in Bereiche aufteilt.

Außerdem musst du bei manchen Firmwares das Speichern persistenter Karten erst manuell aktivieren, bevor du diese Komplettreinigung startest.

#### Ich kann einen Bereich nicht teilen

Manchmal muss man an der Position der Schnittlinie etwas herumprobieren, bis es klappt.
Die Schnittlinie muss nicht sorgfältig exakt zwischen den Wandpixeln platziert werden. Genau das verhindert sogar oft
eine erfolgreiche Teilung. Zieh sie stattdessen über die gesamte Breite/Höhe des Bereichs statt nur über einen Teil davon.

Bei manchen Raumaufteilungen musst du einen Bereich eventuell auch mehrmals teilen und einige der Teile dann wieder zusammenführen, um
das gewünschte Ergebnis zu bekommen.

#### Kann ich einen Bereich löschen?

Nein.

`;
