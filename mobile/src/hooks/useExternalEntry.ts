import { useQueryClient } from '@tanstack/react-query';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';

import type { ExternalEntryOptions } from '@/types/externalEntry';
import { getDeepLinkUrl } from '@/util/entryUrl';
import { getShareSignature, getSharedValues, resolveSharedUrl } from '@/util/externalEntry';
import { shareFailureOf } from '@/util/shareFailure';

export const useExternalEntry = ({
  apiBaseUrl,
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
      const targetUrl = await resolveSharedUrl(values, webBaseUrl, apiBaseUrl, queryClient);
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
      .catch((error: unknown) => {
        if (isLatestShare()) {
          onShareFailure(shareFailureOf(error));
        }
      })
      .finally(() => {
        clearSharedPayloads();
        void refreshSharePayloads();
      });
  }, [
    clearSharedPayloads,
    apiBaseUrl,
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
