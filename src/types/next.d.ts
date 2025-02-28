// src/types/next.d.ts
import { NextApiRequest } from 'next';
import { UserSession } from './auth'; // adjust import path as needed

declare module 'next' {
  interface NextApiRequest {
    user?: UserSession;
  }
}