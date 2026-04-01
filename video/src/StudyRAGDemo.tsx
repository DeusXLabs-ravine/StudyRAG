import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { HeroScene } from "./scenes/HeroScene";
import { UploadScene } from "./scenes/UploadScene";
import { LearnScene } from "./scenes/LearnScene";
import { ChatScene } from "./scenes/ChatScene";
import { QuizScene } from "./scenes/QuizScene";
import { FlashcardsScene } from "./scenes/FlashcardsScene";
import { AnalyticsScene } from "./scenes/AnalyticsScene";
import { OutroScene } from "./scenes/OutroScene";
import { BackgroundAudio } from "./scenes/BackgroundAudio";

export const StudyRAGDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FAFC", fontFamily: "Outfit, sans-serif" }}>
      <BackgroundAudio />
      <TransitionSeries>
        {/* Scene 1: Hero */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Audio src={staticFile("/audio/voiceover/hero.wav")} />
          <HeroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 2: Upload */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Audio src={staticFile("/audio/voiceover/upload.wav")} />
          <UploadScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        {/* Scene 3: Learn */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Audio src={staticFile("/audio/voiceover/learn.wav")} />
          <LearnScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        {/* Scene 4: Chat */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Audio src={staticFile("/audio/voiceover/chat.wav")} />
          <ChatScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        {/* Scene 5: Quiz */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Audio src={staticFile("/audio/voiceover/quiz.wav")} />
          <QuizScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        {/* Scene 6: Flashcards */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Audio src={staticFile("/audio/voiceover/flashcards.wav")} />
          <FlashcardsScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        {/* Scene 7: Analytics */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Audio src={staticFile("/audio/voiceover/analytics.wav")} />
          <AnalyticsScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 8: Outro */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Audio src={staticFile("/audio/voiceover/outro.wav")} />
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
