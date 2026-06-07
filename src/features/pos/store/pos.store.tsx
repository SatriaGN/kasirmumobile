import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { computeTotals, effectiveUnitPrice, uuid } from '@shared/utils/format';
import type { PosContextValue, CartLine, HeldOrder, ManualDiscount } from '@features/pos/types/pos.type';
import type { Discount } from '@features/catalog/types/catalog.type';
import type { Member } from '@features/members/types/members.type';
import type { Transaction } from '@features/transactions/types/transactions.type';
import type { DebtRecord } from '@features/debt/types/debt.type';
import type { OutboxItem } from '@features/sync/types/sync.type';
import { MEMBERS } from '@data/mockData';
import { useCatalog } from '@features/catalog/store/catalog.store';
import { useAuth } from '@features/auth/store/auth.store';
import { useOutlet } from '@features/outlet/store/outlet.store';
import { useMembersStore } from '@features/members/store/members.store';
import { useDebtStore } from '@features/debt/store/debt.store';
import { useTransactionsStore } from '@features/transactions/store/transactions.store';
import { useSyncStore } from '@features/sync/store/sync.store';
import { usePosResetRef } from '@features/pos/services/pos-reset.service';
import { useRegisterReset } from '@app/store/ResetRegistry';

const DEFAULT_MEMBER = MEMBERS[0]!; // "Umum"

const PosContext = createContext<PosContextValue | null>(null);

