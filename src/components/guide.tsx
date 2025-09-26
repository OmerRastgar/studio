'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from 'react-joyride';
import { useRouter, usePathname } from 'next/navigation';
import { mainTourSteps, getPathForStep, reportGenerationTourSteps, dashboardTourSteps } from '@/lib/guide-steps';

const TourContext = createContext<{
  startTour: (steps: Step[], tourId: string) => void;
}>({
  startTour: () => {},
});

export const useGuide = () => useContext(TourContext);

interface GuideProviderProps {
    children: React.ReactNode;
}

export const GuideProvider = ({ children }: GuideProviderProps) => {
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [tourId, setTourId] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    const startTour = useCallback((tourSteps: Step[], id: string) => {
        const tourCompleted = localStorage.getItem(`${id}Completed`);
        if (tourCompleted !== 'true') {
            setSteps(tourSteps);
            setTourId(id);
            setStepIndex(0);
            setRun(true);
        }
    }, []);
    
    const startMainTour = useCallback(() => {
        startTour(mainTourSteps, 'mainTour');
    }, [startTour]);

    useEffect(() => {
        if (isMounted) {
            startMainTour();
        }
    }, [isMounted, startMainTour]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, index, action } = data;
        
        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status) || action === 'close') {
            setRun(false);
            setStepIndex(0);
            if (tourId) {
                localStorage.setItem(`${tourId}Completed`, 'true');
            }
            return;
        }

        if (type === EVENTS.STEP_AFTER) {
            const nextStepIndex = index + (action === 'prev' ? -1 : 1);
            const currentSteps = steps; // Use the steps from the state
            const nextStep = currentSteps[nextStepIndex];
            
            if (nextStep) {
                const nextPath = getPathForStep(nextStep.target);
                if (nextPath && nextPath !== pathname) {
                    setRun(false);
                    router.push(nextPath);
                    setTimeout(() => {
                        setStepIndex(nextStepIndex);
                        setRun(true);
                    }, 500); // Delay to allow page transition
                } else {
                     setStepIndex(nextStepIndex);
                }
            }
        }
    };
    
    // Determine which steps to use based on the tourId
    const allSteps = tourId === 'reportGenTour' ? reportGenerationTourSteps : (tourId === 'dashboardTour' ? dashboardTourSteps : mainTourSteps);
    
    return (
        <TourContext.Provider value={{ startTour }}>
            {children}
            {isMounted && (
                <Joyride
                    run={run}
                    steps={steps}
                    stepIndex={stepIndex}
                    continuous
                    showProgress
                    showSkipButton
                    callback={handleJoyrideCallback}
                    styles={{
                        options: {
                          arrowColor: 'hsl(var(--card))',
                          zIndex: 10000,
                        },
                        tooltip: {
                          backgroundColor: 'hsl(var(--card))',
                          color: 'hsl(var(--card-foreground))',
                          borderRadius: 'var(--radius)',
                          border: '1px solid hsl(var(--border))',
                        },
                        tooltipContainer: {
                          textAlign: 'left',
                        },
                        tooltipContent: {
                          padding: '1rem',
                        },
                        buttonNext: {
                          backgroundColor: 'hsl(var(--primary))',
                          color: 'hsl(var(--primary-foreground))',
                          borderRadius: 'var(--radius)',
                        },
                        buttonBack: {
                          color: 'hsl(var(--muted-foreground))',
                        },
                        buttonSkip: {
                          color: 'hsl(var(--muted-foreground))',
                        },
                        buttonClose: {
                            color: 'hsl(var(--card-foreground))',
                        },
                        spotlight: {
                          borderRadius: 'var(--radius)',
                        },
                    }}
                />
            )}
        </TourContext.Provider>
    );
};
