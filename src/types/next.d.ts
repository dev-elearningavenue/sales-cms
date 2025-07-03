// src/types/next.d.ts
import { NextApiRequest } from 'next';
import { UserSession } from './auth';

declare module 'next' {
  interface NextApiRequest {
    user?: UserSession;
  }
}