import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData: any;
    try {
      errorData = await res.json();
    } catch {
      errorData = { message: res.statusText };
    }
    const error = new Error(errorData.message || `${res.status}: ${res.statusText}`);
    (error as any).status = res.status;
    (error as any).errorType = errorData.errorType || null;
    (error as any).errorCode = errorData.errorCode || 0;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

function shouldRetry(failureCount: number, error: any): boolean {
  if (error?.status === 401 || error?.status === 403) return false;
  if (error?.status === 429) return false;
  if (error?.errorType === 'auth') return false;
  if (error?.errorType === 'maintenance') return false;
  if (error?.errorType === 'rate_limit') return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: shouldRetry,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: false,
      networkMode: 'always',
    },
  },
});
