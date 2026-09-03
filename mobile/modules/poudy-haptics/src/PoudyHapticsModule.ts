import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class PoudyHapticsModule extends NativeModule {
  performSelectionAsync(): Promise<void>;
}

export default requireOptionalNativeModule<PoudyHapticsModule>('PoudyHaptics');
