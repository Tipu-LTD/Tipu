export interface ApiError {
  error: string;
  message?: string;
  code?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
