import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      refetchOnWindowFocus: true,
      retry: (count, error) =>
        count < 1 && axios.isAxiosError(error) && (!error.response || error.response.status >= 500),
    },
    mutations: { retry: false },
  },
});
