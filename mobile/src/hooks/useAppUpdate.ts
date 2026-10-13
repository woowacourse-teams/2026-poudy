import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { checkAppUpdate, enforceAppUpdate, isForcedUpdate, isOptionalUpdate, suggestAppUpdate } from '@/util/appUpdate';

export const useAppUpdate = () => {
  const isCheckingRef = useRef(false);
  const hasSuggestedRef = useRef(false);

  useEffect(() => {
    const check = async (state: AppStateStatus) => {
      if (state !== 'active' || isCheckingRef.current) {
        return;
      }

      isCheckingRef.current = true;
      const update = await checkAppUpdate();

      if (isForcedUpdate(update)) {
        await enforceAppUpdate();
      }

      if (isOptionalUpdate(update) && !hasSuggestedRef.current) {
        hasSuggestedRef.current = true;
        suggestAppUpdate();
      }

      isCheckingRef.current = false;
    };

    check(AppState.currentState).catch(() => undefined);

    const subscription = AppState.addEventListener('change', check);

    return () => subscription.remove();
  }, []);
};
