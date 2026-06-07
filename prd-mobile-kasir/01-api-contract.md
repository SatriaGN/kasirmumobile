# 01 — API Contract (Mobile Kasir ↔ Backend)

> **Ruang lingkup.** Dokumen ini mendeskripsikan kontrak untuk **aplikasi mobile Kasir**. Aplikasi saat ini **kasir-only**: tidak ada layar Owner/Admin di mobile. Satu-satunya `role` yang dipakai klien adalah **`kasir`**. Endpoint monitoring Owner & platform Admin **di luar cakupan** kontrak ini.

Semua endpoint **memakai envelope `ApiResponse<T>`**. Untuk keringkasan, blok JSON di bawah menampilkan **`data`** saja kecuali disebutkan; bentuk penuh selalu:

```jsonc
{ "success": true, "message": "Operation successful", "data": <T>, "errors": null, "timestamp": "...", "path": "...", "status": 200 }
```

**Konvensi umum**
- Header mobile wajib: `Authorization: Bearer …`, `X-API-Version: 1`, `X-Device-Id`, `X-Client`. (lihat [`00-foundation.md`](./00-foundation.md) §2.3)
- Operasi tulis offline-able: header `Idempotency-Key: <uuid>`.
- List berpaginasi: `?page=&size=&sort=&q=` → `PageResponse<T>`.
- Tipe (`Product`, `Transaction`, `Shift`, `Member`, dst.) merujuk **persis** ke tipe modular di `src/features/<domain>/types/<domain>.type.ts`. Referensi spesifik dicantumkan per-seksi. Primitif (`Rupiah`, `ISODateString`, `ISODate`) di [`src/shared/types/common.ts`](../../src/shared/types/common.ts).

