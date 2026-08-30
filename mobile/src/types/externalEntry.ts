export interface SharedPayload {
  readonly value?: string | null;
}

export interface ExternalEntryOptions {
  readonly apiBaseUrl: string;
  readonly onNavigate: (url: string) => void;
  readonly onShareFailure: () => void;
  readonly onUnsupportedShare: () => void;
  readonly webBaseUrl: string;
}
