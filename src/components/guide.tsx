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
    
    useEffect(() => {
        const tourCompleted = localStorage.getItem('tourCompleted');
        if (tourCompleted !== 'true') {
            startTour();
        }
    }, []);

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
            const nextStepIndex = index + (data.action === 'prev' ? -1 : 1);
            const nextStep = allSteps[nextStepIndex];
            
            if (nextStep) {
                const nextPath = getPathForStep(nextStep.target);
                if (nextPath !== pathname) {
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
    
    useEffect(() => {
        const currentStep = allSteps[stepIndex];
        if (run && currentStep && getPathForStep(currentStep.target) === pathname) {
            setTimeout(() => {
                setRun(true);
            }, 300);
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
                      color: 'hsl(var(--primary))',
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
        </GuideContext.Provider>
    );
};
