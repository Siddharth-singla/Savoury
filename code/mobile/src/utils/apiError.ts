import type { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  isNetwork: boolean;
}

export function parseApiError(err: unknown): ApiError {
  const axErr = err as AxiosError<{ error?: string; details?: string[] }>;

  if (!axErr.response) {
    // No response → network-level failure (ECONNREFUSED, timeout, DNS etc.)
    const url = (axErr.config?.baseURL ?? '') + (axErr.config?.url ?? '');
    return {
      message: `Cannot reach server${url ? ` at ${url}` : ''}. Make sure the backend is running and the device is on the same network.`,
      isNetwork: true,
    };
  }

  const data = axErr.response.data;
  const details = data?.details?.join('\n');
  const base = data?.error ?? `Server error (${axErr.response.status})`;

  return {
    message: details ? `${base}\n${details}` : base,
    isNetwork: false,
  };
}
