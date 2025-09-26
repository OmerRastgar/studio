'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { Steps } from 'intro.js-react';
import { useRouter, usePathname } from 'next/navigation';
import { steps as allSteps } from '@/lib/guide-steps';

const GuideContext = createContext<{
  setTourEnabled: (enabled: boolean) => void;
}>({
  setTourEnabled: () => {},
});

export const useGuide = () => useContext(GuideContext);

export function Guide() {
  const [tourEnabled, setTourEnabled] = useState(false);
  const [initialStep, setInitialStep] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if the tour has been completed before
    const tourCompleted = localStorage.getItem('tourCompleted');
    if (tourCompleted !== 'true') {
      // Start the tour automatically for new users after a delay
      const timer = setTimeout(() => {
        setTourEnabled(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const onExit = () => {
    setTourEnabled(false);
    localStorage.setItem('tourCompleted', 'true');
  };

  const onBeforeChange = (nextStepIndex: number) => {
    const currentStep = allSteps[nextStepIndex];
    if (currentStep && currentStep.path && currentStep.path !== pathname) {
      router.push(currentStep.path);
      // We need to delay the tour to allow the page to render
      // This is a common pattern with intro.js and Next.js
      setTourEnabled(false);
      setTimeout(() => {
        setInitialStep(nextStepIndex);
        setTourEnabled(true);
      }, 500); // Adjust delay as needed for page load
      return false; // Prevent intro.js from proceeding immediately
    }
    return true;
  };
  
  return (
    <GuideContext.Provider value={{ setTourEnabled }}>
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
    </GuideContext.Provider>
  );
}
