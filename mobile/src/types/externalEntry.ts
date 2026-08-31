export type ShareFailure = 'network' | 'timeout' | 'server' | 'unknown';

export interface ShareFailureMessage {
  readonly title: string;
  readonly body: string;
}

export interface SharedPayload {
  readonly value?: string | null;
}

export interface ExternalEntryOptions {
  readonly apiBaseUrl: string;
  readonly onNavigate: (url: string) => void;
  readonly onShareFailure: (reason: ShareFailure) => void;
  readonly onUnsupportedShare: () => void;
  readonly webBaseUrl: string;
}
