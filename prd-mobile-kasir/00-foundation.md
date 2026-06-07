# 00 — Foundation (lintas peran)

Pondasi teknis yang berlaku untuk **semua** peran & layar mobile. Mengikat ke konvensi web yang sudah ada agar **web & mobile selaras**.

Referensi kode web yang menjadi acuan:
- Envelope respons: [`src/lib/api/response.ts`](../../src/lib/api/response.ts)
- Klien fetch web: [`src/lib/api/client.ts`](../../src/lib/api/client.ts)
- Tipe domain: [`src/types/owner.ts`](../../src/types/owner.ts)

---

## 1. Konvensi API (sama dengan web)

### 1.1 Envelope respons — `ApiResponse<T>`

Setiap respons (sukses/gagal) **wajib** memakai amplop ini (sudah dipakai web):

```ts
interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  errors: unknown;       // detail validasi; null bila tidak ada
  timestamp: string;     // ISO-8601
  path: string;          // pathname request
  status: number;        // mirror HTTP status
}
```

Helper server yang sudah ada & dipakai ulang: `apiSuccess`, `apiCreated`, `apiNoContent`, `apiBadRequest`, `apiUnauthorized`, `apiForbidden`, `apiNotFound`, `apiConflict`, `apiError`.

### 1.2 Daftar (list) — `PageResponse<T>`

```ts
interface PageResponse<T> {
  content: T[];
  metadata: {
    page: number; size: number; totalElements: number; totalPages: number;
    first: boolean; last: boolean; empty: boolean;
  };
}
```

Query param standar untuk endpoint berpaginasi: `?page=0&size=20&sort=createdAt,desc&q=...`. `page` berbasis-0 (samakan dengan helper `pageOf` web).

### 1.3 Base URL & vershioning

- Base: `https://<host>/api`
- Endpoint **khusus mobile/POS** diberi namespace agar tak bentrok dengan halaman web SSR:
  - `/api/auth/*` — autentikasi (dipakai web & mobile)
  - `/api/kasir/*` — operasi POS (mobile-first)
  - `/api/owner/*` — sudah ada (monitoring/manajemen); mobile memakai subset
  - `/api/admin/*` — sudah ada (SaaS); mobile memakai subset
- **Header versi:** `X-API-Version: 1`. Perubahan _breaking_ → naik versi.

---

## 2. Autentikasi & sesi (JWT — keputusan final)

Mobile **tidak** memakai cookie. Memakai **JWT email/password** (tanpa PIN di v1).

### 2.1 Token

| Token | Umur | Disimpan di | Isi klaim |
|-------|------|-------------|-----------|
| `accessToken` (JWT) | 15 menit | memori (Redux) | `sub` (userId), `role` (`owner`\|`kasir`\|`admin`), `tenantId`, `outletIds[]` (kasir), `permissions` (kasir), `exp`, `iat`, `jti` |
| `refreshToken` (opaque/rotating) | 30 hari | **`expo-secure-store`** | server-side session id |

**Klaim `permissions` (kasir)** = `KasirPermissions` dari [`src/types/owner.ts`](../../src/types/owner.ts): `canVoid`, `canDiscount`, `canViewShiftReport`, `canViewCostPrice` **+ tambahan `canManageMembers`** (kelola data member: add/edit/hapus — lihat tiket `FND-7`). Mobile menghormati klaim ini di UI; server **wajib** menegakkan ulang. Permission yang tak dikenal token lama → anggap `false` (default aman).

### 2.2 Flow

```
POST /api/auth/login {email, password, device}
  → 200 { accessToken, refreshToken, user }
  → 401 jika kredensial salah (apiUnauthorized)

POST /api/auth/refresh {refreshToken}
  → 200 { accessToken, refreshToken }   // rotasi: refreshToken lama di-revoke
  → 401 jika refresh invalid/expired → paksa login ulang

POST /api/auth/logout {refreshToken}    // revoke sesi device
GET  /api/auth/me                        // profil + role + permission terbaru
```

### 2.3 Header request mobile

```
Authorization: Bearer <accessToken>
X-API-Version: 1
X-Client: kasirmu-mobile/<appVersion> (<platform> <osVersion>)
X-Device-Id: <uuid persisten per device>
```

### 2.4 Interceptor refresh (mobile)

