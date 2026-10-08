import React from "react";
import { Composition } from "remotion";
import { FILM_LEN, Tayarati } from "./Tayarati";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Tayarati" component={Tayarati} durationInFrames={Math.ceil(FILM_LEN * 60)} fps={60} width={1080} height={1920} />
    <Composition id="Tayarati30" component={Tayarati} durationInFrames={Math.ceil(FILM_LEN * 30)} fps={30} width={1080} height={1920} />
  </>
);
