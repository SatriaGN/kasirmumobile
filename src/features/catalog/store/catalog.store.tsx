import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { CatalogContextValue, Product } from '@features/catalog/types/catalog.type';
import {
  PRODUCTS,
  CATEGORIES,
  UOMS,
  TAX_CONFIG,
  PAYMENT_METHODS,
  DISCOUNTS,
} from '@data/mockData';

const CatalogContext = createContext<CatalogContextValue | null>(null);

export const CatalogProvider = ({ children }: { children: React.ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [categories] = useState(CATEGORIES);
  const [uoms] = useState(UOMS);
  const [tax] = useState(TAX_CONFIG);
  const [paymentMethods] = useState(PAYMENT_METHODS);
  const [discounts] = useState(DISCOUNTS);

  const findProductByBarcode = useCallback<CatalogContextValue['findProductByBarcode']>(
    (code) => (code ? products.find((p) => p.barcode === code.trim()) || null : null),
    [products]
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      setProducts,
      categories,
      uoms,
      tax,
      paymentMethods,
      discounts,
      findProductByBarcode,
    }),
    [products, categories, uoms, tax, paymentMethods, discounts, findProductByBarcode]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = (): CatalogContextValue => {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
};
