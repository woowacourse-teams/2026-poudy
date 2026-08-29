export type AppTopBarIconName = 'back' | 'home' | 'share';

export interface AppTopBarProps {
  readonly onBack: () => void;
  readonly onHome: () => void;
  readonly onShare: () => void;
}
