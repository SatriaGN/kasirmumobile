// ════════════════════════════════════════════════════════════════════════════
//  MOCK DATA — KasirMu Mobile
//  Aligned with prd-mobile-kasir/* (foundation, api-contract, role docs).
//  All data is dummy / in-memory. Money = integer Rupiah.
// ════════════════════════════════════════════════════════════════════════════

import type { Outlet } from '@features/outlet/types/outlet.type';
import type { User } from '@features/auth/types/auth.type';
import type {
  Category,
  Uom,
  Product,
  TaxConfig,
  PaymentMethod,
  Discount,
} from '@features/catalog/types/catalog.type';
import type { MemberType, Member } from '@features/members/types/members.type';
import type { DebtRecord } from '@features/debt/types/debt.type';
import type { Transaction, TransactionItem } from '@features/transactions/types/transactions.type';
import type { PaymentMethodKey } from '@features/catalog/types/catalog.type';
import type { ISODateString } from '@shared/types/common';

const daysAgo = (n: number): ISODateString => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

// ─── Tenant / Outlets ─────────────────────────────────────────────────────────
export const OUTLETS: Outlet[] = [
  { id: 'o1', name: 'Wijaya Mart — Darmo', address: 'Jl. Raya Darmo No. 12, Surabaya', city: 'Surabaya', status: 'active' },
  { id: 'o2', name: 'Wijaya Mart — Gubeng', address: 'Jl. Raya Gubeng No. 45, Surabaya', city: 'Surabaya', status: 'active' },
  { id: 'o3', name: 'Wijaya Mart — Tunjungan', address: 'Jl. Tunjungan No. 88, Surabaya', city: 'Surabaya', status: 'active' },
];

// ─── Users (kasir) — JWT-style claims ───────────────────────────────────────────
// password for all demo accounts is "kasir"
export const USERS: User[] = [
  {
    id: 'u-kasir', name: 'Sari', email: 'sari@toko.id', password: 'kasir',
    role: 'kasir', tenantId: 't1', outletIds: ['o1'],
    permissions: { canVoid: false, canDiscount: true, canViewShiftReport: true, canViewCostPrice: false, canManageMembers: true },
    avatar: 'SR', avatarBg: '#D9F5EC',
  },
  {
    id: 'u-kasir2', name: 'Dewi', email: 'dewi@toko.id', password: 'kasir',
    role: 'kasir', tenantId: 't1', outletIds: ['o1', 'o2'],
    permissions: { canVoid: true, canDiscount: true, canViewShiftReport: true, canViewCostPrice: true, canManageMembers: false },
    avatar: 'DW', avatarBg: '#FFE6DC',
  },
];

// ─── Categories & UOM ───────────────────────────────────────────────────────────
export const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Makanan', icon: '🍽️', color: '#E3F2FD' },
  { id: 'c2', name: 'Minuman', icon: '🥤', color: '#E8F5E9' },
  { id: 'c3', name: 'Snack', icon: '🍿', color: '#FFF3E0' },
  { id: 'c4', name: 'Sembako', icon: '🌾', color: '#FCE4EC' },
  { id: 'c5', name: 'Rokok', icon: '🚬', color: '#F3E5F5' },
];

export const UOMS: Uom[] = [
  { id: 'uom-pcs', name: 'Pcs' },
  { id: 'uom-pack', name: 'Pack' },
  { id: 'uom-box', name: 'Dus' },
];