- Pada `401` dengan `errors.code = "TOKEN_EXPIRED"` → coba `refresh` sekali → ulangi request asli. Bila refresh gagal → logout & arahkan ke layar login.
- Hindari _refresh storm_: serialize refresh (single-flight); request lain menunggu hasil refresh yang sama.

### 2.5 Routing berdasarkan peran

Setelah login, arahkan berdasarkan `user.role`:
- `kasir` → stack **Kasir** (POS). Bila belum ada shift aktif → layar Buka Shift.
- `owner` → stack **Owner** (dashboard). Owner boleh masuk mode POS.
- `admin` → stack **Admin** (platform).

> **Catatan PIN (di luar v1):** tipe `Kasir.pin` (6-digit) tetap ada di domain. Untuk pergantian kasir cepat di satu tablet, R2 boleh menambah "kunci layar PIN" di atas sesi JWT yang sama. Tidak mengubah kontrak auth v1.

---

## 3. Offline-first & sinkronisasi

Landing page menjanjikan _"POS bekerja offline-first… otomatis sync begitu koneksi kembali"_. Berikut desain wajibnya.

### 3.1 Data yang di-cache lokal (read model)

Disimpan di SQLite lokal, di-refresh saat online & saat buka shift:
- Produk (termasuk `variants`, `uomConversions`, `wholesalePrices`), Kategori, UOM
- Outlet aktif & metode bayar + konfigurasi pajak (`TaxConfig`) + diskon (`DiscountConfig[]`)
- Member (untuk pencarian saat transaksi kredit)
- Shift aktif milik kasir

Setiap entitas cache menyimpan `serverUpdatedAt` untuk **delta sync** (`GET ...?updatedSince=<iso>`).

### 3.2 Data yang dibuat offline (write model / outbox)

Operasi yang boleh terjadi offline ditulis ke **outbox queue** lokal dengan status `pending` lalu dikirim berurutan saat online:

| Operasi | Idempotency key | Catatan |
|---------|-----------------|---------|
| Buka shift | `clientShiftId` (UUID) | Hanya 1 shift aktif/kasir/outlet |
| Tutup shift | `shiftId` | |
| Buat transaksi | `clientTxnId` (UUID) | **Stok diputuskan server** |
| Ajukan void | `clientTxnId` + `void` | |
| Catat pembayaran utang | `clientPaymentId` (UUID) | partial + alokasi FIFO |
| Tambah/Edit member | `clientMemberId` (UUID) | gated `canManageMembers` |
| Hapus member | `memberId` | gated `canManageMembers`; ditolak bila berpiutang |

### 3.3 Idempotency (wajib)

- Setiap operasi tulis mengirim **`Idempotency-Key`** header = UUID v4 yang **dibuat sekali** di device dan dipakai ulang pada setiap retry.
- Server menyimpan hasil per `Idempotency-Key` (min. 7 hari). Request ulang dengan key sama → **kembalikan respons asli** (200/201), **tidak** membuat data dobel.
- Body transaksi juga menyertakan `clientTxnId`; server menjadikan ini _unique constraint_.

### 3.4 Sumber kebenaran & resolusi konflik

Prinsip: **server otoritatif untuk uang & stok.**

1. **Total transaksi**: client mengirim item + qty + harga referensi; **server menghitung ulang** subtotal/diskon/pajak/total dari data master server. Bila beda dengan client > toleransi, server pakai nilai server & set `data.recalculated = true` (mobile tampilkan info, struk pakai nilai server).
2. **Stok**: server mengurangi stok saat transaksi diterima. Bila transaksi offline menyebabkan stok < 0:
   - Transaksi **tetap diterima** (uang sudah diterima pelanggan), status `completed`, tapi diberi flag `stockReview = true` + buat `StockMovement` yang menandai minus.
   - Owner mendapat alert "stok perlu ditinjau".
   *(Tidak menolak diam-diam — itu menghilangkan penjualan nyata.)*
3. **Master data (produk/harga)** berubah saat device offline: saat sync turun, mobile mengganti cache. Transaksi yang sudah ter-commit tidak berubah (harga historis disimpan di item transaksi).
4. **Shift**: jika server mendeteksi sudah ada shift aktif untuk kasir+outlet saat "buka shift" offline menyusul, kembalikan `409 CONFLICT` `SHIFT_ALREADY_OPEN` dengan data shift aktif; mobile gabungkan ke shift itu.

### 3.5 Status sync di UI

