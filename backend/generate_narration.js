const fs = require('fs');
const path = require('path');
const { synthesizeSpeech } = require('./src/services/ttsService');

// Define scene narration
const SCENES = [
  { id: 'hero', text: "Welcome to StudyRAG. Transform any document into an interactive learning experience with our AI-powered adaptive study platform." },
  { id: 'upload', text: "Start by bringing your own knowledge. Simply upload your PDF, document, or paste a URL to begin." },
  { id: 'learn', text: "Dive into our unique digital chalkboard. AI breaks down complex concepts into digestible lessons tailored just for you." },
  { id: 'chat', text: "Need clarification? Ask your personal AI Tutor. Every answer is grounded in your uploaded materials with direct citations." },
  { id: 'quiz', text: "Test your knowledge with adaptive quizzes that identify your weak areas and help you master every topic." },
  { id: 'flashcards', text: "Retain information forever with smart flashcards, powered by the industry-standard spaced repetition algorithm." },
  { id: 'analytics', text: "Visualize your growth with real-time analytics. Track your mastery score and see your progress across every subject." },
  { id: 'outro', text: "Join the StudyRAG community today and reimagine how you learn. Adaptive learning starts now at studyrag.co." }
];

async function generateAll() {
  console.log("Starting voiceover generation...");
  
  for (const scene of SCENES) {
    try {
      console.log(`Generating audio for: ${scene.id}...`);
      const buffer = await synthesizeSpeech(scene.text, "Kore"); // Using Kore for warm female voice
      const filename = path.join(__dirname, `../video/public/audio/voiceover/${scene.id}.wav`);
      fs.writeFileSync(filename, buffer);
      console.log(`Saved ${filename}`);
    } catch (error) {
      console.error(`Failed to generate ${scene.id}:`, error.message);
    }
  }
  
  console.log("Voiceover generation complete!");
}

generateAll();
