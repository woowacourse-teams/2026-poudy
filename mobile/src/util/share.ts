import { Share } from 'react-native';
import PoudyShareModule from 'poudy-share';

const openShareSheet = (message: string): Promise<unknown> => {
  if (PoudyShareModule) {
    return PoudyShareModule.shareAsync(message);
  }

  return Share.share({ message });
};

export const shareText = async (message: string) => {
  await openShareSheet(message).catch(() => undefined);
};
