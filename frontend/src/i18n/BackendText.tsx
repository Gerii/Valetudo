/*
 * i18n fork (see AGENTS.md): renders a message that originates from the backend/robot in the
 * build language. See translateBackend.ts for the lookup order and display format.
 */
import React from "react";
import {formatBackendTranslation, translateBackend, translateBackendSyncOrOriginal} from "./translateBackend";

export const useBackendText = (text: string | undefined | null): string => {
    const original = text ?? "";
    const [display, setDisplay] = React.useState<string>(() => {
        return translateBackendSyncOrOriginal(original).text;
    });

    React.useEffect(() => {
        let cancelled = false;
        const sync = translateBackendSyncOrOriginal(original);
        setDisplay(sync.text);

        if (sync.source !== "dictionary") {
            translateBackend(original).then((translation) => {
                if (!cancelled) {
                    setDisplay(formatBackendTranslation(original, translation));
                }
            });
        }

        return () => {
            cancelled = true;
        };
    }, [original]);

    return display;
};

export const BackendText: React.FunctionComponent<{ text: string | undefined | null }> = ({text}) => {
    const display = useBackendText(text);

    return <>{display}</>;
};

// For places that need a ReactNode instead of JSX, e.g. snackbars in .ts files
export function backendMessage(prefix: string, text: string): React.ReactNode {
    return (
        <span style={{whiteSpace: "pre-line"}}>
            {prefix}
            <BackendText text={text}/>
        </span>
    );
}
