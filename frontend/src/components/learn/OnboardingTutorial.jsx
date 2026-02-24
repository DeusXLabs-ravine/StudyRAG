import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, MousePointer2, BookOpen, Menu } from 'lucide-react';
import { createPortal } from 'react-dom';

const TutorialStep = ({
    title,
    description,
    icon: Icon,
    onNext,
    onDismiss,
    isLast,
    highlightRect,
    stepNumber,
    totalSteps
}) => {
    if (!highlightRect) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Background Dimming with Cutout */}
            <div
                className="absolute inset-0 bg-black/60 pointer-events-auto"
                style={{
                    clipPath: `polygon(
            0% 0%, 0% 100%, 100% 100%, 100% 0%, 
            ${highlightRect.left}px 0%, 
            ${highlightRect.left}px ${highlightRect.top}px, 
            ${highlightRect.right}px ${highlightRect.top}px, 
            ${highlightRect.right}px ${highlightRect.bottom}px, 
            ${highlightRect.left}px ${highlightRect.bottom}px, 
            ${highlightRect.left}px 0%
          )`,
                    transition: 'clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            />

            {/* Highlighter Border */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    top: highlightRect.top - 4,
                    left: highlightRect.left - 4,
                    width: highlightRect.width + 8,
                    height: highlightRect.height + 8
                }}
                className="absolute border-2 border-primary rounded-2xl shadow-[0_0_20px_rgba(14,165,233,0.5)]"
            />

            {/* Floating Tooltip */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                    opacity: 1,
                    y: 0,
                    top: highlightRect.bottom + 20 > window.innerHeight - 300
                        ? highlightRect.top - 240
                        : highlightRect.bottom + 20,
                    left: Math.max(20, Math.min(window.innerWidth - 320, highlightRect.left))
                }}
                className="absolute w-[280px] sm:w-[320px] bg-white rounded-3xl shadow-2xl p-6 pointer-events-auto border border-gray-100"
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-primary/50 uppercase tracking-[0.2em]">Step {stepNumber} / {totalSteps}</p>
                            <h4 className="text-sm font-black text-gray-900">{title}</h4>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">
                    {description}
                </p>

                <div className="flex items-center justify-between">
                    <button
                        onClick={onDismiss}
                        className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                    >
                        Skip Guide
                    </button>
                    <button
                        onClick={onNext}
                        className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                        {isLast ? "Master It" : "Next Step"}
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Pointer Animation */}
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 text-primary"
                >
                    <MousePointer2 className="h-6 w-6 rotate-[135deg] fill-current" />
                </motion.div>
            </motion.div>
        </div>,
        document.body
    );
};

export default function OnboardingTutorial({ onComplete }) {
    const [step, setStep] = useState(1);
    const [rects, setRects] = useState({});

    useEffect(() => {
        const updateRects = () => {
            const docSelect = document.querySelector('select')?.parentElement;
            const mobileMenu = document.querySelector('button[class*="lg:hidden"]');

            setRects({
                docSelect: docSelect?.getBoundingClientRect(),
                mobileMenu: mobileMenu?.getBoundingClientRect()
            });
        };

        updateRects();
        window.addEventListener('resize', updateRects);
        const interval = setInterval(updateRects, 1000); // Poll for changes as page loads

        return () => {
            window.removeEventListener('resize', updateRects);
            clearInterval(interval);
        };
    }, []);

    const steps = [
        {
            id: 1,
            title: "Activate Knowledge",
            description: "First, select a document to transform it into a personalized learning journey. This is where your master files live.",
            icon: BookOpen,
            target: 'docSelect'
        },
        {
            id: 2,
            title: "Navigate Intelligence",
            description: "Use the module menu to switch between different study areas. We've organized your material into optimized learning paths.",
            icon: Menu,
            target: 'mobileMenu'
        }
    ];

    const currentStepData = steps[step - 1];

    const handleNext = () => {
        if (step < steps.length) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    return (
        <AnimatePresence>
            {currentStepData && rects[currentStepData.target] && (
                <TutorialStep
                    key={step}
                    {...currentStepData}
                    stepNumber={step}
                    totalSteps={steps.length}
                    highlightRect={rects[currentStepData.target]}
                    onNext={handleNext}
                    onDismiss={onComplete}
                    isLast={step === steps.length}
                />
            )}
        </AnimatePresence>
    );
}
