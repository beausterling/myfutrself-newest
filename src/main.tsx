import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import App from './App';
import './index.css';

// Get your Clerk publishable key from environment variables
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

if (!publishableKey) {
  console.error('Missing Clerk publishable key');
}

const ClerkProviderWithNavigate = () => {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: 'rgb(36, 210, 211)',
          colorBackground: 'rgb(16, 26, 47)',
          colorInputBackground: 'rgba(255, 255, 255, 0.05)',
          colorInputText: 'rgb(255, 255, 255)',
          colorText: 'rgb(255, 255, 255)',
          colorTextSecondary: 'rgb(163, 201, 249)',
          borderRadius: '1rem'
        },
        elements: {
          card: {
            backgroundColor: 'rgba(16, 26, 47, 0.9)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '1.5rem'
          },
          modalContent: {
            backgroundColor: 'rgba(16, 26, 47, 0.95)',
            backdropFilter: 'blur(16px)',
          },
          modalCloseButton: {
            color: 'rgb(255, 255, 255)'
          },
          headerTitle: {
            color: 'rgb(255, 255, 255)'
          },
          headerSubtitle: {
            color: 'rgb(163, 201, 249)'
          },
          socialButtonsBlockButton: {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'rgb(255, 255, 255)'
          },
          formButtonPrimary: {
            background: 'linear-gradient(135deg, rgb(36, 210, 211) 0%, rgb(36, 97, 211) 100%)',
            color: 'rgb(255, 255, 255)'
          },
          formFieldInput: {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            color: 'rgb(255, 255, 255)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          },
          // Target all input field variations
          formFieldInputShowPasswordButton: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          formFieldLabel: {
            color: 'rgba(255, 255, 255, 0.9)'
          },
          // Additional input field selectors for comprehensive coverage
          'input[type="text"]': {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)'
          },
          'input[type="email"]': {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)'
          },
          'input[type="password"]': {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)'
          },
          'input[type="tel"]': {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)'
          },
          // Target Clerk-specific input classes
          'input[data-testid]': {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)'
          },
          // Target all input elements within forms
          'form input': {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)'
          },
          footerActionLink: {
            color: 'rgb(36, 210, 211)'
          },
          dividerLine: {
            backgroundColor: 'rgba(255, 255, 255, 0.3)'
          },
          dividerText: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          formFieldAction: {
            color: 'rgb(36, 210, 211)'
          },
          identityPreviewEditButton: {
            color: 'rgb(36, 210, 211)'
          },
          formFieldSuccessText: {
            color: 'rgb(34, 197, 94)'
          },
          formFieldErrorText: {
            color: 'rgb(239, 68, 68)'
          },
          alertError: {
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'rgb(239, 68, 68)'
          },
          phoneInputBox: {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'rgb(255, 255, 255)'
          },
          otpCodeFieldInput: {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'rgb(255, 255, 255)'
          }
        }
      }}
      navigate={(to) => navigate(to)}
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <App />
    </ClerkProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkProviderWithNavigate />
    </BrowserRouter>
  </StrictMode>
);