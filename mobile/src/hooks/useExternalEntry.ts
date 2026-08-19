import { useIncomingShare } from 'expo-sharing';
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';

import { getDeepLinkUrl } from '@/util/entryUrl';
import { getShareSignature, getSharedValues, resolveSharedUrl } from '@/util/externalEntry';

interface ExternalEntryOptions {
  readonly onNavigate: (url: string) => void;
  readonly onUnsupportedShare: () => void;
  readonly webBaseUrl: string;
}

export const useExternalEntry = (options: ExternalEntryOptions) => {
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

    const pending = { cancelled: false };

    const navigate = async () => {
      const targetUrl = await resolveSharedUrl(values, options.webBaseUrl);
      if (pending.cancelled) {
        return;
      }

      if (targetUrl) {
        options.onNavigate(targetUrl);
        return;
      }

      options.onUnsupportedShare();
    };

    void navigate();
    clearSharedPayloads();
    void refreshSharePayloads();

    return () => {
      pending.cancelled = true;
    };
  }, [clearSharedPayloads, options, refreshSharePayloads, sharedPayloads]);

  useEffect(() => {
    const handleUrl = (value: string | null) => {
      if (!value) {
        return;
      }

      const targetUrl = getDeepLinkUrl(value, options.webBaseUrl);
      if (targetUrl) {
        options.onNavigate(targetUrl);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    void Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => undefined);

    return () => subscription.remove();
  }, [options]);
};