Indikator global (badge di header POS):
- 🟢 **Tersinkron** — outbox kosong, online.
- 🟡 **N menunggu** — ada item outbox `pending`/`sending`.
- 🔴 **Offline** — tidak ada koneksi; transaksi tetap bisa dibuat.
- ⚠️ **Perlu tinjauan** — ada item `needs_review` (mis. stok minus / recalculated besar).

### 3.6 Urutan sinkronisasi saat online kembali

```
1. refresh token bila perlu
2. PUSH outbox berurutan (shift open → transaksi → void → utang)
   - tiap item kirim dgn Idempotency-Key; sukses → tandai 'synced'
   - 4xx non-retryable → tandai 'needs_review' + simpan pesan
   - 5xx / network → biarkan 'pending', retry dengan backoff
3. PULL delta master (produk/stok/pengaturan) via updatedSince
4. update indikator
```

---

## 4. Error model

`errors` pada `ApiResponse` saat gagal validasi berisi:

```jsonc
{
  "code": "VALIDATION_ERROR",          // kode mesin (lihat tabel)
  "fields": { "email": "Format email tidak valid" }  // opsional, per-field
}
```

### Tabel kode error standar

| HTTP | `errors.code` | Makna | Aksi mobile |
|------|---------------|-------|-------------|
| 400 | `VALIDATION_ERROR` | Input tidak valid | Tampilkan per-field |
| 401 | `INVALID_CREDENTIALS` | Login salah | Pesan di form login |
| 401 | `TOKEN_EXPIRED` | Access token kedaluwarsa | Auto-refresh |
| 401 | `TOKEN_INVALID` | Token rusak/dicabut | Logout |
| 403 | `FORBIDDEN_ROLE` | Peran tak berhak | Sembunyikan fitur |
| 403 | `PERMISSION_DENIED` | Kasir tak punya permission (mis. void) | Tawarkan "minta approval" |
| 404 | `NOT_FOUND` | Entitas tak ada | Pesan + kembali |
| 409 | `SHIFT_ALREADY_OPEN` | Sudah ada shift aktif | Gabung ke shift aktif |
| 409 | `IDEMPOTENT_REPLAY` | (info) request ulang | Pakai respons asli |
| 409 | `STOCK_CONFLICT` | (opsional, jika kebijakan strict) | Tinjau item |
| 422 | `BUSINESS_RULE` | Aturan bisnis (mis. void > batas waktu) | Tampilkan alasan |
| 429 | `RATE_LIMITED` | Terlalu banyak request | Backoff |
| 500 | `INTERNAL` | Server error | Retry / lapor |

---

## 5. Konvensi data

- **Uang**: integer Rupiah (tanpa desimal), sama seperti tipe web (`hargaJual: number`). Jangan pakai float untuk akumulasi; jumlahkan integer.
- **Tanggal/waktu**: ISO-8601 UTC di API (`createdAt`); tampilkan di zona `Asia/Jakarta` (WIB). Mobile kirim `clientCreatedAt` (waktu device) untuk transaksi offline; server menyimpan keduanya.
- **ID**: string. Entitas server pakai id server; entitas offline pakai `client*Id` (UUID) sampai dikonfirmasi server, lalu mapping `clientTxnId → serverId` disimpan.
- **Enum** mengacu langsung ke `src/types/owner.ts`: `TransactionMethod = "tunai"|"qris"|"kartu"|"transfer"`, `TransactionStatus = "completed"|"void_requested"|"voided"`, `ShiftStatus`, `OutletStatus`, dll.
- **Bahasa**: pesan `message` untuk end-user dalam **Bahasa Indonesia**.

---

## 6. Perhitungan transaksi (kontrak hitung — wajib identik client & server)

Agar struk client = catatan server, urutan hitung dibakukan:

