"use client";

import * as React from "react";
import {
  getCompanyFilter,
  setCompanyFilter,
  type CompanyFilter,
} from "@/lib/api/core";

type CompanyContextValue = {
  company: CompanyFilter;
  setCompany: (value: CompanyFilter) => void;
};

const CompanyContext = React.createContext<CompanyContextValue | undefined>(
  undefined
);

/**
 * State global "Perusahaan Aktif" (company-switcher).
 * Murni pilihan tampilan — disimpan di localStorage, TIDAK terikat akun/role.
 * Setiap perubahan langsung ditulis ke localStorage sehingga lapisan API
 * (yang membaca localStorage) otomatis menyertakan ?lokasi= pada request.
 */
export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompanyState] = React.useState<CompanyFilter>("");

  React.useEffect(() => {
    setCompanyState(getCompanyFilter());
  }, []);

  const setCompany = React.useCallback((value: CompanyFilter) => {
    setCompanyFilter(value);
    setCompanyState(value);
  }, []);

  return (
    <CompanyContext.Provider value={{ company, setCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const ctx = React.useContext(CompanyContext);
  if (!ctx) {
    throw new Error("useCompany harus dipakai di dalam CompanyProvider");
  }
  return ctx;
}
