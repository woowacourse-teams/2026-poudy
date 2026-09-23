import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export const useKeyboardInset = () => {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setInset(Math.max(event.endCoordinates.height, 0));
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return inset;
};