```
1. Per item:
   - tentukan harga satuan efektif:
       a. jika qty (dalam satuan dasar) >= tier grosir terpenuhi → pakai wholesalePrices tier minQty terbesar yang <= qty
       b. else jika varian dipilih → harga varian
       c. else jika UOM konversi dipilih → hargaJual UOM tsb (per unit konversi)
       d. else hargaJual produk (per satuan dasar)
   - subtotalItem = hargaSatuanEfektif * qty
2. subtotal = Σ subtotalItem
3. diskon:
   - diskon transaksi (DiscountConfig) berlaku jika subtotal >= minPurchase
   - type "percentage": diskonRp = round(subtotal * value/100)
   - type "fixed": diskonRp = value
   - diskon manual kasir (jika canDiscount) menimpa/menambah sesuai kebijakan (lihat KSR ticket)
4. dasarPajak = subtotal - diskon
5. pajak (TaxConfig):
   - jika ppnEnabled & !ppnIncluded: tax = round(dasarPajak * ppnRate/100); total = dasarPajak + tax
   - jika ppnEnabled & ppnIncluded: total = dasarPajak; tax = round(total - total/(1+ppnRate/100)) (info saja)
   - jika !ppnEnabled: tax = 0; total = dasarPajak
6. total = (lihat di atas)
7. kembalian (tunai) = dibayar - total
```

> Pembulatan: `round` = pembulatan setengah-ke-atas pada Rupiah. Konstanta toleransi rekonsiliasi client/server: ±Rp 0 (harus sama; bila beda → server menang, set `recalculated`).

---

## 7. Struktur project Expo (acuan)

```
apps/mobile/
  app/                      # Expo Router (file-based)
    (auth)/login.tsx
    (kasir)/                # stack kasir
      shift/open.tsx
      pos/index.tsx         # layar jualan utama
      pos/checkout.tsx
      receipt/[txnId].tsx
      shift/close.tsx
      history.tsx
    (owner)/
      dashboard.tsx
      approvals.tsx
      ...
    (admin)/
      ...
    _layout.tsx             # root: cek auth + route per role
  src/
    api/                    # apiClient + endpoints (mirror lib/api web)
    db/                     # SQLite schema + outbox + sync engine
    store/                  # Redux Toolkit slices (mirror web store)
    types/                  # re-export dari paket bersama @kasirmu/types
    components/             # UI (tombol besar, numpad, dll)
    print/                  # adapter printer thermal
  app.config.ts
```

**Paket bersama tipe** (`FND-2`): ekstrak `src/types/owner.ts` web ke paket `@kasirmu/types` (atau symlink/monorepo) sehingga **web & mobile memakai definisi yang sama**.

---

## 8. Non-fungsional

| Aspek | Target |
|-------|--------|
| Cold start app | ≤ 3 dtk di Android mid-range |
| Render daftar produk 1.000 SKU | 60 fps (virtualized list) |
| Ukuran transaksi offline tersimpan | ≥ 2.000 transaksi sebelum sync tanpa degradasi |
| Keamanan token | refresh token hanya di SecureStore; access token tak persist |
| Aksesibilitas | target sentuh ≥ 44pt; mode kontras tinggi; font scalable |
| Lokalisasi | id-ID default; format Rp & tanggal WIB |
| Observability | log sync error + crash (Sentry/Expo) tanpa data sensitif |

---

## 9. Tiket Foundation

### [FND-1] Endpoint autentikasi JWT (login/refresh/logout/me)
**Peran:** Semua · **Area:** Backend · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** Implementasi `/api/auth/login|refresh|logout|me` dengan JWT access (15m) + refresh rotating (30h, server-side store). Klaim memuat `role`, `tenantId`, `outletIds`, `permissions`. Mendukung dua mekanisme di backend bersama: cookie (web) **dan** Bearer (mobile).
**Acceptance Criteria:**
- [ ] Login benar → 201 `{accessToken, refreshToken, user}`; salah → 401 `INVALID_CREDENTIALS`.
- [ ] Refresh merotasi token & mencabut yang lama; refresh dicabut → 401.
- [ ] `me` mengembalikan role & permission terbaru (bukan dari token lama).
- [ ] Access token kedaluwarsa → 401 `TOKEN_EXPIRED`.
**Dependensi:** —
**Endpoint terkait:** `01-api-contract.md` §Auth

### [FND-2] Paket tipe bersama `@kasirmu/types`
**Peran:** Semua · **Area:** Backend+Mobile · **Fase:** R1 · **Estimasi:** S
**Deskripsi:** Ekstrak `src/types/owner.ts` (dan tipe envelope) menjadi paket yang di-_import_ web & mobile, sehingga kontrak data tunggal.
**Acceptance Criteria:**
- [ ] Web tetap kompilasi memakai paket bersama.
- [ ] Mobile meng-import tipe yang sama (`Transaction`, `Product`, `Shift`, dll).
- [ ] Perubahan tipe muncul di kedua app tanpa duplikasi.
**Dependensi:** —

