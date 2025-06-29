import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { Clock, Zap, ChevronDown, AlertCircle, Phone, MessageSquare, Mail, PhoneIncoming, MessageCircle, Vibrate, Video } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';

const CallPrefs = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { state, dispatch } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [aiTriggersEnabled, setAiTriggersEnabled] = useState(false);
  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Separate time windows for calls and emails
  const [callTimeWindow, setCallTimeWindow] = useState({ start: '', end: '' });
  const [smsTimeWindow, setSmsTimeWindow] = useState({ start: '', end: '' });
  const [selectedContactMethods, setSelectedContactMethods] = useState<string[]>([]);
  const [videoCallInterest, setVideoCallInterest] = useState(false);
  const [is24HourAvailable, setIs24HourAvailable] = useState(false);
  const [isSms24HourAvailable, setIsSms24HourAvailable] = useState(false);

  // Generate time options in 15-minute increments
  const generateTimeOptions = (startAfter?: string) => {
    const options = [];
    let startHour = 0;
    let startMinute = 0;
    
    // If startAfter is provided, start from the next 15-minute increment
    if (startAfter) {
      const [hour, minute] = startAfter.split(':').map(Number);
      startMinute = minute + 15;
      startHour = hour;
      
      if (startMinute >= 60) {
        startHour = (hour + 1) % 24;
        startMinute = 0;
      }
    }
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // Skip times before the startAfter time
        if (startAfter && (hour < startHour || (hour === startHour && minute < startMinute))) {
          continue;
        }
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = formatDisplayTime(timeString);
        options.push({ value: timeString, label: displayTime });
      }
    }
    
    // Add 12:00 AM (next day) as the final option for end times only
    // This allows users to be available for a full 24-hour period
    if (startAfter) {
      options.push({ value: '23:59', label: '11:59 PM' });
    }
    
    return options;
  };

  const formatDisplayTime = (timeString: string) => {
    const [hour, minute] = timeString.split(':');
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${period}`;
  };

  // Generate start time options (all times)
  const startTimeOptions = generateTimeOptions();
  
  // Generate end time options for calls and emails separately
  const callEndTimeOptions = generateTimeOptions(callTimeWindow.start);
  const smsEndTimeOptions = generateTimeOptions(smsTimeWindow.start);

  // Load existing preferences or set defaults
  useEffect(() => {
    const loadCallPreferences = async () => {
      if (!user?.id || hasLoadedDefaults) {
        return;
      }

      try {
        console.log('🔄 Loading call preferences for user:', user.id);
        
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.error('❌ No Clerk token available');
          return;
        }

        const supabase = createAuthenticatedSupabaseClient(token);
        
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('preferred_time_start, preferred_time_end, contact_prefs, ai_triggered_enabled, email_notifications_enabled, sms_notifications_enabled, preferred_sms_time_start, preferred_sms_time_end, video_call_interest, phone_24_hour_availability, sms_24_hour_availability')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error loading call preferences:', error);
          setError(`Failed to load existing preferences: ${error.message}`);
          return;
        }

        if (userProfile) {
          console.log('✅ Loaded existing preferences:', {
            start: userProfile.preferred_time_start,
            end: userProfile.preferred_time_end,
            contactPrefs: userProfile.contact_prefs,
            aiTriggered: userProfile.ai_triggered_enabled,
            emailEnabled: userProfile.email_notifications_enabled,
            smsEnabled: userProfile.sms_notifications_enabled,
            videoInterest: userProfile.video_call_interest,
            smsStart: userProfile.preferred_sms_time_start,
            smsEnd: userProfile.preferred_sms_time_end,
            phone24Hour: userProfile.phone_24_hour_availability,
            sms24Hour: userProfile.sms_24_hour_availability
          });
          
          // Set AI triggers based on ai_triggered_enabled
          setAiTriggersEnabled(userProfile.ai_triggered_enabled || false);
          
          // Set video call interest
          setVideoCallInterest(userProfile.video_call_interest || false);
          
          // Set contact methods based on contact_prefs
          setSelectedContactMethods(userProfile.contact_prefs || []);
          
          // Set phone 24-hour availability and time window
          if (userProfile.phone_24_hour_availability) {
            console.log('📞 Setting 24-hour call availability to true');
            setIs24HourAvailable(true);
            setCallTimeWindow({ start: '', end: '' });
          } else if (userProfile.preferred_time_start && userProfile.preferred_time_end) {
            console.log('📞 Setting specific call time window:', {
              start: userProfile.preferred_time_start,
              end: userProfile.preferred_time_end
            });
            setIs24HourAvailable(false);
            setCallTimeWindow({
              start: userProfile.preferred_time_start,
              end: userProfile.preferred_time_end
            });
          } else {
            setIs24HourAvailable(false);
            setCallTimeWindow({ start: '', end: '' });
          }
          
          // Set SMS 24-hour availability and time window
          if (userProfile.sms_24_hour_availability) {
            console.log('📱 Setting 24-hour SMS availability to true');
            setIsSms24HourAvailable(true);
            setSmsTimeWindow({ start: '', end: '' });
          } else if (userProfile.preferred_sms_time_start && userProfile.preferred_sms_time_end) {
            console.log('📱 Setting specific SMS time window:', {
              start: userProfile.preferred_sms_time_start,
              end: userProfile.preferred_sms_time_end
            });
            setIsSms24HourAvailable(false);
            setSmsTimeWindow({
              start: userProfile.preferred_sms_time_start,
              end: userProfile.preferred_sms_time_end
            });
          } else {
            setIsSms24HourAvailable(false);
            setSmsTimeWindow({ start: '', end: '' });
          }
          
          dispatch({
            type: 'SET_CALL_PREFERENCES',
            payload: {
              preferredTimeStart: userProfile.preferred_time_start,
              preferredTimeEnd: userProfile.preferred_time_end
            }
          });
        } else {
          // Initialize with empty time windows - let user choose any time
          console.log('🎯 Initializing with empty time windows');
          
          setIs24HourAvailable(false);
          setIsSms24HourAvailable(false);
          setCallTimeWindow({ start: '', end: '' });
          setSmsTimeWindow({ start: '', end: '' });
        }
        
        setHasLoadedDefaults(true);
      } catch (error) {
        console.error('❌ Error loading call preferences:', error);
        setError('Failed to load call preferences. Please refresh and try again.');
        setHasLoadedDefaults(true);
      }
    };

    loadCallPreferences();
  }, [user?.id, getToken, hasLoadedDefaults, dispatch]);

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCallTimeChange = (field: 'start' | 'end', value: string) => {
    console.log('🕐 Call time changed:', field, value);
    
    const newTimeWindow = {
      ...callTimeWindow,
      [field]: value
    };
    
    // If changing start time and it's after the current end time, clear end time
    if (field === 'start' && newTimeWindow.end) {
      const startTime = new Date(`2000-01-01T${value}`);
      const endTime = new Date(`2000-01-01T${newTimeWindow.end}`);
      
      if (startTime >= endTime) {
        console.log('🔄 Call start time is after end time, clearing end time');
        newTimeWindow.end = '';
      }
    }
    
    setCallTimeWindow(newTimeWindow);
  };

  const handleSmsTimeChange = (field: 'start' | 'end', value: string) => {
    console.log('📱 SMS time changed:', field, value);
    
    const newTimeWindow = {
      ...smsTimeWindow,
      [field]: value
    };
    
    // If changing start time and it's after the current end time, clear end time
    if (field === 'start' && newTimeWindow.end) {
      const startTime = new Date(`2000-01-01T${value}`);
      const endTime = new Date(`2000-01-01T${newTimeWindow.end}`);
      
      if (startTime >= endTime) {
        console.log('🔄 SMS start time is after end time, clearing end time');
        newTimeWindow.end = '';
      }
    }
    
    setSmsTimeWindow(newTimeWindow);
  };

  const handle24HourToggle = () => {
    const newValue = !is24HourAvailable;
    setIs24HourAvailable(newValue);
    
    if (newValue) {
      // Clear time windows when 24-hour is enabled
      setCallTimeWindow({ start: '', end: '' });
    }
  };

  const handleSms24HourToggle = () => {
    const newValue = !isSms24HourAvailable;
    setIsSms24HourAvailable(newValue);
    
    if (newValue) {
      // Clear time windows when 24-hour is enabled
      setSmsTimeWindow({ start: '', end: '' });
    }
  };

  const saveCallPreferences = async () => {
    if (!user?.id) {
      throw new Error('User authentication failed. Please try signing in again.');
    }

    try {
      setIsSaving(true);
      setError(null);
      console.log('💾 Saving call preferences to database...');
      console.log('📊 Call preferences to save:', {
        callTimeWindow,
        aiTriggersEnabled,
        callMode: aiTriggersEnabled ? 'ai_triggered' : 'scheduled',
        selectedContactMethods
      });
      
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      
      // Prepare update data based on selected contact methods
      const updateData: any = {
        contact_prefs: selectedContactMethods,
        ai_triggered_enabled: aiTriggersEnabled,
        video_call_interest: videoCallInterest,
        phone_24_hour_availability: is24HourAvailable,
        sms_24_hour_availability: isSms24HourAvailable,
        updated_at: new Date().toISOString()
      };
      
      // Add phone call preferences if selected
      if (selectedContactMethods.includes('phone')) {
        if (is24HourAvailable) {
          updateData.preferred_time_start = '00:00';
          updateData.preferred_time_end = '23:59';
        } else {
          updateData.preferred_time_start = callTimeWindow.start;
          updateData.preferred_time_end = callTimeWindow.end;
        }
      } else {
        updateData.preferred_time_start = null;
        updateData.preferred_time_end = null;
      }
      
      // Add SMS preferences if selected
      if (selectedContactMethods.includes('sms')) {
        updateData.sms_notifications_enabled = true;
        if (isSms24HourAvailable) {
          updateData.preferred_sms_time_start = '00:00';
          updateData.preferred_sms_time_end = '23:59';
        } else {
          updateData.preferred_sms_time_start = smsTimeWindow.start;
          updateData.preferred_sms_time_end = smsTimeWindow.end;
        }
      } else {
        updateData.sms_notifications_enabled = false;
        updateData.preferred_sms_time_start = null;
        updateData.preferred_sms_time_end = null;
      }
      
      // Add email preferences if selected
      updateData.email_notifications_enabled = selectedContactMethods.includes('email');
      
      // Check if user profile exists, create if it doesn't
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking user profile:', checkError);
        throw new Error(`Failed to check user profile: ${checkError.message}`);
      }

      if (!existingProfile) {
        // User profile should have been created during Clerk authentication
        // If it doesn't exist, there's an issue with the initial setup
        console.error('❌ User profile not found during update - this should not happen');
        console.error('📊 User ID:', user.id);
        setError('Your profile was not found. Please sign in again to complete setup.');
        
        // Sign out the user to force re-authentication
        setTimeout(() => {
          console.log('🔄 Signing out user due to missing profile');
          signOut();
        }, 3000); // Give user time to read the error message
        
        throw new Error('User profile not found - signed out for re-authentication');
      } else {
        // Update existing user profile
        console.log('📝 Updating existing user profile...');
        const { data: updatedData, error: updateError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', user.id)
          .select();

        if (updateError) {
          console.error('❌ Error updating user profile:', updateError);
          throw new Error(`Failed to update user profile: ${updateError.message}`);
        }

        // Check if any rows were actually updated
        if (!updatedData || updatedData.length === 0) {
          console.error('❌ No user profile was updated - profile may have been deleted');
          console.error('📊 User ID:', user.id);
          setError('Your profile could not be updated. Please sign in again to complete setup.');
          
          // Sign out the user to force re-authentication
          setTimeout(() => {
            console.log('🔄 Signing out user due to failed profile update');
            signOut();
          }, 3000); // Give user time to read the error message
          
          throw new Error('User profile update failed - signed out for re-authentication');
        }

        console.log('✅ User profile updated successfully');
      }
      
      console.log('✅ Call preferences saved successfully');
    } catch (error) {
      console.error('❌ Error saving call preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to save call preferences');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiTriggersChange = (enabled: boolean) => {
    console.log('🤖 AI triggers changed:', enabled);
    setAiTriggersEnabled(enabled);
  };

  const handleNext = () => {
    // Save preferences before proceeding
    saveCallPreferences().then(() => {
      // Validate that time windows are set for selected contact methods
      if (selectedContactMethods.includes('phone') && !is24HourAvailable && (!callTimeWindow.start || !callTimeWindow.end)) {
        setError('Please set both start and end times for phone calls.');
        return;
      }

      if (selectedContactMethods.includes('sms') && !isSms24HourAvailable && (!smsTimeWindow.start || !smsTimeWindow.end)) {
        setError('Please set both start and end times for SMS messages.');
        return;
      }

      // Validate that start times are before end times
      if (selectedContactMethods.includes('phone') && !is24HourAvailable) {
        const callStartTime = new Date(`2000-01-01T${callTimeWindow.start}`);
        const callEndTime = new Date(`2000-01-01T${callTimeWindow.end}`);
        
        if (callStartTime >= callEndTime) {
          setError('Call start time must be before end time.');
          return;
        }
      }

      if (selectedContactMethods.includes('sms') && !isSms24HourAvailable) {
        const smsStartTime = new Date(`2000-01-01T${smsTimeWindow.start}`);
        const smsEndTime = new Date(`2000-01-01T${smsTimeWindow.end}`);
        
        if (smsStartTime >= smsEndTime) {
          setError('SMS start time must be before end time.');
          return;
        }
      }

      dispatch({ type: 'NEXT_STEP' });
      navigate('/onboarding/choose-voice');
    }).catch((error) => {
      console.error('❌ Error saving preferences before proceeding:', error);
      setError('Failed to save preferences. Please try again.');
    });
  };

  const handleBack = () => {
    // Validate that time windows are set for selected contact methods
    dispatch({ type: 'PREV_STEP' });
    navigate('/onboarding/user-commitments');
  };

  const isValidCallTimeWindow = () => {
    if (is24HourAvailable) {
      return true; // 24-hour availability is always valid
    }
    
    if (!callTimeWindow.start || !callTimeWindow.end) {
      return false;
    }

    const startTime = new Date(`2000-01-01T${callTimeWindow.start}`);
    const endTime = new Date(`2000-01-01T${callTimeWindow.end}`);
    
    return startTime < endTime;
  };

  const isValidSmsTimeWindow = () => {
    if (isSms24HourAvailable) {
      return true; // 24-hour availability is always valid
    }
    
    if (!smsTimeWindow.start || !smsTimeWindow.end) {
      return false;
    }

    const startTime = new Date(`2000-01-01T${smsTimeWindow.start}`);
    const endTime = new Date(`2000-01-01T${smsTimeWindow.end}`);
    
    return startTime < endTime;
  };

  const handleContactMethodToggle = (method: string) => {
    // Handle video call special case
    if (method === 'video') {
      setVideoCallInterest(!videoCallInterest);
      return;
    }
    
    // Handle regular contact methods
    setSelectedContactMethods(prev => {
      if (prev.includes(method)) {
        return prev.filter(m => m !== method);
      } else {
        return [...prev, method];
      }
    });
  };

  const isContactMethodSelected = (method: string) => {
    if (method === 'video') {
      return videoCallInterest;
    }
    return selectedContactMethods.includes(method);
  };

  const isValidTimeWindows = () => {
    // Check if at least one contact method is selected
    // Note: video call and email don't count as real contact methods for validation (no time windows needed)
    const realContactMethods = selectedContactMethods.filter(method => method !== 'video' && method !== 'email');
    if (realContactMethods.length === 0) {
      return false;
    }
    
    // Check if phone call time window is valid when phone is selected
    if (selectedContactMethods.includes('phone') && !isValidCallTimeWindow()) {
      return false;
    }
    
    // Check if SMS time window is valid when SMS is selected
    if (selectedContactMethods.includes('sms') && !isValidSmsTimeWindow()) {
      return false;
    }
    
    return true;
  };

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <PhoneIncoming className="w-8 h-8 md:w-10 md:h-10 text-primary-aqua" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">Contact Preferences</h1>
          </div>
          <p className="text-text-secondary text-lg leading-relaxed font-body">
            When and how would you like your future self to check in on your progress?
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-8">
          {/* Contact Method Preferences */}
          <div className="card">
            <h3 className="text-xl font-semibold mb-6 font-heading flex items-center gap-3">
              <Vibrate className="w-6 h-6 text-primary-aqua" />
              Preferred Contact Methods
            </h3>
            <p className="text-white/70 mb-6 font-body">
              How would you like your future self to reach out to you?  You can select multiple options.
            </p>
            
            <div className="space-y-3">
              {contactMethods.map((method) => (
                <label
                  key={method.value}
                  className="flex items-center gap-3 p-4 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isContactMethodSelected(method.value)}
                    onChange={() => handleContactMethodToggle(method.value)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary-aqua focus:ring-primary-aqua/50"
                    disabled={isSaving}
                  />
                  <div className="flex items-center gap-2 text-white">
                    {method.icon}
                    <span className="text-sm font-heading">
                      {method.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            
            {selectedContactMethods.filter(method => method !== 'video').length === 0 && (
              <p className="text-red-400 text-sm mt-3 font-body">
                Please select at least one contact method (phone or email).
              </p>
            )}
            
            {/* Video Call Interest Notification - Persistent when checked */}
            {videoCallInterest && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-blue-400" />
                  <p className="text-blue-400 font-medium font-heading">We will notify you when this feature is available</p>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium font-heading">Error</p>
                  <p className="text-red-300 text-sm mt-1 font-body">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-300 text-xs underline mt-2 hover:text-red-200 font-body"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Saving Indicator */}
          {isSaving && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-blue-400 font-medium font-heading">Saving your preferences...</p>
              </div>
            </div>
          )}

          {/* Phone Call Time Window Section - Only show if phone is selected */}
          {isContactMethodSelected('phone') && (
          <div className="card">
            <h3 className="text-xl font-semibold mb-6 font-heading flex items-center gap-3">
              <Phone className="w-6 h-6 text-primary-aqua" />
              Phone Call Availability
            </h3>
            <p className="text-white/70 mb-6 font-body">
              Set the hours you're available to receive phone calls from your future self.
            </p>
            
            {/* 24-Hour Availability Option */}
            <div className="mb-6">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={is24HourAvailable}
                  onChange={handle24HourToggle}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary-aqua focus:ring-primary-aqua/50"
                  disabled={isSaving}
                />
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-heading">Available 24 hours</span>
                </div>
              </label>
              
            </div>
            
            {/* Time Selection - Only show if not 24-hour */}
            {!is24HourAvailable && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                  Start Time
                </label>
                <div className="relative">
                  <select
                    value={callTimeWindow.start}
                    onChange={(e) => handleCallTimeChange('start', e.target.value)}
                    className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg text-base font-body appearance-none"
                    required
                  >
                    <option value="" className="bg-bg-primary text-white">Select start time</option>
                    {startTimeOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-bg-primary text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none" />
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                  End Time
                </label>
                <div className="relative">
                  <select
                    value={callTimeWindow.end}
                    onChange={(e) => handleCallTimeChange('end', e.target.value)}
                    className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg text-base font-body appearance-none"
                    required
                    disabled={!callTimeWindow.start}
                  >
                    <option value="" className="bg-bg-primary text-white">
                      {!callTimeWindow.start ? 'Select start time first' : 'Select end time'}
                    </option>
                    {callEndTimeOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-bg-primary text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none" />
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none" />
                </div>
              </div>
            </div>
            )}

            {/* Call time validation message */}
            {!is24HourAvailable && callTimeWindow.start && callTimeWindow.end && !isValidCallTimeWindow() && (
              <p className="text-red-400 text-sm mt-3 font-body">
                Start time must be before end time
              </p>
            )}
          </div>
          )}

          {/* SMS Availability Section - Only show if SMS is selected */}
          {isContactMethodSelected('sms') && (
          <div className="card">
            <h3 className="text-xl font-semibold mb-6 font-heading flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-primary-aqua" />
              Text Message Availability
            </h3>
            <p className="text-white/70 mb-6 font-body">
              Set the hours you're available to receive SMS messages from your future self.
            </p>
            
            {/* 24-Hour Availability Option */}
            <div className="mb-6">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSms24HourAvailable}
                  onChange={handleSms24HourToggle}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary-aqua focus:ring-primary-aqua/50"
                  disabled={isSaving}
                />
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-heading">Available 24 hours</span>
                </div>
              </label>
              
            </div>
            
            {/* Time Selection - Only show if not 24-hour */}
            {!isSms24HourAvailable && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                  Start Time
                </label>
                <div className="relative">
                  <select
                    value={smsTimeWindow.start}
                    onChange={(e) => handleSmsTimeChange('start', e.target.value)}
                    className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg text-base font-body appearance-none"
                    required
                  >
                    <option value="" className="bg-bg-primary text-white">Select start time</option>
                    {startTimeOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-bg-primary text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none" />
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                  End Time
                </label>
                <div className="relative">
                  <select
                    value={smsTimeWindow.end}
                    onChange={(e) => handleSmsTimeChange('end', e.target.value)}
                    className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg text-base font-body appearance-none"
                    required
                    disabled={!smsTimeWindow.start}
                  >
                    <option value="" className="bg-bg-primary text-white">
                      {!smsTimeWindow.start ? 'Select start time first' : 'Select end time'}
                    </option>
                    {smsEndTimeOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-bg-primary text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none" />
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none" />
                </div>
              </div>
            </div>
            )}

            {/* SMS time validation message */}
            {!isSms24HourAvailable && smsTimeWindow.start && smsTimeWindow.end && !isValidSmsTimeWindow() && (
              <p className="text-red-400 text-sm mt-3 font-body">
                Start time must be before end time
              </p>
            )}
          </div>
          )}

          {/* AI Triggers Section */}
          <div className="card">
            <h3 className="text-xl font-semibold mb-6 font-heading flex items-center gap-3">
              <Zap className="w-6 h-6 text-accent-purple" />
              Smart Triggers
              <span className="text-xs px-2 py-1 rounded-full bg-purple-800/20 text-purple-300 font-medium">
              Coming Soon
              </span>
            </h3>
            <p className="text-white/70 mb-6 font-body">
              Allow your future self to reach out at key moments when you might need guidance or motivation.
            </p>
            
            <label className="flex items-start gap-4 p-4 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 cursor-pointer">
              <input
                type="checkbox"
                checked={aiTriggersEnabled}
                onChange={(e) => handleAiTriggersChange(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-accent-purple focus:ring-accent-purple/50 mt-0.5"
                disabled={isSaving}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-white font-heading">Enable AI-Initiated Contact</span>
                </div>
                <p className="text-white/70 text-sm font-body">
                  Your future self will intelligently reach out during key moments like:
                </p>
                <ul className="text-white/60 text-sm mt-2 space-y-1 font-body">
                  <li>• When you're approaching important deadlines</li>
                  <li>• During times when you typically struggle with motivation</li>
                  <li>• After periods of inactivity on your goals</li>
                  <li>• When you might benefit from encouragement or guidance</li>
                </ul>
              </div>
            </label>

            {aiTriggersEnabled && (
              <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <p className="text-purple-400 font-medium font-heading">We will notify you when this feature is available</p>
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="mt-16 flex justify-between max-w-md mx-auto">
          <button 
            onClick={handleBack} 
            className="btn btn-outline text-lg px-8 py-4 font-heading"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className={`text-lg px-8 py-4 font-heading transition-all duration-300 rounded-xl border ${
              isValidTimeWindows() && selectedContactMethods.length > 0
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!isValidTimeWindows() || selectedContactMethods.length === 0}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const contactMethods = [
  { value: 'phone', label: 'Phone Call', icon: <Phone className="w-4 h-4" /> },
  { value: 'sms', label: 'Text Message', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { value: 'video', label: 'Video Call (Coming Soon)', icon: <Video className="w-4 h-4" /> }
];

export default CallPrefs;