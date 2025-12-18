// utils/get_token_data.ts

import { cookies, headers } from 'next/headers';
import { verifyToken } from './auth';

export async function getDataFromToken() {
  let token: string | undefined;

  // Method 1: Try to get token from cookies (browser requests)
  const cookieStore = cookies();
  token = cookieStore.get('token')?.value;

  // Method 2: If no cookie, try Authorization header (Postman/API requests)
  if (!token) {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (authHeader) {
      // Support both "Bearer <token>" and raw token
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        token = authHeader;
      }
    }
  }

  if (!token) {
    return null;
  }

  const result = await verifyToken(token);
  if (!result.success) {
    // throw new Error('Invalid token');
    return null;
  }

  return result.data;
}