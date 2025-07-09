// utils/get_token_data.ts

import { cookies } from 'next/headers';
import { verifyToken } from './auth';

export async function getDataFromToken() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    // throw new Error('No token found');
    return null;
  }

  const result = await verifyToken(token);
  if (!result.success) {
    // throw new Error('Invalid token');
    return null;
  }

  return result.data;
}