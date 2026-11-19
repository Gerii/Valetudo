// upstream-sha256: 0e9265e2594a7c681f09439c95e644b8d1dccc968d9bad11fe82b12e0ced2694
export const MapManagementHelp = `
## Kartenverwaltung

Auf dieser Seite kannst du kartenbezogene Aufgaben erledigen. Was genau hier möglich ist, hängt von deinem Robotermodell sowie
dessen Firmware ab.<br/>Wenn du etwas auf dieser Seite nicht siehst, wird es von deinem Roboter wahrscheinlich nicht unterstützt.

Bei manchen Robotern musst du persistente Karten erst manuell aktivieren, bevor du die meisten kartenbezogenen Dinge tun kannst.
Andere erlauben es nicht einmal, persistente Karten zu deaktivieren, denn warum solltest du auch.

Es gibt außerdem einige ältere Roboter, die überhaupt keine persistenten Karten haben.

Manche Roboter benötigen eine Komplettreinigung, bei der sie von selbst zur Station zurückkehren, damit eine neue Karte gespeichert wird.
Andere erlauben optional eine schnelle Kartierung per Kartierungsfahrt oder setzen sogar eine Kartierungsfahrt voraus, bevor sie benutzt werden können.

### Begriffe

Bitte beachte, dass all diese Konzepte Firmware-Unterstützung durch deinen Roboter benötigen.
Nicht alles ist auf jedem Roboter verfügbar.

#### Bereiche

Ein Bereich ist ein Teil der Karte, so wie ihn die Firmware des Roboters festgelegt hat.
Mit Bereichen kannst du gezielt nur einen oder mehrere davon reinigen. Bei den meisten Firmwares kannst du sie auch benennen.

Vielleicht kennst du sie als Räume, allerdings müssen sie nicht unbedingt echte Räume sein.
Es könnte zum Beispiel einen Bereich geben, der nur die Fläche um deinen Esstisch umfasst.

Bei den meisten Firmwares nutzt der Roboter die Bereichsdaten, um seine Navigation zu optimieren und den effizientesten Weg zu fahren.

#### Zonen

Zonen sind einfach Rechtecke, die du auf die Karte zeichnen kannst, um den Roboter dorthin zu schicken.
Je nach Firmware deines Roboters akzeptiert er nur eine oder mehrere Zonen als Eingabe.
`;
