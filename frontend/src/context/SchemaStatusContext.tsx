import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { fetchSchemaStatus } from '../services/ApiService';

interface SchemaStatusContextValue {
  loaded: boolean;
}

const SchemaStatusContext = createContext<SchemaStatusContextValue>({ loaded: true });

export const SchemaStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loaded, setLoaded] = useState<boolean>(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetchSchemaStatus();
        setLoaded(res.loaded);
      } catch {
        setLoaded(false);
      }
    };
    check();
  }, []);

  return (
    <SchemaStatusContext.Provider value={{ loaded }}>
      {children}
    </SchemaStatusContext.Provider>
  );
};

/**
 * Hook to access schema loaded status.
 */
export const useSchemaStatus = (): SchemaStatusContextValue => {
  return useContext(SchemaStatusContext);
};
