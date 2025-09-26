
'use client';

import { createContext, useContext, useEffect, useReducer, useCallback, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS } from 'react-joyride';
import { mainTourSteps } from '@/lib/guide-steps';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { HelpCircle } from 'lucide-react';

interface TourState {
  run: boolean;
  steps: Step[];
  stepIndex: number;
  tourId: string | null;
}

type TourAction =
  | { type: 'START_TOUR'; payload: { steps: Step[]; tourId: string; force?: boolean } }
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
        stepIndex: 0,
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
    const [isMounted, setIsMounted] = useState(false);
    const [showStartDialog, setShowStartDialog] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            const mainTourCompleted = localStorage.getItem('mainTourCompleted');
            if (mainTourCompleted !== 'true') {
                setShowStartDialog(true);
            }
        }
    }, [isMounted]);

    const startTour = useCallback((steps: Step[], tourId: string, force = false) => {
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
    }, []);
    
    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, action, index, type } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status) || action === 'close') {
            if (state.tourId) {
                localStorage.setItem(`${state.tourId}Completed`, 'true');
            }
            dispatch({ type: 'RESET' });
        } else if (type === 'step:after' && action === ACTIONS.NEXT) {
            dispatch({ type: 'SET_STEP', payload: index + 1 });
        } else if (type === 'step:after' && action === ACTIONS.PREV) {
             dispatch({ type: 'SET_STEP', payload: index - 1 });
        }
    };
    
    const handleStartTutorial = () => {
        setShowStartDialog(false);
        startTour(mainTourSteps, 'mainTour', true);
    }

    const handleSkipTutorial = () => {
        setShowStartDialog(false);
        localStorage.setItem('mainTourCompleted', 'true');
    }

    return (
        <TourContext.Provider value={{ startTour }}>
            {children}
            {isMounted && (
                <>
                    <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                    <HelpCircle className="h-6 w-6" />
                                    Welcome to CyberGaar!
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    Would you like to take a short tutorial to learn about the key features of the platform?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={handleSkipTutorial}>Skip</AlertDialogCancel>
                                <AlertDialogAction onClick={handleStartTutorial}>Start Tutorial</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
                </>
            )}
        </TourContext.Provider>
    );
};
