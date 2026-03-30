import { Composition } from "remotion";
import { StudyRAGDemo } from "./StudyRAGDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StudyRAGDemo"
      component={StudyRAGDemo}
      durationInFrames={30 * 60} // 60 seconds at 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
