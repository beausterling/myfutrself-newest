import { createContext, useContext, useReducer, ReactNode } from 'react';

interface OnboardingState {
  currentStep: number;
  photo: string | null;
  voicePreference: string | null;
  callPreferences: {
    preferredTimeStart: string;
    preferredTimeEnd: string;
  };
  categories: string[];
  goals: {
    chickens: string[];
    health: string[];
    career: string[];
    relationships: string[];
    personal: string[];
    financial: string[];
    education: string[];
    hobbies: string[];
    travel: string[];
    spirituality: string[];
    community: string[];
    environment: string[];
    [key: string]: string[];
  };
  motivations: {
    chickens: string;
    health: string;
    career: string;
    relationships: string;
    personal: string;
    financial: string;
    education: string;
    hobbies: string;
    travel: string;
    spirituality: string;
    community: string;
    environment: string;
    [key: string]: string;
  };
  obstacles: {
    chickens: string[];
    health: string[];
    career: string[];
    relationships: string[];
    personal: string[];
    financial: string[];
    education: string[];
    hobbies: string[];
    travel: string[];
    spirituality: string[];
    community: string[];
    environment: string[];
    [key: string]: string[];
  };
  commitments: {
    chickens: string;
    health: string;
    career: string;
    relationships: string;
    personal: string;
    financial: string;
    education: string;
    hobbies: string;
    travel: string;
    spirituality: string;
    community: string;
    environment: string;
    [key: string]: string;
  };
}

type OnboardingAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_PHOTO'; payload: string | null }
  | { type: 'SET_VOICE'; payload: string | null }
  | { type: 'SET_CALL_PREFERENCES'; payload: { preferredTimeStart?: string; preferredTimeEnd?: string } }
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'SET_GOALS'; payload: { [key: string]: string[] } }
  | { type: 'SET_MOTIVATIONS'; payload: { [key: string]: string } }
  | { type: 'SET_OBSTACLES'; payload: { [key: string]: string[] } }
  | { type: 'SET_COMMITMENTS'; payload: { [key: string]: string } };

const initialState: OnboardingState = {
  currentStep: 1,
  photo: null,
  voicePreference: null,
  callPreferences: {
    preferredTimeStart: '',
    preferredTimeEnd: ''
  },
  categories: [],
  goals: {
    chickens: [],
    health: [],
    career: [],
    relationships: [],
    personal: [],
    financial: [],
    education: [],
    hobbies: [],
    travel: [],
    spirituality: [],
    community: [],
    environment: []
  },
  motivations: {
    chickens: '',
    health: '',
    career: '',
    relationships: '',
    personal: '',
    financial: '',
    education: '',
    hobbies: '',
    travel: '',
    spirituality: '',
    community: '',
    environment: ''
  },
  obstacles: {
    chickens: [],
    health: [],
    career: [],
    relationships: [],
    personal: [],
    financial: [],
    education: [],
    hobbies: [],
    travel: [],
    spirituality: [],
    community: [],
    environment: []
  },
  commitments: {
    chickens: '',
    health: '',
    career: '',
    relationships: '',
    personal: '',
    financial: '',
    education: '',
    hobbies: '',
    travel: '',
    spirituality: '',
    community: '',
    environment: ''
  }
};

const OnboardingContext = createContext<{
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
} | null>(null);

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  console.log('🔄 Onboarding action:', action.type, action.type === 'SET_STEP' ? `Step: ${action.payload}` : '');
  
  switch (action.type) {
    case 'SET_STEP':
      console.log('📊 Setting step to:', action.payload);
      return { ...state, currentStep: action.payload };
    case 'NEXT_STEP':
      const nextStep = state.currentStep + 1;
      console.log('➡️ Moving to next step:', nextStep);
      return { ...state, currentStep: nextStep };
    case 'PREV_STEP':
      const prevStep = Math.max(1, state.currentStep - 1);
      console.log('⬅️ Moving to previous step:', prevStep);
      return { ...state, currentStep: prevStep };
    case 'SET_PHOTO':
      console.log('📸 Setting photo:', action.payload);
      return { ...state, photo: action.payload };
    case 'SET_VOICE':
      console.log('🎤 Setting voice preference:', action.payload);
      return { ...state, voicePreference: action.payload };
    case 'SET_CALL_PREFERENCES':
      console.log('📞 Setting call preferences:', action.payload);
      return { 
        ...state, 
        callPreferences: { 
          ...state.callPreferences, 
          ...action.payload 
        } 
      };
    case 'SET_CATEGORIES':
      console.log('📂 Setting categories:', action.payload);
      return { ...state, categories: action.payload };
    case 'SET_GOALS':
      console.log('🎯 Setting goals:', action.payload);
      return { ...state, goals: action.payload };
    case 'SET_MOTIVATIONS':
      console.log('💪 Setting motivations:', action.payload);
      return { ...state, motivations: { ...state.motivations, ...action.payload } };
    case 'SET_OBSTACLES':
      console.log('🚧 Setting obstacles:', action.payload);
      return { ...state, obstacles: { ...state.obstacles, ...action.payload } };
    case 'SET_COMMITMENTS':
      console.log('🤝 Setting commitments:', action.payload);
      return { ...state, commitments: { ...state.commitments, ...action.payload } };
    default:
      console.warn('⚠️ Unknown action type:', (action as any).type);
      return state;
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}