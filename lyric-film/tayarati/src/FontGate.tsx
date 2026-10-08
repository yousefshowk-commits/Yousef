import React from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { FONTS } from "./fonts";

let loading: Promise<void> | null = null;
const loadAll = () =>
  (loading ??= Promise.all(
    FONTS.map(([family, weight, file, unicodeRange]) =>
      new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, { weight, unicodeRange, display: "block" })
        .load()
        .then((f) => void document.fonts.add(f)),
    ),
  ).then(() => undefined));

// Holds the frame until every Arabic/Latin face is in, so no frame renders with fallback shaping.
export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = React.useState(() => delayRender("fonts"));
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    loadAll().then(() => { setReady(true); continueRender(handle); });
  }, [handle]);
  return ready ? <>{children}</> : null;
};
