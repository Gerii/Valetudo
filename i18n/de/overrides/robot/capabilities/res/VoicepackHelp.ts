// upstream-sha256: 8d7029b0fbdfe9711b6df3bab89020b14691eda7d7c1bed15083f3ce3b2ec0f9
export const VoicepackHelp = `
## Sprachpakete

Eigene Sprachpakete sind etwas komplizierter, da sich das genaue Format je nach Roboter unterscheidet.

Da sie mir persönlich ziemlich egal sind, ist diese Funktion noch etwas ungeschliffen.
Für mich sind diese Dinger in erster Linie Werkzeuge, die einfach funktionieren sollen, und zwar zuverlässig.
Daher ist es für mich völlig in Ordnung, wenn er einfach Englisch spricht, da das für ein Werkzeug vollkommen ausreicht.

Wenn du trotzdem ein eigenes installieren möchtest, brauchst du ein Sprachpaket in dem von deinem Roboter geforderten Format,
das auf irgendeinem HTTP-Server bereitliegt. Beachte, dass das offizielle CDN in der Firmware der Roboter oft blockiert ist, sodass
es wahrscheinlich nicht funktioniert, einfach die offizielle URL zu verwenden.

Je nach Robotermodell brauchst du außerdem einen Hash dieser Sprachpaket-Datei.
Die Art des Hashes unterscheidet sich je nach Firmware.

Außerdem musst du einen Sprachcode angeben. Dieser Wert spielt weitgehend keine große Rolle, solange du keinen reservierten Code verwendest.
„EN“, „CN“ usw. sind oft Codes, die für die eingebauten Sprachpakete der Firmware reserviert sind.

Normalerweise kannst du zum ursprünglich installierten Sprachpaket zurückkehren, indem du bei der Installation einen dieser eingebauten Sprachpaket-Codes angibst.

`;
