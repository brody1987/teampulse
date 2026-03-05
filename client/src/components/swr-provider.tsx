"use client";

import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 30000,
        keepPreviousData: true,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