Daftar isi:
1. [Auth](#1-auth) · 2. [Bootstrap & Sync](#2-bootstrap--sync) · 3. [Outlet & Pengaturan](#3-outlet--pengaturan) · 4. [Katalog (Produk/Kategori/UOM)](#4-katalog) · 5. [Shift](#5-shift) · 6. [Transaksi / POS](#6-transaksi--pos) · 7. [Pembayaran (Midtrans)](#7-pembayaran-midtrans) · 8. [Member & Piutang](#8-member--piutang) · 9. [Ringkasan endpoint](#9-ringkasan-endpoint)

---

## 1. Auth

> Tipe: `User`, `Permissions`, `Role` ([`src/features/auth/types/auth.type.ts`](../../src/features/auth/types/auth.type.ts)). `Role` = `"kasir"` (satu-satunya nilai di mobile). Permission flags: `canVoid`, `canDiscount`, `canViewShiftReport`, `canViewCostPrice`, `canManageMembers`.

### POST `/api/auth/login`
**Body**
```jsonc
{ "email": "sari@toko.id", "password": "•••", "device": { "id": "uuid", "name": "Tablet Konter 1", "platform": "android" } }
```
**200**
```jsonc
{
  "accessToken": "eyJ…",
  "refreshToken": "rt_…",
  "user": {
    "id": "u-kasir", "name": "Sari", "email": "sari@toko.id",
    "role": "kasir",
    "tenantId": "t1",
    "outletIds": ["o1"],             // outlet yg di-assign ke kasir
    "permissions": { "canVoid": false, "canDiscount": true, "canViewShiftReport": true, "canViewCostPrice": false, "canManageMembers": true },
    "avatar": "SR", "avatarBg": "#E6F1FB"
  }
}
```
> Field `password` pada tipe `User` hanya untuk demo lokal (mock); auth nyata tidak pernah mengembalikan/menyimpan password di klien.

**Error:** 401 `INVALID_CREDENTIALS`; 400 `VALIDATION_ERROR`.

### POST `/api/auth/refresh`
**Body** `{ "refreshToken": "rt_…" }` → **200** `{ "accessToken", "refreshToken" }` (rotasi). 401 `TOKEN_INVALID`.

### POST `/api/auth/logout`
**Body** `{ "refreshToken": "rt_…" }` → **200** `null` (sesi device dicabut).

### GET `/api/auth/me`
**200** → objek `user` (sama seperti di login; permission **terbaru**).

---

## 2. Bootstrap & Sync

> Tipe sync/offline: `OutboxItem`, `SyncStatus` ([`src/features/sync/types/sync.type.ts`](../../src/features/sync/types/sync.type.ts)). Klien menyimpan transaksi yang belum terkirim di **outbox** dan menandainya `pending|sending|synced|needs_review`.

### GET `/api/kasir/bootstrap`
Satu panggilan untuk mengisi cache awal saat login/buka shift.
**Query:** `?outletId=o1`
**200**
```jsonc
{
  "outlet": { /* Outlet */ },
  "settings": {
    "tax": { "ppnEnabled": true, "ppnRate": 11, "ppnIncluded": false },   // TaxConfig
    "paymentMethods": [ /* PaymentMethod[] */ ],
    "discounts": [ /* Discount[] (isActive saja) */ ]
  },
  "activeShift": { /* Shift | null */ },
  "serverTime": "2026-05-30T03:00:00Z",
  "catalogVersion": "2026-05-30T02:55:00Z"   // updatedSince untuk delta berikutnya
}
```

### GET `/api/kasir/sync?updatedSince=<iso>&outletId=o1`
Delta master data untuk offline cache.
**200**
```jsonc
{
  "products": { "upserted": [ /* Product[] */ ], "deleted": ["p9"] },
  "categories": { "upserted": [ /* Category[] */ ], "deleted": [] },
  "uom":        { "upserted": [ /* Uom[] */ ], "deleted": [] },
  "members":    { "upserted": [ /* Member[] */ ], "deleted": [] },
  "settings":   { /* sama struktur §bootstrap.settings, atau null jika tak berubah */ },
  "stock":      { "upserted": [ /* {productId, outletId, stokSaat, stokMinimum, updatedAt} */ ], "deleted": [] },
  "catalogVersion": "2026-05-30T03:05:00Z"
}
```
> Setiap entitas membawa `updatedAt`. `deleted` = tombstone (id yang dihapus/dinonaktifkan).

---

## 3. Outlet & Pengaturan

> Tipe: `Outlet` ([`src/features/outlet/types/outlet.type.ts`](../../src/features/outlet/types/outlet.type.ts)); `TaxConfig`, `PaymentMethod`, `Discount` ([`src/features/catalog/types/catalog.type.ts`](../../src/features/catalog/types/catalog.type.ts)).

### GET `/api/kasir/outlets`
Outlet yang boleh diakses kasir (hanya `outletIds` pada user). Dipakai layar **Pilih Outlet**.
**200** → `Outlet[]`.

### GET `/api/kasir/settings?outletId=o1`
Pengaturan yang dipakai POS: `tax`, `paymentMethods`, `discounts`.
**200**
```jsonc
{ "tax": { /* TaxConfig */ }, "paymentMethods": [ /* PaymentMethod[] */ ], "discounts": [ /* Discount[] */ ] }
```
> Identik dengan `settings` pada `/api/kasir/bootstrap`. Disediakan terpisah untuk refresh tanpa bootstrap penuh.

---

## 4. Katalog

> Tipe: `Product`, `Category`, `Uom`, `ProductVariant`, `UomConversion`, `WholesaleTier` ([`src/features/catalog/types/catalog.type.ts`](../../src/features/catalog/types/catalog.type.ts)).

### GET `/api/kasir/products`
**Query:** `?outletId=&q=&categoryId=&page=&size=&updatedSince=`
**200** → `PageResponse<Product>` (atau `Product[]` bila tanpa paginasi).
> `Product` memuat `variants`, `uomConversions`, `wholesalePrices`, `stokSaat`, `stokMinimum`, `hargaJual`, `hargaBeli`, `barcode`, `image` (emoji di demo). Field **`hargaBeli` dihilangkan dari payload** bila kasir tidak punya `canViewCostPrice`.

### GET `/api/kasir/products/{id}` → **200** `Product`.

### GET `/api/kasir/products/lookup?barcode=8991…&outletId=o1`
Pindai barcode → produk + varian cocok.
**200** `{ "product": Product, "matchedVariantId": "v2" | null }` · 404 `NOT_FOUND`.

### GET `/api/kasir/categories` → **200** `Category[]`.
### GET `/api/kasir/uom` → **200** `Uom[]`.

---

## 5. Shift

> Tipe: `Shift`, `ZReport`, `ByMethodTotals`, `ClosedShiftSummary` ([`src/features/shift/types/shift.type.ts`](../../src/features/shift/types/shift.type.ts)). `Shift.status` = `"active" | "closed"`.

### POST `/api/kasir/shifts/open`  *(idempoten)*
**Headers:** `Idempotency-Key`
**Body**
```jsonc
{ "clientShiftId": "uuid", "outletId": "o1", "kasAwal": 200000, "clientOpenedAt": "2026-05-30T08:00:00Z" }
```
**201** → `Shift` (`status:"active"`).
**409 `SHIFT_ALREADY_OPEN`** → `data: { activeShift: Shift }` (mobile gabung ke shift ini).

### GET `/api/kasir/shifts/active?outletId=o1` → **200** `Shift | null`.

### POST `/api/kasir/shifts/{id}/close`  *(idempoten)*
**Body**
```jsonc
{ "kasAkhir": 1250000, "clientClosedAt": "2026-05-30T16:00:00Z", "keterangan": "ada kembalian kurang Rp 5.000" }
```
> `keterangan` **opsional** (catatan tutup shift; field `Shift.keterangan`). Tutup shift di-blok oleh klien bila masih ada transaksi tertahan (hold).

**200**
```jsonc
{
  "shift": { /* Shift: closedAt, kasAkhir, keterangan?, status:"closed", zReport */ },
  "zReport": {                       // ringkasan tutup shift (Z-report) = tipe ZReport
    "kasAwal": 200000, "kasAkhir": 1250000, "expectedCash": 1255000, "selisih": -5000,
    "totalOmzet": 1480000, "txnCount": 37, "voidCount": 1,
    "byMethod": { "tunai": 1055000, "qris": 425000, "kartu": 0, "transfer": 0 },
    "discountTotal": 35000, "taxTotal": 146000
  }
}
```
> `expectedCash = kasAwal + penjualan tunai`. `selisih = kasAkhir − expectedCash`. Klien membentuk `ClosedShiftSummary = Shift & ZReport` untuk layar ringkasan.

### GET `/api/kasir/shifts/{id}/report` → **200** objek `ZReport` di atas (X-report tengah shift / cetak ulang).

---

## 6. Transaksi / POS

> Inti aplikasi. Tipe: `Transaction`, `TransactionItem`, `TransactionStatus`, `VoidResult` ([`src/features/transactions/types/transactions.type.ts`](../../src/features/transactions/types/transactions.type.ts)); `CartLine`, `ManualDiscount`, `HeldOrder` ([`src/features/pos/types/pos.type.ts`](../../src/features/pos/types/pos.type.ts)). `TransactionStatus` = `"completed" | "voided" | "void_requested"`.

> **Catatan hold/resume.** Penangguhan transaksi (`HeldOrder`) saat ini **lokal di perangkat** (belum disinkronkan ke server). Tidak ada endpoint hold; bagian ini hanya mencakup pembuatan transaksi & void.

### POST `/api/kasir/transactions`  *(idempoten — inti)*
**Headers:** `Idempotency-Key: <uuid = clientTxnId>`
**Body** (client mengirim niat; **server menghitung ulang & otoritatif**):
```jsonc
{
  "clientTxnId": "uuid",
  "shiftId": "s1",
  "outletId": "o1",
  "clientCreatedAt": "2026-05-30T09:14:22Z",
  "items": [
    {
      "productId": "p1",
      "variantId": "v2",          // opsional
      "uomConversionId": null,     // opsional (jual per kardus, dll)
      "qty": 3,                    // dalam satuan terpilih
      "unitPriceRef": 15000,       // harga yg ditampilkan ke pelanggan (referensi; server validasi)
      "note": "tanpa gula"         // opsional
    }
  ],
  "discount": { "configId": "d1" },               // diskon dari Discount config; atau:
  "manualDiscount": { "type": "fixed", "value": 5000 },  // ManualDiscount, butuh canDiscount
  "method": "tunai",                          // PaymentMethodKey: tunai|qris|kartu|transfer
  "cashReceived": 50000,                       // wajib jika tunai
  "member": { "memberId": "m1" },             // opsional
  "credit": false                              // true = utang (butuh member.canCredit)
}
```
> `ManualDiscount` hanya punya `type` (`percentage`/`fixed`) dan `value` — tidak ada field `reason`.

**201**
```jsonc
{
  "transaction": { /* Transaction lengkap: code, items[ {subtotal,hargaJual,hargaBeli?} ], subtotal, discount, tax, total, method, cashReceived, change, cashier, memberName, memberId?, credit, status:"completed", createdAt, outletId?, outletName?, shiftId */ },
  "change": 5600,                   // kembalian (tunai)
  "recalculated": false,            // true jika server mengoreksi total client
  "stockReview": false,             // true jika menyebabkan stok minus (offline late-sync)
  "receipt": { "receiptNo": "TRX-20260530-001", "printPayload": { /* lihat §6.3 */ } }
}
```
> Field `synced` pada `Transaction` adalah penanda klien (true bila tercatat online; bila offline → masuk outbox sebagai `pending`).

**Error:**
- 400 `VALIDATION_ERROR` (mis. tunai tanpa `cashReceived` cukup).
- 403 `PERMISSION_DENIED` (manualDiscount tanpa `canDiscount`).
- 409 `IDEMPOTENT_REPLAY` → kembalikan transaksi asli (status 200).
- 422 `BUSINESS_RULE` (mis. `credit:true` tapi member tak boleh kredit; shift sudah closed).

### GET `/api/kasir/transactions`
Riwayat transaksi (default: shift aktif / kasir login). Sumber layar **Riwayat**.
**Query:** `?shiftId=&outletId=&dateFrom=&dateTo=&status=&q=&page=&size=`
**200** → `PageResponse<Transaction>`.

### GET `/api/kasir/transactions/{id}` → **200** `Transaction`.

### POST `/api/kasir/transactions/{id}/void-request`  *(idempoten)*
Kasir mengajukan / langsung void (tergantung permission). Sesuai `voidTransaction` → `VoidResult`.
**Body** `{ "reason": "salah input qty" }`
**200**
```jsonc
{ "transaction": { /* status: "voided" jika canVoid; else "void_requested", voidReason, voidedAt? */ }, "requiresApproval": true }
```
- Jika `permissions.canVoid` → langsung `voided` (stok dikembalikan), `requiresApproval:false`.
- Else → `void_requested`, menunggu persetujuan (diproses backend/owner di luar mobile kasir). Pengajuan selalu boleh.

> Persetujuan/penolakan void (`approve`/`reject`) ditangani di sisi backend/Owner — **bukan** layar mobile kasir. Klien hanya menampilkan status terkini (`voided`/`completed`/`void_requested`) yang diterima via sync.

### 6.3 `printPayload` (struk)
Bentuk netral untuk dirender printer thermal / PDF / WA:
```jsonc
{
  "store": { "name": "Wijaya Mart - Darmo", "address": "...", "phone": "...", "logoUrl": "..." },
  "receiptNo": "TRX-20260530-001",
  "datetime": "2026-05-30T09:14:22Z",
  "kasir": "Sari", "outlet": "Darmo",
  "items": [ { "name": "Kopi Susu (M) x3", "qty": 3, "price": 15000, "amount": 45000 } ],
  "subtotal": 45000, "discount": 5000, "taxLabel": "PPN 11%", "tax": 4400, "total": 44400,
  "payment": { "method": "tunai", "received": 50000, "change": 5600 },
  "member": "Budi (Gold)",
  "footer": "Terima kasih telah berbelanja!"
}
```

---

## 7. Pembayaran (Midtrans) — R2

> **Belum diimplementasi di app.** QRIS/transfer saat ini bersifat manual (tampilkan gambar QR/rekening dari settings — tidak perlu endpoint). Bagian ini direncanakan untuk rilis berikutnya (R2). Mengacu `PaymentMethod` (`catalog.type.ts`).

### POST `/api/kasir/payments/charge`  *(idempoten)*
Untuk QRIS dinamis / VA Midtrans.
**Body**
```jsonc
{ "clientTxnId": "uuid", "outletId": "o1", "amount": 44400, "method": "qris", "vaBank": "bca" }
```
**201**
```jsonc
{ "paymentId": "pay_…", "status": "pending",
  "qris": { "qrString": "...", "expiresAt": "..." },
  "va": null }
```

### GET `/api/kasir/payments/{paymentId}/status` → **200** `{ "status": "pending|settlement|expire|cancel|deny" }` (polling/webhook-backed).

### POST `/api/webhooks/midtrans` *(server-only, dari Midtrans)* — update status → push ke device via notifikasi/poll. Bukan dipanggil mobile.

---

## 8. Member & Piutang

> Tipe: `Member`, `MemberType`, `MemberForm`, `MemberStatus` ([`src/features/members/types/members.type.ts`](../../src/features/members/types/members.type.ts)); `DebtRecord`, `DebtAllocation`, `DebtStatus`, `DebtorSummary` ([`src/features/debt/types/debt.type.ts`](../../src/features/debt/types/debt.type.ts)).

### 8.0 Model utang & aging

`DebtRecord` adalah ledger dengan dua jenis entri:
- `type: "debt"` → memuat `amount`, `outstanding` (sisa belum terbayar; mulai = amount), `status` (`open|partial|paid`), dan `dueDate?` (`"YYYY-MM-DD"`; bila tidak ada, aging dihitung dari `createdAt`).
- `type: "payment"` → memuat `amount`, `method?` (`tunai|qris|kartu|transfer`), dan `allocations?` (`{ debtRecordId, amount }[]` — ke utang mana pembayaran dialokasikan).

**Aging:** umur hari = `today − (dueDate ?? tanggal utang)`. Bucket aging di klien: **0-7 / 8-14 / 15-30 / 30+** hari (lihat `agingBucket` di `src/shared/utils/format`).

**Alokasi pembayaran (FIFO):** pembayaran melunasi entri `debt` **tertua dulu** (urut `dueDate` lalu `createdAt`) sampai nominal habis. Boleh override via `targetDebtRecordIds`.

### GET `/api/kasir/members?q=budi&outletId=o1`
Cari/daftar member (untuk dilampirkan ke transaksi **atau** dikelola). Filter: `?q=&memberTypeId=&status=&page=&size=`.
**200** → `PageResponse<Member>` (`canCredit`, `totalDebt`, `memberTypeName`).

### GET `/api/kasir/members/{id}` → **200** `Member`. 404 `NOT_FOUND`.

### GET `/api/kasir/member-types` → **200** `MemberType[]` (`canCredit`, `tenorDays`; untuk dropdown saat add/edit member).

> **CRUD member oleh Kasir** di-gate permission **`canManageMembers`**. Tanpa permission → `403 PERMISSION_DENIED`. Pencarian/lampir member ke transaksi **tidak** di-gate. Mutasi idempoten & offline-able (`clientMemberId`). `MemberType` **read-only** untuk Kasir.

### POST `/api/kasir/members`  *(buat — gated `canManageMembers`)*  *(idempoten)*
**Headers:** `Idempotency-Key`
**Body** `MemberForm` + `clientMemberId`:
```jsonc
{ "clientMemberId": "uuid", "name": "Budi", "phone": "0812…", "email": "", "address": "", "memberTypeId": "mt1", "status": "active" }
```
**201** → `Member` (server menetapkan `canCredit`/`memberTypeName` dari tipe; `totalDebt:0`).
**Error:** 400 `VALIDATION_ERROR` (nama/telepon wajib); 403 `PERMISSION_DENIED`; 422 `BUSINESS_RULE` (tipe member tak valid).

### PUT `/api/kasir/members/{id}`  *(edit — gated `canManageMembers`)*  *(idempoten)*
**Body** `MemberForm` (tanpa `clientMemberId`).
**200** → `Member` (server me-resync `canCredit`/`memberTypeName` dari `memberTypeId` baru).
**Error:** 403 `PERMISSION_DENIED`; 404 `NOT_FOUND`; 422 `BUSINESS_RULE` (tipe tak valid).

### DELETE `/api/kasir/members/{id}`  *(hapus — gated `canManageMembers`)*
**200** → `null` (`apiNoContent`).
**Error:**
- 403 `PERMISSION_DENIED` (tanpa `canManageMembers`).
- 404 `NOT_FOUND`.
- **422 `BUSINESS_RULE`** bila `totalDebt > 0` → message `"Member masih memiliki piutang aktif"` (arahkan lunasi dulu via menu Piutang).

### GET `/api/kasir/debtor` → **200** `DebtorSummary[]`
Daftar member berpiutang beserta `records` (entri debt/payment). `DebtorSummary` = `Member & { records: DebtRecord[] }`. Sumber layar **Piutang**.

### GET `/api/kasir/debtor/{memberId}` → **200** detail satu debitur
```jsonc
{
  "member": { /* Member */ },
  "records": [ { "id":"d1","type":"debt","amount":150000,"outstanding":50000,"dueDate":"2026-05-20","status":"partial","createdAt":"..." } ],
  "aging": {
    "totalOutstanding": 50000,
    "buckets": { "0-7": 0, "8-14": 50000, "15-30": 0, "30+": 0 },
    "oldestDueDate": "2026-05-20",
    "overdueAmount": 50000
  }
}
```

### POST `/api/kasir/debtor/payment`  *(idempoten — mendukung partial + alokasi FIFO)*
Sesuai `payDebt(memberId, amount, method?, targetIds?)` → `PayDebtResult`.
**Headers:** `Idempotency-Key`
**Body**
```jsonc
{
  "memberId": "m1",
  "amount": 50000,                 // boleh < totalDebt (partial) — divalidasi tak melebihi total
  "method": "tunai",               // opsional: tunai|qris|kartu|transfer
  "note": "cicilan ke-2",
  "targetDebtRecordIds": ["d1"],   // opsional: override FIFO, bayar utang tertentu dulu
  "clientPaymentId": "uuid"        // idempotency offline
}
```
**201**
```jsonc
{
  "payment": { "id":"p9","type":"payment","amount":50000,"method":"tunai","allocations":[{"debtRecordId":"d1","amount":50000}],"createdAt":"..." },
  "allocations": [ { "debtRecordId":"d1","applied":50000,"remainingOutstanding":0,"status":"paid" } ],
  "memberTotalDebtAfter": 300000,
  "fullyPaid": false                // true jika totalDebt member jadi 0
}
```
**Error:** 400 `VALIDATION_ERROR` (`amount<=0`); 422 `BUSINESS_RULE` (melebihi total piutang / `targetDebtRecordIds` bukan milik member). Tak boleh **melebihi** total utang.

> **Partial = bayar sebagian.** `amount` < total → entri debt yang dialokasi jadi `status:"partial"` (outstanding > 0) atau `paid` (outstanding = 0). FIFO otomatis bila `targetDebtRecordIds` kosong.

> Pencatatan **utang** (type `debt`) terjadi **otomatis** saat transaksi dibuat dengan `credit:true`. Server menetapkan `outstanding = amount`, `status="open"`, dan `dueDate` dari tenor `MemberType` (`tenorDays`) bila ada, jika tidak `null`. Tidak ada endpoint tambah utang manual dari mobile.

---

## 9. Ringkasan endpoint

| Metode | Path | Status | Idempoten |
|--------|------|--------|:--:|
| POST | `/api/auth/login` | inti | — |
| POST | `/api/auth/refresh` | inti | — |
| POST | `/api/auth/logout` | inti | — |
| GET | `/api/auth/me` | inti | — |
| GET | `/api/kasir/bootstrap` | inti | — |
| GET | `/api/kasir/sync` | inti | — |
| GET | `/api/kasir/outlets` | inti | — |
| GET | `/api/kasir/settings` | inti | — |
| GET | `/api/kasir/products` | inti | — |
| GET | `/api/kasir/products/{id}` | inti | — |
| GET | `/api/kasir/products/lookup` | inti | — |
| GET | `/api/kasir/categories` | inti | — |
| GET | `/api/kasir/uom` | inti | — |
| POST | `/api/kasir/shifts/open` | inti | ✅ |
| GET | `/api/kasir/shifts/active` | inti | — |
| POST | `/api/kasir/shifts/{id}/close` | inti | ✅ |
| GET | `/api/kasir/shifts/{id}/report` | inti | — |
| POST | `/api/kasir/transactions` | inti | ✅ |
| GET | `/api/kasir/transactions` | inti | — |
| GET | `/api/kasir/transactions/{id}` | inti | — |
| POST | `/api/kasir/transactions/{id}/void-request` | inti | ✅ |
| GET | `/api/kasir/members` | inti | — |
| GET | `/api/kasir/members/{id}` | inti | — |
| GET | `/api/kasir/member-types` | inti | — |
| POST | `/api/kasir/members` | gated `canManageMembers` | ✅ |
| PUT | `/api/kasir/members/{id}` | gated `canManageMembers` | ✅ |
| DELETE | `/api/kasir/members/{id}` | gated `canManageMembers` (blok jika berpiutang) | — |
| GET | `/api/kasir/debtor` | inti | — |
| GET | `/api/kasir/debtor/{memberId}` | inti (+aging) | — |
| POST | `/api/kasir/debtor/payment` | inti (partial + FIFO) | ✅ |
| POST | `/api/kasir/payments/charge` | R2 (Midtrans) | ✅ |
| GET | `/api/kasir/payments/{id}/status` | R2 (Midtrans) | — |

➡️ Lanjut: [`20-role-kasir.md`](./20-role-kasir.md) · [`00-foundation.md`](./00-foundation.md).
