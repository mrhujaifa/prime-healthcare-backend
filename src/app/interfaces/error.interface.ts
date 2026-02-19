/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TErrorSources {
  path: string;
  message: string;
}

export interface TErrorResponse {
  statusCode?: number;
  success: boolean;
  message: string;
  errorSources: TErrorSources[];
  error?: any;
}
