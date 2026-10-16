export interface PushTokenGranted {
  readonly status: 'granted';
  readonly token: string;
}

export interface PushTokenMissing {
  readonly status: 'prompt' | 'denied' | 'failed';
}

export type PushTokenResult = PushTokenGranted | PushTokenMissing;

export interface PushNotificationOptions {
  readonly onNavigate: (url: string) => void;
  readonly serviceBaseUrl: string;
}
