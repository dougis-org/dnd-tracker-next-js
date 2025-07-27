import { signUpHandler } from '@/lib/auth/api-handlers';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return signUpHandler(request);
}