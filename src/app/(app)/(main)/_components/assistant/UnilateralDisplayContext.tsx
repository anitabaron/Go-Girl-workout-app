"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { UnilateralSide } from "@/types/workout-session-assistant";

export type UnilateralDisplayInfo = {
  displaySetNumber: number;
  side: UnilateralSide | null;
} | null;

type UnilateralDisplayContextValue = {
  displayInfo: UnilateralDisplayInfo;
  setDisplayInfo: (info: UnilateralDisplayInfo) => void;
};

const UnilateralDisplayContext =
  createContext<UnilateralDisplayContextValue | null>(null);

export function UnilateralDisplayProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [displayInfo, setDisplayInfo] = useState<UnilateralDisplayInfo>(null);

  const setDisplayInfoFn = useCallback((info: UnilateralDisplayInfo) => {
    setDisplayInfo(info);
  }, []);

  const value = useMemo<UnilateralDisplayContextValue>(
    () => ({
      displayInfo,
      setDisplayInfo: setDisplayInfoFn,
    }),
    [displayInfo, setDisplayInfoFn],
  );

  return (
    <UnilateralDisplayContext.Provider value={value}>
      {children}
    </UnilateralDisplayContext.Provider>
  );
}

export function useUnilateralDisplay() {
  const ctx = useContext(UnilateralDisplayContext);
  return ctx;
}
