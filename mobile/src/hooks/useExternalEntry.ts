import { useQueryClient } from '@tanstack/react-query';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';

import { getDeepLinkUrl } from '@/util/entryUrl';
import { getShareSignature, getSharedValues, resolveSharedUrl } from '@/util/externalEntry';

interface ExternalEntryOptions {
  readonly onNavigate: (url: string) => void;
  readonly onShareFailure: () => void;
  readonly onUnsupportedShare: () => void;
  readonly webBaseUrl: string;
}

export const useExternalEntry = ({
  onNavigate,
  onShareFailure,
  onUnsupportedShare,
  webBaseUrl,
}: ExternalEntryOptions) => {
  const queryClient = useQueryClient();
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

    const isLatestShare = () => lastShare.current === signature;

    const navigate = async () => {
      const targetUrl = await resolveSharedUrl(values, webBaseUrl, queryClient);
      if (!isLatestShare()) {
        return;
      }

      if (targetUrl) {
        onNavigate(targetUrl);
        return;
      }

      onUnsupportedShare();
    };

    void navigate()
      .catch(() => {
        if (isLatestShare()) {
          onShareFailure();
        }
      })
      .finally(() => {
        clearSharedPayloads();
        void refreshSharePayloads();
      });
  }, [
    clearSharedPayloads,
    onNavigate,
    onShareFailure,
    onUnsupportedShare,
    queryClient,
    refreshSharePayloads,
    sharedPayloads,
    webBaseUrl,
  ]);

  useEffect(() => {
    const handleUrl = (value: string | null) => {
      if (!value) {
        return;
      }

      const targetUrl = getDeepLinkUrl(value, webBaseUrl);
      if (targetUrl) {
        onNavigate(targetUrl);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    void Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => undefined);

    return () => subscription.remove();
  }, [onNavigate, webBaseUrl]);
};
