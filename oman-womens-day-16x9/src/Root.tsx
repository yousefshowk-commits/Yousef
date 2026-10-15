import React from "react";
import { Composition } from "remotion";
import { FILM_LEN, Film } from "./Film";

export const Root: React.FC = () => (
  <Composition id="OWD169" component={Film} durationInFrames={FILM_LEN * 30} fps={30} width={1920} height={1080} />
);
