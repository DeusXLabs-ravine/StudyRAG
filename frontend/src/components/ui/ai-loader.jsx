import React from "react";

/**
 * AILoader Component
 * High-fidelity full-screen loader for AI generation.
 * Adapted for StudyRAG (JSX + Standard CSS scoped-style).
 */
export const AILoader = ({ size = 180, text = "Generating" }) => {
    const letters = text.split("");

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950">
            {/* Background Character: Subtle Grid (Matching current theme) */}
            <div className="absolute inset-0 z-0 opacity-20">
                <div className="h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            <div
                className="relative flex items-center justify-center font-inter select-none z-10"
                style={{ width: size, height: size }}
            >
                {letters.map((letter, index) => (
                    <span
                        key={index}
                        className="inline-block text-white opacity-40 animate-loaderLetter"
                        style={{
                            animationDelay: `${index * 0.1}s`,
                            fontSize: size * 0.12,
                            fontWeight: 900,
                            letterSpacing: '0.1em'
                        }}
                    >
                        {letter}
                    </span>
                ))}

                <div className="absolute inset-0 rounded-full animate-loaderCircle border-2 border-transparent"></div>
            </div>

            <style>{`
        @keyframes loaderCircle {
          0% {
            transform: rotate(90deg);
            box-shadow:
              0 6px 12px 0 #38bdf8 inset,
              0 12px 18px 0 #005dff inset,
              0 36px 36px 0 #1e40af inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
          50% {
            transform: rotate(270deg);
            box-shadow:
              0 6px 12px 0 #60a5fa inset,
              0 12px 6px 0 #0284c7 inset,
              0 24px 36px 0 #005dff inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
          100% {
            transform: rotate(450deg);
            box-shadow:
              0 6px 12px 0 #4dc8fd inset,
              0 12px 18px 0 #005dff inset,
              0 36px 36px 0 #1e40af inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
        }

        @keyframes loaderLetter {
          0%, 100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          20% {
            opacity: 1;
            transform: scale(1.15);
          }
          40% {
            opacity: 0.7;
            transform: translateY(0);
          }
        }

        .animate-loaderCircle {
          animation: loaderCircle 5s linear infinite;
        }

        .animate-loaderLetter {
          animation: loaderLetter 3s infinite;
        }
      `}</style>
        </div>
    );
};
