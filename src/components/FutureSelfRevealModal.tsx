import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, User, Sparkles, Loader2 } from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FutureSelfRevealModalProps {
  futurePhotoUrl: string; // This now contains base64 data
  onClose: () => void;
  onContinue: () => void;
}

// Helper function to convert base64 string to Blob
function base64ToBlob(base64Data: string): Blob {
  // Extract the base64 part and MIME type
  const [header, data] = base64Data.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
  
  // Convert base64 to binary
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: mimeType });
}

const FutureSelfRevealModal = ({ futurePhotoUrl, onClose, onContinue }: FutureSelfRevealModalProps) => {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isSettingProfilePicture, setIsSettingProfilePicture] = useState(false);
  const [profilePictureStatus, setProfilePictureStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Start the reveal animation once image is loaded
  useEffect(() => {
    if (imageLoaded) {
      const timer = setTimeout(() => {
        const interval = setInterval(() => {
          setRevealProgress(prev => {
            const next = prev + 2;
            if (next >= 100) {
              clearInterval(interval);
              // Trigger particles when fully revealed
              setTimeout(() => setShowParticles(true), 200);
              return 100;
            }
            return next;
          });
        }, 50);
        return () => clearInterval(interval);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [imageLoaded]);

  // Particle system
  useEffect(() => {
    if (showParticles) {
      console.log('🎉 Starting celebratory particle effect');
      
      // Create initial particles
      const initialParticles: Particle[] = [];
      for (let i = 0; i < 50; i++) {
        initialParticles.push(createParticle(i));
      }
      setParticles(initialParticles);

      // Animate particles
      const animateParticles = () => {
        setParticles(prevParticles => 
          prevParticles
            .map(particle => ({
              ...particle,
              x: particle.x + particle.vx,
              y: particle.y + particle.vy,
              vy: particle.vy + 0.2, // gravity
              life: particle.life - 1,
              size: particle.size * 0.98 // shrink over time
            }))
            .filter(particle => particle.life > 0)
        );
      };

      const particleInterval = setInterval(animateParticles, 16);
      
      // Stop particles after 3 seconds
      const stopTimer = setTimeout(() => {
        setShowParticles(false);
        clearInterval(particleInterval);
      }, 3000);

      return () => {
        clearInterval(particleInterval);
        clearTimeout(stopTimer);
      };
    }
  }, [showParticles]);

  const createParticle = (id: number): Particle => {
    const colors = ['#3B82F6', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'];
    return {
      id,
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 200,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 2,
      life: 180,
      maxLife: 180,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  };

  const handleSetProfilePicture = async () => {
    if (!user || !futurePhotoUrl) {
      console.error('❌ No user or future photo data available');
      return;
    }

    try {
      setIsSettingProfilePicture(true);
      setProfilePictureStatus('idle');
      console.log('🔄 Setting Clerk profile picture from future photo base64 data');

      let blob: Blob;

      // Check if futurePhotoUrl is base64 data or a URL
      if (futurePhotoUrl.startsWith('data:')) {
        console.log('✅ Converting base64 data to blob for profile picture');
        blob = base64ToBlob(futurePhotoUrl);
      } else {
        // Fallback for URL-based images (backward compatibility)
        console.log('🔄 Fetching image from URL for profile picture');
        const response = await fetch(futurePhotoUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        blob = await response.blob();
      }

      console.log('✅ Image blob prepared successfully, size:', blob.size);

      // Set as Clerk profile picture
      await user.setProfileImage({ file: blob });
      console.log('✅ Clerk profile picture updated successfully');
      
      setProfilePictureStatus('success');
      
      // Open Clerk user profile for visual confirmation
      console.log('🔄 Opening Clerk user profile for confirmation');
      setTimeout(() => {
        openUserProfile();
      }, 500);

    } catch (error) {
      console.error('❌ Error setting profile picture:', error);
      setProfilePictureStatus('error');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setProfilePictureStatus('idle');
      }, 3000);
    } finally {
      setIsSettingProfilePicture(false);
    }
  };

  const pixelationAmount = Math.max(0, 20 - (revealProgress * 0.2));
  const blurAmount = Math.max(0, 10 - (revealProgress * 0.1));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 max-h-screen overflow-y-auto"
        style={{
          background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, rgba(0, 0, 0, 0.95) 70%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        {/* Particles */}
        {showParticles && (
          <div className="fixed inset-0 pointer-events-none">
            {particles.map(particle => (
              <div
                key={particle.id}
                className="absolute rounded-full"
                style={{
                  left: particle.x,
                  top: particle.y,
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  opacity: particle.life / particle.maxLife,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
          </div>
        )}

        {/* Main content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative max-w-2xl mx-auto p-4 sm:p-8 text-center w-full"
        >
          {/* Title */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-6 sm:mb-8"
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary-aqua" />
              <h1 className="text-3xl sm:text-4xl font-bold font-heading gradient-text">
                Meet Your FutrSelf
              </h1>
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary-aqua" />
            </div>
            <p className="text-white/80 text-base sm:text-lg font-body">
              Here's a glimpse of who you're becoming...
            </p>
          </motion.div>

          {/* Image container */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="relative mb-6 sm:mb-8"
          >
            <div className="relative max-w-[250px] sm:max-w-[320px] aspect-square mx-auto rounded-full overflow-hidden border-4 border-primary-aqua shadow-2xl">
              {/* Loading state */}
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary">
                  <div className="text-center">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-primary-aqua border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-white/60 text-xs sm:text-sm font-body">Revealing your future...</span>
                  </div>
                </div>
              )}

              {/* Future self image */}
              <img
                src={futurePhotoUrl}
                alt="Your future self"
                className="w-full h-full object-cover transition-all duration-100"
                style={{
                  filter: `blur(${blurAmount}px)`,
                  imageRendering: pixelationAmount > 5 ? 'pixelated' : 'auto',
                  transform: `scale(${1 + pixelationAmount * 0.01})`,
                }}
                onLoad={() => {
                  console.log('✅ Future self image loaded successfully');
                  setImageLoaded(true);
                }}
                onError={(e) => {
                  console.error('❌ Error loading future self image:', e);
                }}
              />

              {/* Reveal overlay */}
              {revealProgress < 100 && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{
                    transform: `translateX(${revealProgress * 4 - 100}%)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                />
              )}
            </div>

          </motion.div>

          {/* Action buttons */}
          {revealProgress >= 100 && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="space-y-3 sm:space-y-4"
            >
              {/* Set as profile picture button */}
              <button
                onClick={handleSetProfilePicture}
                disabled={isSettingProfilePicture}
                className={`btn w-full max-w-sm mx-auto flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg py-3 sm:py-4 font-heading transition-all duration-300 ${
                  profilePictureStatus === 'success'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : profilePictureStatus === 'error'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'btn-outline'
                }`}
              >
                {isSettingProfilePicture ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    Setting Profile Picture...
                  </>
                ) : profilePictureStatus === 'success' ? (
                  <>
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    Profile Picture Set!
                  </>
                ) : profilePictureStatus === 'error' ? (
                  <>
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    Failed to Set Picture
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    Set As Profile Picture
                  </>
                )}
              </button>

              {/* Continue button */}
              <button
                onClick={onContinue}
                className="btn btn-primary w-full max-w-sm mx-auto text-base sm:text-lg py-3 sm:py-4 font-heading"
              >
                Continue Your Journey
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FutureSelfRevealModal;