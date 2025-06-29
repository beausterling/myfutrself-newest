import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Camera, Upload, X, AlertCircle, RotateCcw } from 'lucide-react';
import Webcam from 'react-webcam';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useCamera } from '../../hooks/useCamera';
import { usePhotoStorage } from '../../hooks/usePhotoStorage';

const CurrentSelf = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { dispatch } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);

  // Use custom hooks for camera and photo storage
  const {
    showCamera,
    cameraError,
    isCapturing,
    showFlash,
    isInitializing,
    startCamera,
    stopCamera,
    capturePhoto,
    retakePhoto,
    webcamRef,
    videoConstraints,
    handleUserMedia,
    handleUserMediaError
  } = useCamera() as ReturnType<typeof useCamera> & {
    handleUserMedia: () => void;
    handleUserMediaError: (error: string | DOMException) => void;
  };

  const {
    photoPreview,
    isLoadingPhoto,
    futurePhotoError,
    imageLoadError,
    isPhotoNewlySet,
    setPhotoPreview,
    loadExistingPhoto,
    savePhotoToDatabase,
    removePhoto,
    initiateFuturePhotoGeneration,
    handleImageError,
    handleImageLoad,
    clearErrors,
    setFuturePhotoError
  } = usePhotoStorage() as ReturnType<typeof usePhotoStorage> & {
    setFuturePhotoError: (error: string | null) => void;
  };

  // Enhanced logging for component initialization
  useEffect(() => {
    console.log('🎬 CurrentSelf component mounted');
    console.log('📋 Initial state:', {
      photoPreview: photoPreview ? 'present' : 'null',
      showCamera,
      cameraError,
      user: user?.id ? 'present' : 'null',
      isPhotoNewlySet
    });
    
    return () => {
      console.log('🎬 CurrentSelf component unmounting');
    };
  }, []);

  // Load existing photo from database on component mount
  useEffect(() => {
    if (user?.id && !photoPreview) {
      loadExistingPhoto();
    }
  }, [user?.id, photoPreview, loadExistingPhoto]);

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCapturePhoto = async () => {
    const capturedPhoto = await capturePhoto();
    if (capturedPhoto) {
      try {
        // First set the base64 preview immediately for instant feedback
        setPhotoPreview(capturedPhoto);
        dispatch({ type: 'SET_PHOTO', payload: capturedPhoto });
        
        // Then save to database
        const uploadResult = await savePhotoToDatabase(capturedPhoto);
        
        if (uploadResult.base64Url) {
          console.log('🔗 Using base64 for preview display');
          // Update with the base64 URL for consistent preview
          setPhotoPreview(uploadResult.base64Url);
          dispatch({ type: 'SET_PHOTO', payload: uploadResult.base64Url });
        }
        
      } catch (error) {
        console.error('❌ Error saving photo:', error);
        // Keep the base64 preview even if upload fails
        console.log('📷 Keeping base64 preview due to upload error');
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📁 Processing uploaded file:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      clearErrors();
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64String = reader.result as string;
        
        // Ensure the uploaded image is converted to PNG format
        if (!base64String.startsWith('data:image/png')) {
          console.log('🔄 Converting uploaded image to PNG format...');
          
          // Create a canvas to convert the image to PNG
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set square dimensions
            canvas.width = 640;
            canvas.height = 640;
            
            if (ctx) {
              // Draw image to canvas with square crop
              const size = Math.min(img.width, img.height);
              const x = (img.width - size) / 2;
              const y = (img.height - size) / 2;
              
              ctx.drawImage(img, x, y, size, size, 0, 0, 640, 640);
              
              // Convert to PNG base64
              const pngBase64 = canvas.toDataURL('image/png');
              console.log('✅ Image converted to PNG format');
              
              try {
                // First set the base64 preview immediately
                setPhotoPreview(pngBase64);
                dispatch({ type: 'SET_PHOTO', payload: pngBase64 });
                
                // Then save to database
                const uploadResult = await savePhotoToDatabase(pngBase64);
                
                if (uploadResult.base64Url) {
                  console.log('🔗 Using base64 for preview display');
                  setPhotoPreview(uploadResult.base64Url);
                  dispatch({ type: 'SET_PHOTO', payload: uploadResult.base64Url });
                }
                
              } catch (error) {
                console.error('❌ Error saving uploaded photo:', error);
                console.log('📷 Keeping base64 preview due to upload error');
              }
            }
          };
          img.src = base64String;
        } else {
          console.log('✅ File is already PNG format');
          
          try {
            // First set the base64 preview immediately
            setPhotoPreview(base64String);
            dispatch({ type: 'SET_PHOTO', payload: base64String });
            
            // Then save to database
            const uploadResult = await savePhotoToDatabase(base64String);
            
            if (uploadResult.base64Url) {
              console.log('🔗 Using base64 for preview display');
              setPhotoPreview(uploadResult.base64Url);
              dispatch({ type: 'SET_PHOTO', payload: uploadResult.base64Url });
            }
            
          } catch (error) {
            console.error('❌ Error saving uploaded photo:', error);
            console.log('📷 Keeping base64 preview due to upload error');
          }
        }
      };
      reader.onerror = () => {
        console.error('❌ Error reading file');
        setFuturePhotoError('Error reading the uploaded file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    await removePhoto();
    dispatch({ type: 'SET_PHOTO', payload: null });
  };

  const handleRetakePhoto = () => {
    handleRemovePhoto();
    retakePhoto();
  };

  const handleNext = async () => {
    if (!photoPreview) {
      console.warn('⚠️ Attempted to continue without photo');
      return;
    }

    console.log('➡️ Proceeding to next step with photo');
    console.log('🔍 Photo format validation:', {
      isBase64: photoPreview.startsWith('data:'),
      isPNG: photoPreview.startsWith('data:image/png'),
      dataLength: photoPreview.length,
      isPhotoNewlySet
    });
    
    // Start background AI processing if this is a newly set photo (non-blocking)
    if (user?.id && photoPreview && isPhotoNewlySet) {
      console.log('🔮 Photo is newly set - starting background future photo generation...');
      // Don't await this - let it run in the background
      initiateFuturePhotoGeneration(photoPreview, user.id).catch(error => {
        console.warn('⚠️ Background AI processing failed (user already proceeded):', error);
      });
    } else if (user?.id && photoPreview && !isPhotoNewlySet) {
      console.log('📂 Photo is existing/loaded from database - skipping AI generation');
    } else {
      console.warn('⚠️ Missing required data for future photo generation:', {
        hasUserId: !!user?.id,
        hasPhotoPreview: !!photoPreview,
        isPhotoNewlySet
      });
    }
    
    // Immediately proceed to next step
    dispatch({ type: 'NEXT_STEP' });
    navigate('/onboarding/pick-category');
  };

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* Flash Effect Overlay */}
      {showFlash && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none" 
             style={{ 
              animation: 'flash 1000ms ease-out',
               animationFillMode: 'forwards'
             }} 
        />
      )}
      
      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-6 font-heading">Capture Your Current Self</h1>
          <p className="text-text-secondary text-lg leading-relaxed font-body">
            Take or upload a photo that represents where you are today. This will help track your transformation journey.
          </p>
        </div>

        <div className="mt-12">
          {/* Camera/Photo Preview Area */}
          <div className="relative w-80 h-80 mx-auto mb-12 overflow-hidden rounded-full border-4 border-primary-aqua bg-bg-secondary shadow-2xl">
            {isLoadingPhoto ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary-aqua border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-text-secondary text-sm font-body">Loading your photo...</span>
                </div>
              </div>
            ) : showCamera ? (
              <div className="w-full h-full relative">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/png"
                  videoConstraints={videoConstraints}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleUserMediaError}
                  className="w-full h-full object-cover"
                  mirrored={true}
                />
                {isInitializing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span className="text-white text-sm font-body">Initializing camera...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : photoPreview ? (
              <div className="w-full h-full relative">
                <img
                  src={photoPreview}
                  alt="Current self preview"
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                />
                
                {/* Show error overlay if image fails to load */}
                {imageLoadError && (
                  <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                    <div className="text-center p-4">
                      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <span className="text-red-400 text-sm font-body">Image failed to load</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={startCamera}
                disabled={isInitializing}
                className="w-full h-full flex flex-col items-center justify-center hover:bg-bg-secondary/80 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInitializing ? (
                  <>
                    <div className="w-8 h-8 border-2 border-primary-aqua border-t-transparent rounded-full animate-spin mb-4" />
                    <span className="text-text-secondary font-medium text-lg font-body">Starting camera...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-20 h-20 text-primary-aqua mb-4 group-hover:scale-110 transition-transform" />
                    <span className="text-text-secondary font-medium text-lg font-body">Start Camera</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Camera Controls */}
          {showCamera && !isInitializing && (
            <div className="flex justify-center gap-6 mb-8">
              <button
                onClick={handleCapturePhoto}
                disabled={isCapturing}
                className="btn btn-primary flex items-center gap-3 text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed font-heading"
              >
                {isCapturing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    Capture Photo
                  </>
                )}
              </button>
              <button
                onClick={stopCamera}
                className="btn btn-outline flex items-center gap-3 text-lg px-8 py-4 font-heading"
              >
                <X className="w-6 h-6" />
                Close Camera
              </button>
            </div>
          )}

          {/* Photo Management Controls */}
          {photoPreview && !showCamera && !isLoadingPhoto && (
            <div className="flex justify-center gap-6 mb-8">
              <button
                onClick={handleRetakePhoto}
                className="btn btn-outline flex items-center gap-3 text-lg px-8 py-4 font-heading"
              >
                <RotateCcw className="w-6 h-6" />
                Retake Photo
              </button>
              <button
                onClick={handleRemovePhoto}
                className="btn btn-outline text-red-400 border-red-400 hover:bg-red-400/10 flex items-center gap-3 text-lg px-8 py-4 font-heading"
              >
                <X className="w-6 h-6" />
                Remove Photo
              </button>
            </div>
          )}

          {/* Image Load Error Display */}
          {imageLoadError && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium font-heading">Image Loading Error</p>
                  <p className="text-red-300 text-sm mt-1 font-body">{imageLoadError}</p>
                  <button
                    onClick={clearErrors}
                    className="text-red-300 text-xs underline mt-2 hover:text-red-200 font-body"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Future Photo Error Display */}
          {futurePhotoError && (
            <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-400 font-medium font-heading">Future Photo Generation</p>
                  <p className="text-yellow-300 text-sm mt-1 font-body">{futurePhotoError}</p>
                  <button
                    onClick={clearErrors}
                    className="text-yellow-300 text-xs underline mt-2 hover:text-yellow-200 font-body"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {cameraError && (
            <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-500 font-medium text-lg font-heading">Camera Error</p>
                <p className="text-red-400 mt-2 font-body">{cameraError}</p>
                <button
                  onClick={() => {/* Camera error clearing is handled in useCamera hook */}}
                  className="text-red-400 underline mt-3 hover:text-red-300 font-body"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-6">
            {/* Show Upload Photo button if no photo is captured and camera is not active */}
            {!showCamera && !photoPreview && !isInitializing && !isLoadingPhoto && (
              <label className="btn btn-primary flex items-center gap-3 text-lg px-8 py-4 cursor-pointer font-heading">
                <Upload className="w-6 h-6" />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
            
            {/* Continue button - only enabled when photo is present */}
            {photoPreview && !isLoadingPhoto && (
              <button
                onClick={handleNext}
                className="btn btn-primary w-full max-w-sm text-lg py-4 font-heading"
              >
                Looking Great! Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentSelf;