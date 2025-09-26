'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from 'react-joyride';
import { useRouter, usePathname } from 'next/navigation';
import { steps as allSteps, getPathForStep } from '@/lib/guide-steps';

const GuideContext = createContext<{
  startTour: () => void;
}>({
  startTour: () => {},
});

export const useGuide = () => useContext(GuideContext);

interface GuideProviderProps {
    children: React.ReactNode;
}

export const GuideProvider = ({ children }: GuideProviderProps) => {
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const router = useRouter();
    const pathname = usePathname();

    const startTour = useCallback(() => {
        setStepIndex(0);
        setRun(true);
    }, []);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, step, index } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            setStepIndex(0);
            localStorage.setItem('tourCompleted', 'true');
            return;
        }

        if (type === EVENTS.STEP_AFTER) {
            const nextStepIndex = index + 1;
            const nextStep = allSteps[nextStepIndex];
            
            if (nextStep) {
                const nextPath = getPathForStep(nextStep.target);
                if (nextPath !== pathname) {
                    // Navigate and then the useEffect will handle continuing the tour
                    setStepIndex(nextStepIndex);
                    router.push(nextPath);
                } else {
                     setStepIndex(nextStepIndex);
                }
            } else {
                 setStepIndex(index + (step.placement === 'center' ? 1 : 0));
            }
        }
    };
    
    // Effect to run tour step when page navigation is complete
    useEffect(() => {
        const currentStep = allSteps[stepIndex];
        if (run && currentStep && getPathForStep(currentStep.target) === pathname) {
             // This timeout gives the page a moment to render before the step appears
            setTimeout(() => {
                setRun(true);
            }, 100);
        }
    }, [pathname, run, stepIndex]);
    
    return (
        <GuideContext.Provider value={{ startTour }}>
            {children}
            <Joyride
                run={run}
                steps={allSteps}
                stepIndex={stepIndex}
                continuous
                showProgress
                showSkipButton
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        arrowColor: 'hsl(var(--card))',
                        backgroundColor: 'hsl(var(--card))',
                        overlayColor: 'rgba(0, 0, 0, 0.8)',
                        primaryColor: 'hsl(var(--primary))',
                        textColor: 'hsl(var(--card-foreground))',
                        zIndex: 1000,
                    },
                    buttonClose: {
                        color: 'hsl(var(--card-foreground))',
                    },
                    buttonNext: {
                        backgroundColor: 'hsl(var(--primary))',
                    },
                    buttonBack: {
                        color: 'hsl(var(--primary))',
                    }
                }}
            />
        </GuideContext.Provider>
    );
};
