import React, { createContext, ReactNode, useContext, useState } from 'react';

interface RiskContextType {
  riskScore: number;
  setRiskScore: (n: number) => void;
}

const RiskContext = createContext<RiskContextType | undefined>(undefined);

export const RiskProvider = ({ children }: { children: ReactNode }) => {
  const [riskScore, setRiskScore] = useState<number>(50);
  return (
    <RiskContext.Provider value={{ riskScore, setRiskScore }}>
      {children}
    </RiskContext.Provider>
  );
};

export const useRisk = () => {
  const ctx = useContext(RiskContext);
  if (!ctx) throw new Error('useRisk must be used within RiskProvider');
  return ctx;
};
