import React from "react";
import { AbsoluteFill } from "remotion";
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

export const StudyRAGDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0f1e", fontFamily: "Outfit, sans-serif" }}>
      <TransitionSeries>
        {/* Scene 1: Hero */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <HeroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 2: Upload */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <UploadScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        {/* Scene 3: Learn */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <LearnScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        {/* Scene 4: Chat */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <ChatScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        {/* Scene 5: Quiz */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <QuizScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        {/* Scene 6: Flashcards */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <FlashcardsScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        {/* Scene 7: Analytics */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <AnalyticsScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 8: Outro */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
