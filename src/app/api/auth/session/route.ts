import { sessionHandler } from '@/lib/auth/api-handlers';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return sessionHandler(request);
}