import { QueryClient } from '@tanstack/react-query';

const CACHE_MS = 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: CACHE_MS,
      retry: 0,
      staleTime: CACHE_MS,
    },
  },
});
