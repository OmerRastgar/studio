'use client';

import { createContext, useContext } from 'react';
import { Steps } from 'intro.js-react';
import { useRouter, usePathname } from 'next/navigation';
import { steps as allSteps } from '@/lib/guide-steps';

const GuideContext = createContext<{
  setTourEnabled: (enabled: boolean) => void;
}>({
  setTourEnabled: () => {},
});

export const useGuide = () => useContext(GuideContext);

export const GuideProvider = ({
  children,
  setTourEnabled,
}: {
  children: React.ReactNode;
  setTourEnabled: (enabled: boolean) => void;
}) => {
  return (
    <GuideContext.Provider value={{ setTourEnabled }}>
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

  const onExit = () => {
    setTourEnabled(false);
    localStorage.setItem('tourCompleted', 'true');
  };

  const onBeforeChange = (nextStepIndex: number) => {
    const currentStep = allSteps[nextStepIndex];
    if (currentStep && currentStep.path && currentStep.path !== pathname) {
      router.push(currentStep.path);
      setTourEnabled(false);
      setTimeout(() => {
        setInitialStep(nextStepIndex);
        setTourEnabled(true);
      }, 500);
      return false;
    }
    return true;
  };

  return (
    <Steps
      enabled={tourEnabled}
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