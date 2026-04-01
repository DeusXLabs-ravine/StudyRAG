import React from "react";
import { Audio, staticFile } from "remotion";

export const BackgroundAudio: React.FC = () => {
  return (
    <Audio
      src={staticFile("/audio/soundtrack.wav")}
      volume={0.3}
      placeholder={null}
    />
  );
};
