// upstream-sha256: 7740d95b86aaa5e725a026654a31691fa77f455888613dc50dfe8ab95f8c844c
export const DuststreamingLecture = `
Hey,

kurz mal innehalten.

Du bist dabei, eine Funktion zu aktivieren, die wirklich cool ist, aber dein gesamtes Bedrohungsmodell grundlegend verändert.<br/>
Und zwar nicht nur für dich, sondern **auch(!)** für die Menschen, die mit dir zusammenleben oder dich besuchen.

Wo ein Saugroboter bisher einfach nur ein Saugroboter war, kann er jetzt als versteckte Spionagekamera dienen, und Unbeteiligte haben absolut keine Möglichkeit zu erkennen, dass sie womöglich aufgezeichnet werden.

Das ist schlecht für Dritte wie deine Partnerin, deinen Partner oder Freunde, die zu Besuch sind, denn Privatsphäre ist ein grundlegendes Menschenrecht. Sie zu missachten - und sei es nur aus Unachtsamkeit - kann zu Vertrauensverlust, zum Verlust von Zuversicht und zu all den Folgen führen, die sich daraus ergeben.
Außerdem ist es auch für dich selbst schlecht, weil es dich genauso betreffen kann, denn jedes vernetzte Gerät könnte irgendwann von einem möglicherweise feindseligen Dritten kontrolliert werden.

Deshalb **muss** jede Person, die deine Räume betritt, wissen, dass jemand oder etwas sie über den Roboter beobachten könnte.
Das ist eine ethische Pflicht und kann, je nachdem, wo du lebst, auch eine rechtliche sein.

Da du auf genau dieselbe Weise betroffen bist, musst auch du dir dessen bewusst bleiben.
Irgendwann wirst du es allerdings vergessen, und du solltest dich auf dieses wahrscheinlich unvermeidliche Ergebnis einstellen.

Es kann sinnvoll sein, eine Weile mit dieser Funktion herumzuspielen, Spaß damit zu haben und sie dann einfach wieder zu deaktivieren, statt die Funktion ungenutzt herumliegen zu lassen, bereit, missbraucht zu werden.
Dabei wirst du sehen, wie unauffällig das Ganze ist und wie viel diese Roboter sehen können.

In einer besseren Welt würden Hersteller Roboter mit Kameras bauen, die fest verdrahtete Aktivitäts-LEDs haben. Und idealerweise würden sie vollständig offline funktionieren.

<br/>

**Hinweis**:

Diese Funktion bringt einen nicht authentifizierten Fern-Notausschalter mit, der es seltsamen Internet-Bürgerwehren ermöglicht, Schadensbegrenzung zu betreiben, während sie durch versehentlich offen im Netz stehende IoT-Geräte auf shodan doomscrollen. Das hilft allerdings nur bedingt und nur gegen Bedrohungen von außen, die hier der weitaus unwahrscheinlichere Fehlerfall sind.

Es sollte selbstverständlich sein, dass Überwachung fehlendes Vertrauen grundsätzlich nicht ersetzen kann, auch wenn Anbieter von Sicherheitstechnik dir gerne etwas anderes weismachen würden.
Mehr Kameras machen dein Zuhause nicht sicherer, und Beziehungen retten können sie erst recht nicht.

- Entscheide nicht eigenmächtig, das heimlich zu aktivieren.
- Frag nicht so nach Zustimmung, dass Ja zu sagen die einzige bequeme Option ist.
- Schieb die Last der Ablehnung nicht der anderen Person zu.
- Werte fehlende Beschwerden nicht als Zustimmung.

Kurz gesagt: Widersteh den Voreinstellungen.<br/>
Sei das Gegenteil der aktuellen Markttrends: Mach das Ablehnen und Neinsagen völlig reibungslos.

Wir müssen zwar in dieser Welt leben, aber wir müssen nicht Teil davon sein.<br/>
Und jetzt viel ethischen™ Spaß.
`;

export const DuststreamingInstallInstructions = (binaryPath: string | undefined): string => {
    return `
Der Teil der Kamera-Streaming-Funktion, der für Videoaufnahme, -verarbeitung und -kodierung zuständig ist, steckt im gstreamer-basierten [duststreamer](https://github.com/hypfer/duststreamer).
Das ist mal wieder eine statisch gelinkte einzelne Binärdatei, die auf den Roboter gelegt wird - und die man auch wieder wegfeuern kann, um Kamera-Streaming wieder technisch unmöglich zu machen.

Um die Einrichtung abzuschließen, lege eine ausführbare \`duststreamer\`-Binärdatei unter \`${binaryPath}\` ab und lade die Seite neu.
`;
};
