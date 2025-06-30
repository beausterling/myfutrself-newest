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
          borderRadius: '1rem',
          // Override border colors globally
          colorNeutral: 'rgba(255, 255, 255, 0.3)',
          colorShimmer: 'rgba(255, 255, 255, 0.3)',
          colorInputBorder: 'rgba(255, 255, 255, 0.3)',
          colorInputBorderFocus: 'rgba(255, 255, 255, 0.5)',
        },
        elements: {
          // Main card styling
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
          
          // Social buttons - comprehensive targeting
          socialButtonsBlockButton: {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.5) !important',
            }
          },
          socialButtonsIconButton: {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.5) !important',
            }
          },
          socialButtonsProviderIcon: {
            color: 'rgb(255, 255, 255)'
          },
          
          // Form buttons
          formButtonPrimary: {
            background: 'linear-gradient(135deg, rgb(36, 210, 211) 0%, rgb(36, 97, 211) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'rgb(255, 255, 255)'
          },
          formButtonSecondary: {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)'
          },
          
          // Input fields - comprehensive targeting
          formFieldInput: {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            color: 'rgb(255, 255, 255)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            '&:focus': {
              borderColor: 'rgba(255, 255, 255, 0.5) !important',
              boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.3)'
            },
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.4) !important'
            }
          },
          formFieldInputShowPasswordButton: {
            color: 'rgba(255, 255, 255, 0.7)',
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          formFieldLabel: {
            color: 'rgba(255, 255, 255, 0.9)'
          },
          
          // Icon buttons and utility buttons - remove borders
          formFieldAction: {
            color: 'rgb(36, 210, 211)',
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          identityPreviewEditButton: {
            color: 'rgb(36, 210, 211)',
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          
          // Comprehensive input targeting with high specificity
          'input': {
            backgroundColor: 'rgba(16, 26, 47, 0.8) !important',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255) !important',
            '&:focus': {
              borderColor: 'rgba(255, 255, 255, 0.5) !important',
              boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.3) !important'
            }
          },
          'input[type="text"]': {
            backgroundColor: 'rgba(16, 26, 47, 0.8) !important',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255) !important'
          },
          'input[type="email"]': {
            backgroundColor: 'rgba(16, 26, 47, 0.8) !important',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255) !important'
          },
          'input[type="password"]': {
            backgroundColor: 'rgba(16, 26, 47, 0.8) !important',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255) !important'
          },
          'input[type="tel"]': {
            backgroundColor: 'rgba(16, 26, 47, 0.8) !important',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255) !important'
          },
          
          // Button targeting
          'button': {
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.5) !important'
            }
          },
          
          // Override for small icon buttons - remove borders
          'button[type="button"]:not([class*="primary"]):not([class*="secondary"])': {
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          
          // Target buttons with specific roles or data attributes that are utility buttons
          'button[aria-label]': {
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          
          // Target small buttons (likely icon buttons)
          'button[style*="width"]': {
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          
          // Clerk-specific selectors
          'input[data-testid]': {
            backgroundColor: 'rgba(16, 26, 47, 0.8) !important',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255) !important'
          },
          'form input': {
            backgroundColor: 'rgba(16, 26, 47, 0.8) !important',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255) !important'
          },
          'form button': {
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important'
          },
          
          // Additional Clerk elements
          phoneInputBox: {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)'
          },
          otpCodeFieldInput: {
            backgroundColor: 'rgba(16, 26, 47, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important',
            color: 'rgb(255, 255, 255)'
          },
          
          // Dividers and separators
          dividerLine: {
            backgroundColor: 'rgba(255, 255, 255, 0.3)'
          },
          dividerText: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          
          // Footer and links
          footerActionLink: {
            color: 'rgb(36, 210, 211)'
          },
          
          // Status messages
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
          
          // Comprehensive targeting using CSS selectors with high specificity
          '[data-localization-key]': {
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important'
          },
          '[role="button"]': {
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important'
          },
          // Target any div that might be styled as a button
          'div[role="button"]': {
            border: '1px solid rgba(255, 255, 255, 0.3) !important',
            borderColor: 'rgba(255, 255, 255, 0.3) !important'
          },
          
          // Target text buttons and links - remove borders
          'button[type="button"]:not([class*="primary"]):not([class*="secondary"]):not([class*="social"])': {
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          
          // Target Clerk-specific text buttons and links
          'button[data-localization-key*="resend"]': {
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          
          // Target any button that contains text like "resend", "forgot", "back", etc.
          'button[class*="link"]': {
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          
          // Target Clerk footer action links and similar elements
          footerActionLink: {
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          
          // Target any element with text-like appearance
          'a': {
            border: 'none !important',
            borderColor: 'transparent !important',
            backgroundColor: 'transparent !important',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
              border: 'none !important',
              borderColor: 'transparent !important'
            }
          },
          
          // Specific targeting for Clerk internal classes that might be text buttons
          '[class*="cl-internal"]': {
            '&:not([class*="primary"]):not([class*="secondary"]):not([class*="social"]):not(input):not(select)': {
              border: 'none !important',
              borderColor: 'transparent !important',
              backgroundColor: 'transparent !important',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
                border: 'none !important',
                borderColor: 'transparent !important'
              }
            }
          }
        },
        // Additional global CSS to ensure coverage
        layout: {
          shimmer: 'rgba(255, 255, 255, 0.3)'
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