// ─── Products (variants, uomConversions, wholesalePrices) ────────────────────────
// hargaJual = sell price (base unit), hargaBeli = cost (HPP), stokSaat = stock now
export const PRODUCTS: Product[] = [
  {
    id: 'p1', name: 'Kopi Susu Gula Aren', barcode: '8991234560011', categoryId: 'c2',
    image: '☕', hargaJual: 18000, hargaBeli: 9000, stokSaat: 48, stokMinimum: 10,
    variants: [
      { id: 'p1-v1', name: 'Small', priceDelta: -3000 },
      { id: 'p1-v2', name: 'Medium', priceDelta: 0 },
      { id: 'p1-v3', name: 'Large', priceDelta: 4000 },
    ],
    uomConversions: [],
    wholesalePrices: [],
  },
  {
    id: 'p2', name: 'Indomie Goreng', barcode: '8991234560028', categoryId: 'c1',
    image: '🍜', hargaJual: 3500, hargaBeli: 2600, stokSaat: 240, stokMinimum: 30,
    variants: [],
    uomConversions: [
      { id: 'p2-u1', uomId: 'uom-box', name: 'Dus (40 pcs)', factor: 40, hargaJual: 130000 },
    ],
    wholesalePrices: [
      { id: 'p2-w1', minQty: 10, price: 3200 },
      { id: 'p2-w2', minQty: 40, price: 3000 },
    ],
  },
  {
    id: 'p3', name: 'Aqua Botol 600ml', barcode: '8991234560035', categoryId: 'c2',
    image: '💧', hargaJual: 4000, hargaBeli: 2800, stokSaat: 120, stokMinimum: 24,
    variants: [],
    uomConversions: [
      { id: 'p3-u1', uomId: 'uom-box', name: 'Dus (24 botol)', factor: 24, hargaJual: 85000 },
    ],
    wholesalePrices: [{ id: 'p3-w1', minQty: 24, price: 3500 }],
  },
  {
    id: 'p4', name: 'Beras Pandan Wangi 5kg', barcode: '8991234560042', categoryId: 'c4',
    image: '🌾', hargaJual: 72000, hargaBeli: 64000, stokSaat: 35, stokMinimum: 8,
    variants: [], uomConversions: [], wholesalePrices: [{ id: 'p4-w1', minQty: 5, price: 69000 }],
  },
  {
    id: 'p5', name: 'Minyak Goreng 2L', barcode: '8991234560059', categoryId: 'c4',
    image: '🛢️', hargaJual: 38000, hargaBeli: 33000, stokSaat: 6, stokMinimum: 12,
    variants: [], uomConversions: [], wholesalePrices: [{ id: 'p5-w1', minQty: 6, price: 36000 }],
  },
  {
    id: 'p6', name: 'Teh Botol Sosro', barcode: '8991234560066', categoryId: 'c2',
    image: '🧋', hargaJual: 5000, hargaBeli: 3500, stokSaat: 90, stokMinimum: 20,
    variants: [], uomConversions: [], wholesalePrices: [{ id: 'p6-w1', minQty: 24, price: 4500 }],
  },
  {
    id: 'p7', name: 'Chitato Sapi Panggang', barcode: '8991234560073', categoryId: 'c3',
    image: '🥔', hargaJual: 12000, hargaBeli: 9000, stokSaat: 64, stokMinimum: 15,
    variants: [], uomConversions: [], wholesalePrices: [],
  },
  {
    id: 'p8', name: 'Roti Tawar Sari Roti', barcode: '8991234560080', categoryId: 'c1',
    image: '🍞', hargaJual: 16000, hargaBeli: 12000, stokSaat: 0, stokMinimum: 6,
    variants: [], uomConversions: [], wholesalePrices: [],
  },
  {
    id: 'p9', name: 'Gula Pasir 1kg', barcode: '8991234560097', categoryId: 'c4',
    image: '🍬', hargaJual: 15000, hargaBeli: 13000, stokSaat: 42, stokMinimum: 10,
    variants: [], uomConversions: [], wholesalePrices: [{ id: 'p9-w1', minQty: 10, price: 14000 }],
  },
  {
    id: 'p10', name: 'Sampoerna Mild 16', barcode: '8991234560103', categoryId: 'c5',
    image: '🚬', hargaJual: 33000, hargaBeli: 30000, stokSaat: 58, stokMinimum: 12,
    variants: [], uomConversions: [{ id: 'p10-u1', uomId: 'uom-box', name: 'Slop (10 bks)', factor: 10, hargaJual: 320000 }],
    wholesalePrices: [],
  },
  {
    id: 'p11', name: 'Es Krim Walls Cornetto', barcode: '8991234560110', categoryId: 'c3',
    image: '🍦', hargaJual: 10000, hargaBeli: 7000, stokSaat: 30, stokMinimum: 10,
    variants: [
      { id: 'p11-v1', name: 'Coklat', priceDelta: 0 },
      { id: 'p11-v2', name: 'Vanilla', priceDelta: 0 },
      { id: 'p11-v3', name: 'Tiramisu', priceDelta: 2000 },
    ],
    uomConversions: [], wholesalePrices: [],
  },
  {
    id: 'p12', name: 'Telur Ayam (kg)', barcode: '8991234560127', categoryId: 'c4',
    image: '🥚', hargaJual: 28000, hargaBeli: 24000, stokSaat: 18, stokMinimum: 10,
    variants: [], uomConversions: [], wholesalePrices: [{ id: 'p12-w1', minQty: 10, price: 26000 }],
  },
];

