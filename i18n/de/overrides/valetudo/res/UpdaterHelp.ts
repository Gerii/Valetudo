// upstream-sha256: c6f6da0e44c1cfa37d4b741089e3ec6ff04ba575446b0f7f0e15e7ac9ec01a0b
export const UpdaterHelp = `
## Updater

Der Valetudo-Updater ist eine Komfortfunktion, die das Leben mit Valetudo ein bisschen einfacher machen soll.

Da er mit Blick auf Privatsphäre gebaut wurde, musst du manuell auf einen Button klicken, damit er nach neueren Valetudo-Versionen sucht.
Keine tägliche Update-Prüfung bedeutet keine täglichen Pings an irgendeinen externen Server.

Standardmäßig fragt er die GitHub-API ab, was bedeutet, dass ich keinerlei Daten über dich sammeln kann.

**Hinweis: Der Updater versucht immer, dich auf das chronologisch nächste Release zu aktualisieren. Wenn du mehrere Releases im Rückstand bist,
musst du mehrmals hintereinander aktualisieren.**

Da der Updater nur eine Komfortfunktion ist, kann es Situationen geben, in denen er nicht funktioniert. In diesen Situationen
musst du ein manuelles Update durchführen, wofür normalerweise SSH-Zugriff auf den Roboter nötig ist.

Manchmal kann eine Konfigurationsänderung es dir ermöglichen, den Updater zu nutzen. In anderen Fällen kann dein Robotermodell den Updater
überhaupt nicht nutzen, weil nicht genug Speicher verbaut ist. Das ist kein Bug. Das ist einfach so.

Erwähnenswert ist auch, dass der Updater nicht die Firmware des Roboters aktualisiert. Er aktualisiert nur die Valetudo-Binärdatei.

`;
