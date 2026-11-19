/*
 * Fork (see AGENTS.md): pages that still exist but are not linked in the navigation drawer.
 * They stay reachable for anyone who knows the URL, e.g. /#/robot/camera.
 */
export const HIDDEN_MENU_ROUTES: ReadonlyArray<string> = [
    "/robot/camera",  // Kamera (Duststreaming); the page still requires camera streaming to be enabled
    "/valetudo/ai",   // KI-Assistent
];