// ─── Settings: Tax / Payment Methods / Discounts ─────────────────────────────────
export const TAX_CONFIG: TaxConfig = { ppnEnabled: true, ppnRate: 11, ppnIncluded: false };

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm-tunai', key: 'tunai', label: 'Tunai', icon: 'cash-outline', isEnabled: true },
  { id: 'pm-qris', key: 'qris', label: 'QRIS', icon: 'qr-code-outline', isEnabled: true },
  { id: 'pm-kartu', key: 'kartu', label: 'Kartu Debit', icon: 'card-outline', isEnabled: true },
  { id: 'pm-transfer', key: 'transfer', label: 'Transfer', icon: 'swap-horizontal-outline', isEnabled: true },
];

export const DISCOUNTS: Discount[] = [
  { id: 'd1', name: 'Diskon Belanja 50rb', type: 'percentage', value: 5, minPurchase: 50000, isActive: true },
  { id: 'd2', name: 'Potongan 100rb', type: 'fixed', value: 10000, minPurchase: 100000, isActive: true },
  { id: 'd3', name: 'Promo Member Gold', type: 'percentage', value: 8, minPurchase: 75000, isActive: true },
];

// ─── Member Types & Members ─────────────────────────────────────────────────────
export const MEMBER_TYPES: MemberType[] = [
  { id: 'mt1', name: 'Reguler', canCredit: false, tenorDays: 0 },
  { id: 'mt2', name: 'Silver', canCredit: true, tenorDays: 14 },
  { id: 'mt3', name: 'Gold', canCredit: true, tenorDays: 30 },
];

export const MEMBERS: Member[] = [
  { id: 'm0', name: 'Umum', phone: '-', email: '', address: '', memberTypeId: 'mt1', memberTypeName: 'Reguler', canCredit: false, status: 'active', totalDebt: 0 },
  { id: 'm1', name: 'Budi Santoso', phone: '081234567890', email: 'budi@email.com', address: 'Jl. Mawar 5', memberTypeId: 'mt3', memberTypeName: 'Gold', canCredit: true, status: 'active', totalDebt: 350000 },
  { id: 'm2', name: 'Siti Rahayu', phone: '082345678901', email: 'siti@email.com', address: 'Jl. Melati 12', memberTypeId: 'mt2', memberTypeName: 'Silver', canCredit: true, status: 'active', totalDebt: 120000 },
  { id: 'm3', name: 'Ahmad Fauzi', phone: '083456789012', email: '', address: '', memberTypeId: 'mt1', memberTypeName: 'Reguler', canCredit: false, status: 'active', totalDebt: 0 },
  { id: 'm4', name: 'Dewi Lestari', phone: '084567890123', email: 'dewi.l@email.com', address: 'Jl. Anggrek 7', memberTypeId: 'mt3', memberTypeName: 'Gold', canCredit: true, status: 'active', totalDebt: 780000 },
  { id: 'm5', name: 'Toko Berkah (Reseller)', phone: '085678901234', email: '', address: 'Pasar Pagi Blok C', memberTypeId: 'mt2', memberTypeName: 'Silver', canCredit: true, status: 'active', totalDebt: 0 },
];

