export type AppPlatform = 'ios' | 'android';

export interface AppInfo {
  readonly is_app: true;
  readonly platform: AppPlatform;
  readonly app_version: string;
  readonly os_version: string;
  readonly device_model: string;
}
