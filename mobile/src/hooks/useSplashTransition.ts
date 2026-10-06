import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

export const useSplashTransition = () => {
  const hasStartedRef = useRef(false);

  const [isLoadingAnimationRunning, setIsLoadingAnimationRunning] = useState(Platform.OS !== 'android');

  const handleRootLayout = useCallback(() => {
    if (Platform.OS !== 'android' || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    SplashScreen.setOptions({ duration: 0 });
    SplashScreen.hide();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsLoadingAnimationRunning(true);
      });
    });
  }, []);

  return { handleRootLayout, isLoadingAnimationRunning };
};
