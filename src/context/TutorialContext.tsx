import React, { createContext, useContext, useState, useEffect } from 'react';

export type TutorialStep = {
  id: string;
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  route: string;
};

interface TutorialContextType {
  isActive: boolean;
  currentStepIndex: number;
  steps: TutorialStep[];
  startTutorial: () => void;
  stopTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    targetId: 'tutorial-welcome',
    title: 'Welcome to Apna Cricket!',
    content: 'Let\'s take a quick tour to help you get started with managing your cricket matches and tournaments.',
    position: 'center',
    route: '/'
  },
  {
    id: 'tournaments-nav',
    targetId: 'nav-tournaments',
    title: 'Manage Tournaments',
    content: 'Click here to view your tournaments or create a new one.',
    position: 'bottom',
    route: '/'
  },
  {
    id: 'create-tournament',
    targetId: 'btn-create-tournament',
    title: 'Create Your First Tournament',
    content: 'Start by creating a tournament. You can define overs, ball types, and more.',
    position: 'bottom',
    route: '/tournaments'
  },
  {
    id: 'tournament-setup',
    targetId: 'tournament-setup-form',
    title: 'Tournament Details',
    content: 'Fill in the tournament name, location, and match settings here.',
    position: 'top',
    route: '/tournaments/new'
  },
  {
    id: 'add-teams',
    targetId: 'btn-add-team',
    title: 'Add Teams',
    content: 'Once a tournament is created, add teams to it to start scheduling matches.',
    position: 'bottom',
    route: '/tournament/' // Dynamic route handled by logic
  },
  {
    id: 'scoring-match',
    targetId: 'scoring-controls',
    title: 'Live Scoring',
    content: 'This is where the magic happens! Use these buttons to record runs, wickets, and extras in real-time.',
    position: 'top',
    route: '/admin/match/' // Dynamic route handled by logic
  }
];

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      // We don't auto-start, but we could
    }
  }, []);

  const startTutorial = () => {
    setIsActive(true);
    setCurrentStepIndex(0);
  };

  const stopTutorial = () => {
    setIsActive(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const nextStep = () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      stopTutorial();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const goToStep = (index: number) => {
    if (index >= 0 && index < TUTORIAL_STEPS.length) {
      setCurrentStepIndex(index);
    }
  };

  return (
    <TutorialContext.Provider value={{
      isActive,
      currentStepIndex,
      steps: TUTORIAL_STEPS,
      startTutorial,
      stopTutorial,
      nextStep,
      prevStep,
      goToStep
    }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
