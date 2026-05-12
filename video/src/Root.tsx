import React from "react";
import { Composition } from "remotion";
import { StudyRAGDemo } from "./StudyRAGDemo";
import { QuizVertical } from "./scenes/QuizVertical";
import { FlashcardsVertical } from "./scenes/FlashcardsVertical";
import { LearnVertical } from "./scenes/LearnVertical";
import { DocumentsVertical } from "./scenes/DocumentsVertical";
import { ChatVertical } from "./scenes/ChatVertical";
import { AnalyticsVertical } from "./scenes/AnalyticsVertical";
import { ExamVertical } from "./scenes/ExamVertical";
import { LibraryVertical } from "./scenes/LibraryVertical";
import { SimulationsVertical } from "./scenes/SimulationsVertical";
import { LaunchDemoVertical } from "./scenes/LaunchDemoVertical";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Original landscape demo */}
      <Composition
        id="StudyRAGDemo"
        component={StudyRAGDemo}
        durationInFrames={30 * 60}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Vertical 9:16 feature ads — 1080×1920 */}
      <Composition
        id="Quiz"
        component={QuizVertical}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Flashcards"
        component={FlashcardsVertical}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Learn"
        component={LearnVertical}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Documents"
        component={DocumentsVertical}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Chat"
        component={ChatVertical}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Analytics"
        component={AnalyticsVertical}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Exam"
        component={ExamVertical}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Library"
        component={LibraryVertical}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Simulations"
        component={SimulationsVertical}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchDemo"
        component={LaunchDemoVertical}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
