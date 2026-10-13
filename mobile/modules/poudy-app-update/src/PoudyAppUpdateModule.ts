import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface AppUpdate {
  readonly isAvailable: boolean;
  readonly isInProgress: boolean;
  readonly priority: number;
}

export type ImmediateUpdateStatus = 'updated' | 'cancelled' | 'failed' | 'unavailable';

declare class PoudyAppUpdateModule extends NativeModule {
  checkUpdateAsync(): Promise<AppUpdate>;
  startImmediateUpdateAsync(): Promise<ImmediateUpdateStatus>;
}

export default requireOptionalNativeModule<PoudyAppUpdateModule>('PoudyAppUpdate');
