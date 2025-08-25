import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCompanyProfile } from '../api/company';

const CompanyContext = createContext(null);

export const useCompany = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
};

export const CompanyProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getCompanyProfile();
        if (!active) return;
        setCompany(data);
      } catch (e) {
        if (!active) return;
        console.error('Failed to load company profile:', e);
        setError(e);
        // Set default company data instead of failing
        setCompany({
          name: 'GST Invoice System',
          address: '',
          gstin: '',
          phone: '',
          email: ''
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    // Only load if we're in a browser environment
    if (typeof window !== 'undefined') {
      load();
    }

    return () => { active = false; };
  }, []);

  // Update favicon to use company logo when available
  useEffect(() => {
    if (!company?.logoUrl) return;
    const setFavicon = (href) => {
      try {
        let link = document.querySelector("link[rel='icon']");
        if (!link) {
          link = document.createElement('link');
          link.setAttribute('rel', 'icon');
          document.head.appendChild(link);
        }
        link.setAttribute('href', href);
      } catch (e) {
        console.warn('Unable to set favicon:', e);
      }
    };
    setFavicon(company.logoUrl);
  }, [company?.logoUrl]);

  const value = useMemo(() => ({ company, loading, error }), [company, loading, error]);

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};
