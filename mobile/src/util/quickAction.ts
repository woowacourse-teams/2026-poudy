import type { Action } from 'expo-quick-actions';

interface QuickActionEntry {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly path: string;
}

const QUICK_ACTION_ENTRIES: readonly QuickActionEntry[] = [
  { id: 'ingredient-search', title: '성분 검색', icon: 'search', path: '/search/ingredients' },
  { id: 'compare', title: '비교함', icon: 'symbol:square.on.square', path: '/compare' },
  { id: 'saved', title: '저장한 제품', icon: 'bookmark', path: '/saved' },
];

export const getQuickActionItems = (): Action[] =>
  QUICK_ACTION_ENTRIES.map(({ id, title, icon }) => ({ id, title, icon }));

export const getQuickActionUrl = (id: string, webBaseUrl: string): string | null => {
  const entry = QUICK_ACTION_ENTRIES.find((candidate) => candidate.id === id);
  if (!entry) {
    return null;
  }

  return new URL(entry.path, webBaseUrl).toString();
};
