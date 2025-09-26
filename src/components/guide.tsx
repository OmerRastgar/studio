'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { Steps } from 'intro.js-react';
import { useRouter, usePathname } from 'next/navigation';
import { steps as allSteps } from '@/lib/guide-steps';

const GuideContext = createContext<{
  setTourEnabled: (enabled: boolean) => void;
  setInitialStep: (step: number) => void;
}>({
  setTourEnabled: () => {},
  setInitialStep: () => {},
});

export const useGuide = () => useContext(GuideContext);

export const GuideProvider = ({
  children,
  setTourEnabled,
  setInitialStep
}: {
  children: React.ReactNode;
  setTourEnabled: (enabled: boolean) => void;
  setInitialStep: (step: number) => void;
}) => {
  return (
    <GuideContext.Provider value={{ setTourEnabled, setInitialStep }}>
      {children}
    </GuideContext.Provider>
  );
};

interface GuideProps {
  tourEnabled: boolean;
  setTourEnabled: (enabled: boolean) => void;
  initialStep: number;
  setInitialStep: (step: number) => void;
}

export function Guide({
  tourEnabled,
  setTourEnabled,
  initialStep,
  setInitialStep,
}: GuideProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isNavigating = useRef(false);

  useEffect(() => {
    isNavigating.current = false;
  }, [pathname]);

  const onExit = () => {
    setTourEnabled(false);
    localStorage.setItem('tourCompleted', 'true');
  };

  const onBeforeChange = (nextStepIndex: number) => {
    if (isNavigating.current) {
        return false;
    }
    
    // Check if a step is provided (it can be null)
    if (nextStepIndex === null || nextStepIndex === undefined) {
      return true;
    }

    const nextStep = allSteps[nextStepIndex];
    if (nextStep && nextStep.path && nextStep.path !== pathname) {
      isNavigating.current = true;
      router.push(nextStep.path);
      
      // We need to keep track of the step we are going to
      setInitialStep(nextStepIndex);
      return false; // Prevent intro.js from moving to the next step immediately
    }
    
    return true;
  };

  return (
    <Steps
      enabled={tourEnabled && !isNavigating.current}
      steps={allSteps}
      initialStep={initialStep}
      onExit={onExit}
      onBeforeChange={onBeforeChange}
      options={{
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
        tooltipClass: 'custom-tooltip',
      }}
    />
  );
}
