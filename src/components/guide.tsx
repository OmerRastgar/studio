
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useReducer, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from 'react-joyride';
import { useRouter, usePathname } from 'next/navigation';
import { mainTourSteps, getPathForStep } from '@/lib/guide-steps';

interface TourState {
  run: boolean;
  steps: Step[];
  stepIndex: number;
  tourId: string | null;
}

type TourAction =
  | { type: 'START_TOUR'; payload: { steps: Step[]; tourId: string; stepIndex?: number } }
  | { type: 'STOP_TOUR' }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'RESET' };

const initialState: TourState = {
  run: false,
  steps: [],
  stepIndex: 0,
  tourId: null,
};

function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case 'START_TOUR':
      return {
        ...state,
        run: true,
        steps: action.payload.steps,
        tourId: action.payload.tourId,
        stepIndex: action.payload.stepIndex || 0,
      };
    case 'STOP_TOUR':
      return {
        ...state,
        run: false,
        stepIndex: 0,
      };
    case 'RESET':
        return {
            ...initialState,
        };
    case 'SET_STEP':
      return {
        ...state,
        stepIndex: action.payload,
      };
    default:
      return state;
  }
}

const TourContext = createContext<{
  startTour: (steps: Step[], tourId: string, force?: boolean) => void;
}>({
  startTour: () => {},
});

export const useGuide = () => useContext(TourContext);

interface GuideProviderProps {
    children: React.ReactNode;
}

export const GuideProvider = ({ children }: GuideProviderProps) => {
    const [state, dispatch] = useReducer(tourReducer, initialState);
    const router = useRouter();
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    const startTour = useCallback((tourSteps: Step[], id: string, force: boolean = false) => {
        const tourCompleted = isMounted ? localStorage.getItem(`${id}Completed`) : 'true';

        // Always stop the current tour before starting a new one if forced
        if (force) {
            dispatch({ type: 'STOP_TOUR' }); 
            // Use a timeout to ensure the state updates before starting the new tour
            setTimeout(() => {
                dispatch({ type: 'START_TOUR', payload: { steps: tourSteps, tourId: id } });
            }, 100);
            return;
        }
        
        if (tourCompleted !== 'true') {
            dispatch({ type: 'START_TOUR', payload: { steps: tourSteps, tourId: id } });
        }
    }, [isMounted]);
    
    useEffect(() => {
        if (isMounted) {
            // Check for tour state in session storage for multi-page navigation
            const sessionTourState = sessionStorage.getItem('tourState');
            if (sessionTourState) {
                const { tourId, stepIndex, steps } = JSON.parse(sessionTourState);
                sessionStorage.removeItem('tourState');
                dispatch({ type: 'START_TOUR', payload: { steps, tourId, stepIndex } });
            } else {
                startTour(mainTourSteps, 'mainTour');
            }
        }
    }, [isMounted, startTour]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, index, action, step } = data;
        
        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status) || action === 'close') {
            if (state.tourId) {
                localStorage.setItem(`${state.tourId}Completed`, 'true');
            }
            dispatch({ type: 'RESET' });
            return;
        }

        if (type === EVENTS.STEP_AFTER && action === 'next') {
            const nextStepIndex = index + 1;
            const nextStep = state.steps[nextStepIndex];
            
            if (nextStep) {
                const nextPath = getPathForStep(nextStep.target);

                if (nextPath && nextPath !== pathname) {
                    // Save tour state to session storage before navigating
                    const tourStateToSave = {
                        tourId: state.tourId,
                        stepIndex: nextStepIndex,
                        steps: state.steps
                    };
                    sessionStorage.setItem('tourState', JSON.stringify(tourStateToSave));
                    router.push(nextPath);
                    dispatch({ type: 'STOP_TOUR' }); // Stop tour on current page
                } else {
                     dispatch({ type: 'SET_STEP', payload: nextStepIndex });
                }
            }
        } else if (type === EVENTS.STEP_AFTER && action === 'prev') {
             const prevStepIndex = index - 1;
             dispatch({ type: 'SET_STEP', payload: prevStepIndex });
        }
    };
    
    const memoizedSteps = useMemo(() => state.steps, [state.steps]);
    
    return (
        <TourContext.Provider value={{ startTour }}>
            {children}
            {isMounted && (
                <Joyride
                    run={state.run}
                    steps={memoizedSteps}
                    stepIndex={state.stepIndex}
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
