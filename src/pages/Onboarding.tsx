import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { OnboardingProvider, useOnboarding } from '../contexts/OnboardingContext';

import CurrentSelf from './onboarding/CurrentSelf';
import PickCategory from './onboarding/PickCategory';
import UserGoals from './onboarding/UserGoals';
import UserMotivation from './onboarding/UserMotivation';
import UserObstacles from './onboarding/UserObstacles';
import UserCommitments from './onboarding/UserCommitments';
import CallPrefs from './onboarding/CallPrefs';
import ChooseVoice from './onboarding/ChooseVoice';
import TwilioSetup from './onboarding/TwilioSetup';
import Consent from './onboarding/Consent';

const routeToStepMap: Record<string, number> = {
  '/onboarding/current-self': 1,
  '/onboarding/pick-category': 2,
  '/onboarding/user-goals': 3,
  '/onboarding/user-motivation': 4,
  '/onboarding/user-obstacles': 5,
  '/onboarding/user-commitments': 6,
  '/onboarding/call-prefs': 7,
  '/onboarding/choose-voice': 8,
  '/onboarding/twilio-setup': 9,
  '/onboarding/consent': 10
};

const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="fixed top-0 left-0 w-full z-50">
      <div className="bg-gradient-to-b from-bg-primary via-bg-primary to-transparent">
        <div className="flex justify-center pt-10 pb-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-full px-6 py-3 border border-white/20 shadow-2xl">
            <div className="flex items-center space-x-6">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img 
                  src="/icon_nobackground_small copy.png" 
                  alt="MyFutrSelf" 
                  className="w-6 h-6 rounded-md"
                />
                <span className="text-xl font-bold gradient-text font-heading">MyFutrSelf</span>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="max-w-md mx-auto">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-aqua to-primary-blue transition-all duration-500 ease-out rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-white/60 font-body">
              <span>Progress</span>
              <span>Step {Math.max(1, Math.min(totalSteps, currentStep))}/{totalSteps}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Onboarding = () => {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
};

const OnboardingContent = () => {
  const { state, dispatch } = useOnboarding();
  const location = useLocation();
  
  useEffect(() => {
    const currentStep = routeToStepMap[location.pathname];
    console.log('🔄 Route changed to:', location.pathname, 'Step:', currentStep);
    
    if (currentStep && currentStep !== state.currentStep) {
      console.log('📊 Updating step from', state.currentStep, 'to', currentStep);
      dispatch({ type: 'SET_STEP', payload: currentStep });
    }
  }, [location.pathname, dispatch]);
  
  const currentStep = routeToStepMap[location.pathname] || state.currentStep || 1;
  
  console.log('🎯 Current step for progress bar:', currentStep, 'Route:', location.pathname);
  
  return (
    <>
      <ProgressBar currentStep={currentStep} totalSteps={10} />
      <Routes>
        <Route index element={<Navigate to="current-self" replace />} />
        <Route path="current-self" element={<CurrentSelf />} />
        <Route path="pick-category" element={<PickCategory />} />
        <Route path="user-goals" element={<UserGoals />} />
        <Route path="user-motivation" element={<UserMotivation />} />
        <Route path="user-obstacles" element={<UserObstacles />} />
        <Route path="user-commitments" element={<UserCommitments />} />
        <Route path="call-prefs" element={<CallPrefs />} />
        <Route path="choose-voice" element={<ChooseVoice />} />
        <Route path="twilio-setup" element={<TwilioSetup />} />
        <Route path="consent" element={<Consent />} />
      </Routes>
    </>
  );
};

export default Onboarding;