
'use client';

import { createContext, useContext, useEffect, useReducer } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { mainTourSteps } from '@/lib/guide-steps';

interface TourState {
  run: boolean;
  steps: Step[];
  stepIndex: number;
  tourId: string | null;
}

type TourAction =
  | { type: 'START_TOUR'; payload: { steps: Step[]; tourId: string; stepIndex?: number; force?: boolean } }
  | { type: 'STOP_TOUR' }
  | { type: 'RESET' }
  | { type: 'SET_STEP'; payload: number };

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
        run: true,
        steps: action.payload.steps,
        tourId: action.payload.tourId,
        stepIndex: action.payload.stepIndex || 0,
      };
    case 'STOP_TOUR':
      return {
        ...state,
        run: false,
      };
    case 'RESET':
        return {
            ...state,
            run: false,
            stepIndex: 0,
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

export function GuideProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(tourReducer, initialState);

    useEffect(() => {
        const mainTourCompleted = localStorage.getItem('mainTourCompleted');
        if (mainTourCompleted !== 'true') {
            dispatch({ type: 'START_TOUR', payload: { steps: mainTourSteps, tourId: 'mainTour' } });
        }
    }, []);

    const startTour = (steps: Step[], tourId: string, force = false) => {
        const tourCompleted = localStorage.getItem(`${tourId}Completed`);
        if (force) {
            dispatch({ type: 'STOP_TOUR' });
            setTimeout(() => {
                dispatch({ type: 'START_TOUR', payload: { steps, tourId, force } });
            }, 100);
            return;
        }

        if (tourCompleted !== 'true') {
            dispatch({ type: 'START_TOUR', payload: { steps, tourId } });
        }
    };
    
    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, action } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status) || action === 'close') {
            if (state.tourId) {
                localStorage.setItem(`${state.tourId}Completed`, 'true');
            }
            dispatch({ type: 'RESET' });
        }
    };
    
    return (
        <TourContext.Provider value={{ startTour }}>
            {children}
            <Joyride
                run={state.run}
                steps={state.steps}
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
        </TourContext.Provider>
    );
};
