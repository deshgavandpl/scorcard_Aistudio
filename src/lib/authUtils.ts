import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';

/**
 * Handles Google Login with a strategy that works on both desktop and mobile.
 * Uses signInWithPopup on desktop and signInWithRedirect on mobile.
 */
export const handleGoogleLogin = async () => {
  const provider = new GoogleAuthProvider();
  
  // Check if we are on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  try {
    if (isMobile) {
      // For mobile, redirect is more reliable as popups are often blocked
      await signInWithRedirect(auth, provider);
    } else {
      // For desktop, popup is a better user experience
      await signInWithPopup(auth, provider);
    }
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};
