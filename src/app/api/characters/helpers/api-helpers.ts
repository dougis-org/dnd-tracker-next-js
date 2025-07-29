import { NextResponse } from 'next/server';
import type { ServiceError } from '@/lib/services/CharacterServiceErrors';

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  pagination?: any;
}

export function createErrorResponse(
  error: string | ServiceError,
  status: number,
  details?: any
): NextResponse<ApiErrorResponse> {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorDetails = typeof error === 'string' ? details : error.details;

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      ...(errorDetails && { details: errorDetails })
    },
    { status }
  );
}

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  pagination?: any,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
      ...(pagination && { pagination })
    },
    { status }
  );
}


export function parseQueryParams(url: string) {
  const { searchParams } = new URL(url);
  return {
    type: searchParams.get('type'),
    search: searchParams.get('search'),
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
  };
}