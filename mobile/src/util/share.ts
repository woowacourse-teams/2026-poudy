import { Share } from 'react-native';
import PoudyShareModule from 'poudy-share';

export const shareText = async (message: string): Promise<void> => {
  if (PoudyShareModule) {
    await PoudyShareModule.shareAsync(message);
    return;
  }

  await Share.share({ message });
};
