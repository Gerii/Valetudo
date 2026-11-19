// upstream-sha256: ebddb0c1ad7451a4b221ed404bc69aa85b3c32cdb208ee8acd77ee62aff7ebc2
export const QuirksHelp = `
## Quirks

Valetudo möchte eine generische Abstraktion sein. Das heißt, es versucht, herstellerspezifische Befehle und Konzepte
zu generischen zu vereinheitlichen, damit du dir keine Gedanken darüber machen musst, welche Robotermarke du kaufst, da Valetudo
auf allen gleich funktioniert.

Manchmal gibt es allerdings Dinge, die nur ein Hersteller oder sogar nur ein einziges Robotermodell kann.
Das in die Kerninfrastruktur von Valetudo aufzunehmen, wäre nicht sinnvoll, da die generische Schnittstelle schnell zu einer
Schnittstelle für einen ganz bestimmten Roboter würde, was dem Kernziel der Herstellerunabhängigkeit widerspräche.

Trotzdem ist es auch nicht immer ideal, die Funktionen auf den kleinsten gemeinsamen Nenner zu beschränken.
Hier kommen Quirks ins Spiel.

**Ein Quirk ist eine hersteller-, roboter- oder firmwarespezifische Stellschraube, die (noch?) nicht in Valetudo passt.**

Ob ein Quirk verfügbar ist, kann sich abhängig von verschiedenen Faktoren jederzeit ändern.
Wenn es ähnliche Quirks bei mehreren Herstellern gibt, werden diese wahrscheinlich irgendwann zu einer echten Capability mit
echten REST-Endpunkten usw.

Stell dir Quirks als eine Art Komfort-Spielwiese zum Testen vor.
Meist sind es Stellschrauben, die du einmal änderst und dann wahrscheinlich nie wieder anfasst.

Bitte versuch nicht, das Ändern von Quirks zu automatisieren, da es keinerlei Garantien gibt, weder was die Stabilität
noch was die Verfügbarkeit angeht. Sie existieren nur für diese Oberfläche.

`;
