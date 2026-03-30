import React, { createContext, ReactNode, useContext, useState } from 'react';

type AlertItem = { id: number; title: string; message?: string; read?: boolean };

interface AlertContextType {
  alerts: AlertItem[];
  addAlert: (a: AlertItem) => void;
  clearAlerts: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const addAlert = (a: AlertItem) => setAlerts(prev => [a, ...prev]);
  const clearAlerts = () => setAlerts([]);

  return (
    <AlertContext.Provider value={{ alerts, addAlert, clearAlerts }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlerts must be used within AlertProvider');
  return ctx;
};
