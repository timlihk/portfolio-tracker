import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
			gcTime: 10 * 60 * 1000, // Cache for 10 minutes (formerly cacheTime)
			refetchOnMount: false, // Don't refetch when component mounts if data exists
			refetchOnReconnect: false, // Don't refetch on reconnect
		},
	},
});