import { keepPreviousData, type UseQueryOptions } from '@tanstack/react-query';

export type PaginatedResponse<T> = {
  data: T[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
  };
};

export function paginatedQueryOptions<TData, TError = unknown>(
  options: Omit<UseQueryOptions<PaginatedResponse<TData>, TError, PaginatedResponse<TData>>, 'queryKey' | 'queryFn'> &
    Pick<UseQueryOptions<PaginatedResponse<TData>, TError, PaginatedResponse<TData>>, 'queryKey' | 'queryFn'>
) {
  return {
    placeholderData: keepPreviousData,
    ...options,
  };
}
