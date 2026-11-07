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
  { id: 'wishlist', title: '위시리스트', icon: 'asset:quick_action_wishlist', path: '/my-page/wishlist' },
];

const RENAMED_QUICK_ACTION_IDS: ReadonlyMap<string, string> = new Map([['saved', 'wishlist']]);

export const getQuickActionItems = (): Action[] =>
  QUICK_ACTION_ENTRIES.map(({ id, title, icon }) => ({ id, title, icon }));

export const getQuickActionUrl = (id: string, serviceBaseUrl: string): string | null => {
  const currentId = RENAMED_QUICK_ACTION_IDS.get(id) ?? id;
  const entry = QUICK_ACTION_ENTRIES.find((candidate) => candidate.id === currentId);
  if (!entry) {
    return null;
  }

  return new URL(entry.path, serviceBaseUrl).toString();
};