### [FND-3] Klien API mobile + interceptor refresh + Idempotency
**Peran:** Semua · **Area:** Mobile · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** `apiClient` mobile (mirror `src/lib/api/client.ts`) dengan header Bearer/versi/device, single-flight refresh pada `TOKEN_EXPIRED`, dan penyisipan `Idempotency-Key` untuk operasi tulis.
**Acceptance Criteria:**
- [ ] Semua request membawa header standar (§2.3).
- [ ] 401 `TOKEN_EXPIRED` memicu 1× refresh lalu retry; gagal → logout.
- [ ] Operasi tulis menyertakan `Idempotency-Key` stabil lintas-retry.
- [ ] Respons selalu di-_unwrap_ dari `ApiResponse<T>` dengan penanganan `success=false`.
**Dependensi:** FND-1

### [FND-4] Mesin offline: SQLite cache + outbox + sync engine
**Peran:** Kasir (utama) · **Area:** Mobile · **Fase:** R1 · **Estimasi:** L
**Deskripsi:** Skema lokal (produk/kategori/uom/outlet/pengaturan/member/shift + outbox), delta-sync (`updatedSince`), push outbox berurutan dengan backoff, mapping `clientId→serverId`, indikator status sync.
**Acceptance Criteria:**
- [ ] Mematikan jaringan → transaksi tetap bisa dibuat & tersimpan `pending`.
- [ ] Menyalakan jaringan → outbox terkirim berurutan, jadi `synced`, tanpa duplikasi (uji retry).
- [ ] Delta pull memperbarui harga/stok master.
- [ ] Item gagal non-retryable → `needs_review` dengan pesan; tidak menghentikan antrian.
- [ ] Indikator status (🟢🟡🔴⚠️) akurat.
**Dependensi:** FND-3, BE-1 (transaksi), BE-2 (shift)

### [FND-5] Endpoint delta-sync master data
**Peran:** Kasir · **Area:** Backend · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** Tambah dukungan `?updatedSince=<iso>` pada produk/kategori/uom/pengaturan/member + sertakan `serverUpdatedAt` di payload, agar mobile bisa delta-sync.
**Acceptance Criteria:**
- [ ] Tanpa `updatedSince` → full set; dengan → hanya yang berubah/baru + yang dihapus (tombstone `deletedAt`).
- [ ] Setiap entitas punya `updatedAt` konsisten.
**Dependensi:** FND-2

### [FND-6] Migrasi mock → DB persisten (backend bersama)
**Peran:** Semua · **Area:** Backend · **Fase:** R1 · **Estimasi:** L
**Deskripsi:** Ganti store in-memory (`src/lib/api/owner/*`, `_mock/*`) dengan DB persisten (Postgres/Prisma disarankan) tanpa mengubah kontrak `ApiResponse`. Seed dari data mock agar web tetap jalan.
**Acceptance Criteria:**
- [ ] Endpoint web existing tetap lulus (respons identik bentuknya).
- [ ] Data bertahan lintas restart.
- [ ] Transaksi & stok punya constraint unik (`clientTxnId`) & transaksional (kurangi stok atomik).
**Dependensi:** FND-1
**Catatan:** Ini prasyarat integrasi nyata web↔mobile.

### [FND-7] Tambah permission `canManageMembers`
**Peran:** Owner/Kasir · **Area:** Backend+Mobile+Web · **Fase:** R2 · **Estimasi:** S
**Deskripsi:** Tambah field `canManageMembers: boolean` pada `KasirPermissions` ([`src/types/owner.ts`](../../src/types/owner.ts)) & sertakan di klaim JWT + `/auth/me`. Web (form kasir) mendapat toggle baru; default `false` untuk kasir lama. Server menegakkan permission ini pada endpoint `POST/PUT/DELETE /api/kasir/members*`.
**Acceptance Criteria:**
- [ ] Tipe `KasirPermissions` & form kasir web punya `canManageMembers`.
- [ ] Token & `/auth/me` membawa nilai permission ini.
- [ ] Kasir lama (tanpa field) diperlakukan `false`.
- [ ] Endpoint member CRUD kasir menolak (`403 PERMISSION_DENIED`) tanpa permission.
**Dependensi:** FND-1, FND-2 · **Endpoint:** `01-api-contract.md` §8

➡️ Lanjut ke [`01-api-contract.md`](./01-api-contract.md).
