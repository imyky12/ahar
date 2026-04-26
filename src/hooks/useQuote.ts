import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "../constants";
import { getTodayQuote } from "../services/quoteService";

export const useQuote = () => {
  const query = useQuery({
    queryKey: QUERY_KEYS.quotes.today,
    queryFn: getTodayQuote,
    staleTime: 6 * 60 * 60 * 1000,
  });

  return {
    quote: query.data?.quote ?? null,
    date: query.data?.date,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
};

export default useQuote;