// ─── Debt Records (ledger: debt/payment) with aging fields ───────────────────────
export const DEBT_RECORDS: DebtRecord[] = [
  // Budi — total 350k
  { id: 'dr1', memberId: 'm1', type: 'debt', amount: 200000, outstanding: 100000, status: 'partial', dueDate: daysAgo(20).slice(0, 10), createdAt: daysAgo(25), note: 'Belanja sembako' },
  { id: 'dr2', memberId: 'm1', type: 'debt', amount: 250000, outstanding: 250000, status: 'open', dueDate: daysAgo(5).slice(0, 10), createdAt: daysAgo(10), note: 'Belanja grosir' },
  { id: 'dr3', memberId: 'm1', type: 'payment', amount: 100000, method: 'tunai', allocations: [{ debtRecordId: 'dr1', amount: 100000 }], createdAt: daysAgo(15) },
  // Siti — total 120k
  { id: 'dr4', memberId: 'm2', type: 'debt', amount: 120000, outstanding: 120000, status: 'open', dueDate: daysAgo(2).slice(0, 10), createdAt: daysAgo(6), note: 'Belanja bulanan' },
  // Dewi — total 780k (overdue)
  { id: 'dr5', memberId: 'm4', type: 'debt', amount: 500000, outstanding: 500000, status: 'open', dueDate: daysAgo(40).slice(0, 10), createdAt: daysAgo(45), note: 'Stok warung' },
  { id: 'dr6', memberId: 'm4', type: 'debt', amount: 280000, outstanding: 280000, status: 'open', dueDate: daysAgo(12).slice(0, 10), createdAt: daysAgo(18), note: 'Belanja tambahan' },
];

// ─── Transactions ────────────────────────────────────────────────────────────────
const CASHIERS = ['Sari', 'Dewi'];
const METHODS: PaymentMethodKey[] = ['tunai', 'qris', 'kartu', 'transfer'];

export const generateTransactions = (): Transaction[] => {
  const list: Transaction[] = [];
  for (let i = 1; i <= 40; i++) {
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items: TransactionItem[] = [];
    let subtotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const p = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)]!;
      const qty = Math.floor(Math.random() * 3) + 1;
      const lineSubtotal = p.hargaJual * qty;
      items.push({
        productId: p.id, name: p.name, image: p.image,
        qty, hargaJual: p.hargaJual, hargaBeli: p.hargaBeli, subtotal: lineSubtotal,
      });
      subtotal += lineSubtotal;
    }
    const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.05) : 0;
    const taxBase = subtotal - discount;
    const tax = TAX_CONFIG.ppnEnabled ? Math.round((taxBase * TAX_CONFIG.ppnRate) / 100) : 0;
    const total = taxBase + tax;
    const dayOffset = Math.floor(Math.random() * 7);
    const status = i <= 2 ? 'void_requested' : Math.random() > 0.95 ? 'voided' : 'completed';

    list.push({
      id: `t${i}`,
      code: `TRX-${new Date().getFullYear()}${String(i).padStart(4, '0')}`,
      createdAt: daysAgo(dayOffset),
      items, subtotal, discount, tax, total,
      method: METHODS[Math.floor(Math.random() * METHODS.length)]!,
      cashier: CASHIERS[Math.floor(Math.random() * CASHIERS.length)]!,
      memberName: Math.random() > 0.6 ? MEMBERS[Math.floor(Math.random() * MEMBERS.length)]!.name : 'Umum',
      status,
      change: 0,
      outletId: 'o1',
      shiftId: dayOffset === 0 ? 'active' : `sh-old-${dayOffset}`,
      voidReason: status === 'void_requested' ? 'Salah input qty' : status === 'voided' ? 'Pelanggan batal' : null,
      credit: false,
    });
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const TRANSACTIONS: Transaction[] = generateTransactions();