export const PosProvider = ({ children }: { children: React.ReactNode }) => {
  const { products, setProducts, tax } = useCatalog();
  const { user } = useAuth();
  const { activeOutlet } = useOutlet();
  const { memberTypes, setMembers } = useMembersStore();
  const { setDebtRecords } = useDebtStore();
  const { transactions, setTransactions } = useTransactionsStore();
  const { online, setOutbox } = useSyncStore();
  const posResetRef = usePosResetRef();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member>(DEFAULT_MEMBER);
  const [discountConfig, setDiscountConfig] = useState<Discount | null>(null);
  const [manualDiscount, setManualDiscount] = useState<ManualDiscount | null>(null);
  const [isCredit, setIsCredit] = useState(false);

  // ── Cart construction ──
  const buildLine = useCallback<PosContextValue['buildLine']>(
    (product, { variantId = null, uomConversionId = null, qty = 1, note = '' } = {}) => {
      const unitPrice = effectiveUnitPrice(product, { variantId, uomConversionId, qty });
      const variant = product.variants?.find((v) => v.id === variantId);
      const uom = product.uomConversions?.find((u) => u.id === uomConversionId);
      return {
        lineId: `${product.id}-${variantId || ''}-${uomConversionId || ''}`,
        productId: product.id,
        name: product.name + (variant ? ` (${variant.name})` : '') + (uom ? ` [${uom.name}]` : ''),
        image: product.image,
        variantId,
        uomConversionId,
        note,
        qty,
        unitPrice,
        hargaBeli: product.hargaBeli,
        subtotal: unitPrice * qty,
      };
    },
    []
  );

  const addToCart = useCallback<PosContextValue['addToCart']>(
    (product, opts = {}) => {
      setCart((prev) => {
        const line = buildLine(product, { qty: 1, ...opts });
        const existing = prev.find((i) => i.lineId === line.lineId);
        if (existing) {
          const qty = existing.qty + (opts.qty || 1);
          const unitPrice = effectiveUnitPrice(product, {
            variantId: line.variantId,
            uomConversionId: line.uomConversionId,
            qty,
          });
          return prev.map((i) =>
            i.lineId === line.lineId ? { ...i, qty, unitPrice, subtotal: unitPrice * qty } : i
          );
        }
        const qty = opts.qty || 1;
        return [...prev, { ...line, qty, subtotal: line.unitPrice * qty }];
      });
    },
    [buildLine]
  );

  const removeFromCart = useCallback<PosContextValue['removeFromCart']>((lineId) => {
    setCart((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const updateCartQty = useCallback<PosContextValue['updateCartQty']>(
    (lineId, qty) => {
      if (qty <= 0) {
        setCart((prev) => prev.filter((i) => i.lineId !== lineId));
        return;
      }
      setCart((prev) =>
        prev.map((i) => {
          if (i.lineId !== lineId) return i;
          const product = products.find((p) => p.id === i.productId);
          const unitPrice = effectiveUnitPrice(product, {
            variantId: i.variantId,
            uomConversionId: i.uomConversionId,
            qty,
          });
          return { ...i, qty, unitPrice, subtotal: unitPrice * qty };
        })
      );
    },
    [products]
  );

  const clearCart = useCallback<PosContextValue['clearCart']>(() => {
    setCart([]);
    setDiscountConfig(null);
    setManualDiscount(null);
    setSelectedMember(DEFAULT_MEMBER);
    setIsCredit(false);
  }, []);

  const totals = useMemo(
    () => computeTotals(cart, { discountConfig, manualDiscount, tax }),
    [cart, discountConfig, manualDiscount, tax]
  );

  // ── Hold / Resume ──
  const holdCurrentOrder = useCallback<PosContextValue['holdCurrentOrder']>(
    (note = '') => {
      if (cart.length === 0) return null;
      const held: HeldOrder = {
        id: `HOLD-${Date.now()}`,
        heldAt: new Date().toISOString(),
        items: [...cart],
        discountConfig,
        manualDiscount,
        member: selectedMember,
        note,
        total: totals.total,
        itemCount: cart.reduce((s, i) => s + i.qty, 0),
      };
      setHeldOrders((prev) => [held, ...prev]);
      clearCart();
      return held;
    },
    [cart, discountConfig, manualDiscount, selectedMember, totals.total, clearCart]
  );

  const resumeHeldOrder = useCallback<PosContextValue['resumeHeldOrder']>(
    (holdId) => {
      const held = heldOrders.find((h) => h.id === holdId);
      if (!held) return false;
      setCart(held.items);
      setDiscountConfig(held.discountConfig || null);
      setManualDiscount(held.manualDiscount || null);
      setSelectedMember(held.member || DEFAULT_MEMBER);
      setHeldOrders((prev) => prev.filter((h) => h.id !== holdId));
      return true;
    },
    [heldOrders]
  );

  const deleteHeldOrder = useCallback<PosContextValue['deleteHeldOrder']>((holdId) => {
    setHeldOrders((prev) => prev.filter((h) => h.id !== holdId));
  }, []);

  // Expose held-order clearing to sibling domains (shift close) via the bridge ref.
  useEffect(() => {
    posResetRef.current = { clearHeldOrders: () => setHeldOrders([]) };
    return () => {
      posResetRef.current = null;
    };
  }, [posResetRef]);

  // Reset all POS-scoped state on logout.
  useRegisterReset(() => {
    setHeldOrders([]);
    clearCart();
  });

  // ── Payment ──
  const processPayment = useCallback<PosContextValue['processPayment']>(
    (method, cashReceived) => {
      const clientTxnId = uuid();
      const t = computeTotals(cart, { discountConfig, manualDiscount, tax });
      const change = method === 'tunai' ? Math.max(0, (cashReceived || 0) - t.total) : 0;
      const tx: Transaction = {
        id: `t-${Date.now()}`,
        clientTxnId,
        code: `TRX-${new Date().getFullYear()}${String(transactions.length + 1).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
        items: cart.map((i) => ({
          productId: i.productId,
          name: i.name,
          image: i.image,
          qty: i.qty,
          hargaJual: i.unitPrice,
          hargaBeli: i.hargaBeli,
          subtotal: i.subtotal,
          note: i.note,
          variantId: i.variantId,
          uomConversionId: i.uomConversionId,
        })),
        subtotal: t.subtotal,
        discount: t.discount,
        tax: t.tax,
        total: t.total,
        method,
        cashReceived: cashReceived || 0,
        change,
        cashier: user?.name || 'Kasir',
        memberName: selectedMember?.name || 'Umum',
        memberId: selectedMember?.id,
        status: 'completed',
        credit: isCredit,
        outletId: activeOutlet?.id,
        outletName: activeOutlet?.name,
        shiftId: 'active',
        synced: online,
      };
      setTransactions((prev) => [tx, ...prev]);

      // Reduce stock (base-unit aware)
      setProducts((prev) =>
        prev.map((p) => {
          const lines = cart.filter((c) => c.productId === p.id);
          if (!lines.length) return p;
          const baseQty = lines.reduce((s, l) => {
            const u = p.uomConversions?.find((x) => x.id === l.uomConversionId);
            return s + l.qty * (u ? u.factor : 1);
          }, 0);
          return { ...p, stokSaat: Math.max(0, p.stokSaat - baseQty) };
        })
      );

      // Credit → create debt record + raise member totalDebt
      if (isCredit && selectedMember?.canCredit) {
        const dueDays =
          memberTypes.find((mt) => mt.id === selectedMember.memberTypeId)?.tenorDays || 0;
        const due = new Date();
        due.setDate(due.getDate() + dueDays);
        const debt: DebtRecord = {
          id: `dr-${Date.now()}`,
          memberId: selectedMember.id,
          type: 'debt',
          amount: t.total,
          outstanding: t.total,
          status: 'open',
          dueDate: due.toISOString().slice(0, 10),
          createdAt: tx.createdAt,
          note: `Transaksi ${tx.code}`,
        };
        setDebtRecords((prev) => [debt, ...prev]);
        setMembers((prev) =>
          prev.map((m) =>
            m.id === selectedMember.id ? { ...m, totalDebt: m.totalDebt + t.total } : m
          )
        );
      }

      // Outbox if offline
      if (!online) {
        const item: OutboxItem = {
          id: clientTxnId,
          type: 'transaction',
          status: 'pending',
          label: `Transaksi ${tx.code}`,
          message: 'Menunggu koneksi',
          createdAt: tx.createdAt,
        };
        setOutbox((prev) => [item, ...prev]);
      }
      clearCart();
      return tx;
    },
    [
      cart,
      discountConfig,
      manualDiscount,
      tax,
      transactions.length,
      user,
      selectedMember,
      isCredit,
      activeOutlet,
      online,
      memberTypes,
      clearCart,
      setProducts,
      setTransactions,
      setDebtRecords,
      setMembers,
      setOutbox,
    ]
  );

  const value = useMemo<PosContextValue>(
    () => ({
      cart,
      totals,
      selectedMember,
      discountConfig,
      manualDiscount,
      isCredit,
      heldOrders,
      buildLine,
      addToCart,
      removeFromCart,
      updateCartQty,
      clearCart,
      setSelectedMember,
      setDiscountConfig,
      setManualDiscount,
      setIsCredit,
      holdCurrentOrder,
      resumeHeldOrder,
      deleteHeldOrder,
      processPayment,
    }),
    [
      cart,
      totals,
      selectedMember,
      discountConfig,
      manualDiscount,
      isCredit,
      heldOrders,
      buildLine,
      addToCart,
      removeFromCart,
      updateCartQty,
      clearCart,
      holdCurrentOrder,
      resumeHeldOrder,
      deleteHeldOrder,
      processPayment,
    ]
  );

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
};

export const usePos = (): PosContextValue => {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error('usePos must be used within PosProvider');
  return ctx;
};
