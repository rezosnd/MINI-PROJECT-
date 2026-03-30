import React, { createContext, ReactNode, useContext, useState } from 'react';

type Sensor = { id: string; name: string; value: number | string };

interface SensorContextType {
  sensors: Sensor[];
  setSensors: (s: Sensor[]) => void;
}

const SensorContext = createContext<SensorContextType | undefined>(undefined);

export const SensorProvider = ({ children }: { children: ReactNode }) => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  return (
    <SensorContext.Provider value={{ sensors, setSensors }}>
      {children}
    </SensorContext.Provider>
  );
};

export const useSensors = () => {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensors must be used within SensorProvider');
  return ctx;
};
