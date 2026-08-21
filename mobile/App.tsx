import { QueryClientProvider } from '@tanstack/react-query';

import RootApp from '@/application/RootApp';
import { queryClient } from '@/lib/queryClient';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootApp />
    </QueryClientProvider>
  );
}
