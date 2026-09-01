export interface QuickActionOptions {
  readonly onNavigate: (url: string) => void;
  readonly serviceBaseUrl: string;
}

export interface QuickActionEntry {
  readonly icon: string;
  readonly id: string;
  readonly path: string;
  readonly title: string;
}
