import { Share } from 'react-native';

import PoudyShareModule from '../../modules/poudy-share/src/PoudyShareModule';

export const shareText = async (message: string): Promise<void> => {
  if (PoudyShareModule) {
    await PoudyShareModule.shareAsync(message);
    return;
  }

  await Share.share({ message });
};
