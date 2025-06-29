import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';

interface CameraState {
  showCamera: boolean;
  cameraError: string | null;
  isCapturing: boolean;
  showFlash: boolean;
  isInitializing: boolean;
}

interface CameraActions {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<string | null>;
  retakePhoto: () => void;
}

interface UseCameraReturn extends CameraState, CameraActions {
  webcamRef: React.RefObject<Webcam>;
  videoConstraints: {
    width: number;
    height: number;
    facingMode: string;
  };
}

export const useCamera = (): UseCameraReturn => {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);

  // Ensure square dimensions for consistent image capture
  const videoConstraints = {
    width: 640,
    height: 640,
    facingMode: "user"
  };

  const handleUserMedia = useCallback(() => {
    console.log('📷 Camera started successfully');
    setCameraError(null);
    setIsInitializing(false);
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error('❌ Camera error:', error);
    setShowCamera(false);
    setIsInitializing(false);
    
    if (typeof error === 'string') {
      setCameraError(error);
    } else {
      console.error('📷 Camera error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      switch (error.name) {
        case 'NotAllowedError':
          setCameraError('Camera access denied. Please allow camera permissions and try again.');
          break;
        case 'NotFoundError':
          setCameraError('No camera found. Please connect a camera and try again.');
          break;
        case 'NotReadableError':
          setCameraError('Camera is already in use by another application.');
          break;
        case 'OverconstrainedError':
          setCameraError('Camera constraints not supported by your device.');
          break;
        default:
          setCameraError(`Camera error: ${error.message || 'Unknown error'}`);
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    console.log('🚀 Starting camera...');
    console.log('🔍 Checking camera permissions...');
    
    setCameraError(null);
    setIsInitializing(true);
    
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }

      // Check for camera permissions
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('📷 Camera permission status:', permissionStatus.state);
      
      setShowCamera(true);
    } catch (error) {
      console.error('❌ Error starting camera:', error);
      setIsInitializing(false);
      setCameraError(error instanceof Error ? error.message : 'Failed to start camera');
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log('🛑 Stopping camera...');
    setShowCamera(false);
    setCameraError(null);
    setIsInitializing(false);
  }, []);

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    if (!webcamRef.current) {
      console.error('❌ Webcam reference not available');
      setCameraError('Camera not ready. Please try again.');
      return null;
    }

    setIsCapturing(true);
    console.log('📸 Capturing photo...');
    
    // Start flash first
    setShowFlash(true);
    
    return new Promise((resolve) => {
      // Capture photo after flash starts (500ms into the flash)
      setTimeout(() => {
        if (webcamRef.current) {
          // Ensure PNG format for square image capture
          const imageSrc = webcamRef.current.getScreenshot({
            width: 640,
            height: 640,
            format: 'image/png'
          });
          
          if (imageSrc) {
            console.log('✅ Photo captured successfully as PNG');
            console.log('📏 Photo data length:', imageSrc.length);
            console.log('🔍 Image format check:', imageSrc.startsWith('data:image/png') ? 'PNG ✓' : 'Not PNG ❌');
            
            // Hide camera immediately after capture
            setShowCamera(false);
            resolve(imageSrc);
          } else {
            console.error('❌ Failed to capture photo - no image data returned');
            setCameraError('Failed to capture photo. Please try again.');
            resolve(null);
          }
        } else {
          console.error('❌ Webcam reference lost during capture');
          setCameraError('Camera connection lost. Please try again.');
          resolve(null);
        }
      }, 500);
      
      // End flash and capturing state after 1000ms (1 second) to ensure flash is visible during capture
      setTimeout(() => {
        setShowFlash(false);
        setIsCapturing(false);
      }, 1000);
    });
  }, []);

  const retakePhoto = useCallback(() => {
    console.log('🔄 Retaking photo...');
    startCamera();
  }, [startCamera]);

  return {
    // State
    showCamera,
    cameraError,
    isCapturing,
    showFlash,
    isInitializing,
    
    // Actions
    startCamera,
    stopCamera,
    capturePhoto,
    retakePhoto,
    
    // Refs and config
    webcamRef,
    videoConstraints,
    
    // Internal handlers (for Webcam component)
    handleUserMedia,
    handleUserMediaError
  } as UseCameraReturn & {
    handleUserMedia: () => void;
    handleUserMediaError: (error: string | DOMException) => void;
  };
};