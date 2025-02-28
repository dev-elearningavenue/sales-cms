// src/contexts/SessionContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { useSession as useSessionHook } from '@/hooks/useSession';

const SessionContext = createContext<ReturnType<typeof useSessionHook> | undefined>(undefined);

// export function SessionProvider({ children }: { children: ReactNode }) {
//   const session = useSessionHook();
//   return (
//     <SessionContext.Provider value={session}>
//       {children}
//     </SessionContext.Provider>
//   );
// }

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('use Session must be used within a SessionProvider');
  }
  return context;
}