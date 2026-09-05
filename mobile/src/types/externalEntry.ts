export interface SharedPayload {
  readonly value?: string | null;
}

export interface ExternalEntryOptions {
  readonly onNavigate: (url: string) => void;
  readonly serviceBaseUrl: string;
}
