import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

import App from './App';

if (Platform.OS === 'android') {
  void SplashScreen.preventAutoHideAsync();
}

registerRootComponent(App);
