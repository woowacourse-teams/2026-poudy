import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class PoudyShareModule extends NativeModule {
  shareAsync(message: string): Promise<void>;
}

export default requireOptionalNativeModule<PoudyShareModule>('PoudyShare');
