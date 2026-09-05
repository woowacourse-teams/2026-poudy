import { useIncomingShare } from 'expo-sharing';
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';

import type { ExternalEntryOptions } from '@/types/externalEntry';
import { getDeepLinkUrl } from '@/util/entryUrl';
import { getShareSignature, getSharedValues, resolveSharedUrl } from '@/util/externalEntry';

export const useExternalEntry = ({ onNavigate, serviceBaseUrl }: ExternalEntryOptions) => {
  const { clearSharedPayloads, refreshSharePayloads, sharedPayloads } = useIncomingShare();
  const lastShare = useRef<string | null>(null);

  useEffect(() => {
    const values = getSharedValues(sharedPayloads);
    if (values.length === 0) {
      lastShare.current = null;
      return;
    }

    const signature = getShareSignature(values);
    if (lastShare.current === signature) {
      return;
    }
    lastShare.current = signature;

    const targetUrl = resolveSharedUrl(values, serviceBaseUrl);
    if (targetUrl) {
      onNavigate(targetUrl);
    }

    clearSharedPayloads();
    refreshSharePayloads();
  }, [clearSharedPayloads, onNavigate, refreshSharePayloads, sharedPayloads, serviceBaseUrl]);

  useEffect(() => {
    const handleUrl = (value: string | null) => {
      if (!value) {
        return;
      }

      const targetUrl = getDeepLinkUrl(value, serviceBaseUrl);
      if (targetUrl) {
        onNavigate(targetUrl);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => undefined);

    return () => subscription.remove();
  }, [onNavigate, serviceBaseUrl]);
};
