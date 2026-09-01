import type { Action } from 'expo-quick-actions';

import type { QuickActionEntry } from '@/types/quickAction';

const QUICK_ACTION_ENTRIES: readonly QuickActionEntry[] = [
  { id: 'product-search', title: '제품 검색', icon: 'asset:quick_action_product_search', path: '/search/products' },
  {
    id: 'ingredient-search',
    title: '성분 검색',
    icon: 'asset:quick_action_ingredient_search',
    path: '/search/ingredients',
  },
  { id: 'saved', title: '보관함', icon: 'asset:quick_action_saved', path: '/saved' },
];

export const getQuickActionItems = (): Action[] =>
  QUICK_ACTION_ENTRIES.map(({ id, title, icon }) => ({ id, title, icon }));

export const getQuickActionUrl = (id: string, serviceBaseUrl: string): string | null => {
  const entry = QUICK_ACTION_ENTRIES.find((candidate) => candidate.id === id);
  if (!entry) {
    return null;
  }

  return new URL(entry.path, serviceBaseUrl).toString();
};
