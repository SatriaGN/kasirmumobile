# PRD — KasirMu Mobile (React Native / Expo)

> **Status:** Draft v1.0 · **Tanggal:** 2026-05-30 · **Owner dokumen:** Product
> **Platform target:** Android (tablet kasir & HP) + iOS · **Stack:** React Native (Expo SDK terbaru, Expo Router, TypeScript)

Dokumen ini adalah PRD lengkap untuk **aplikasi kasir mobile KasirMu**, pendamping aplikasi web yang sudah ada (`d:/projek/fajri/kasirmu`). Tujuan utama mobile adalah **menutup satu-satunya gap besar di web saat ini: pembuatan transaksi POS oleh kasir di lapangan** (buka/tutup shift, keranjang, bayar, cetak struk) — sambil tetap memberi Owner & Admin akses monitoring di genggaman.

---

## 0. Kenapa dokumen ini dipecah

Permintaan: _"HBS itu pecah per role, di setiap role suruh bikin tiket"_ dan _"pastikan web & mobile selaras dan terintegrasi"_. Maka struktur dokumen:

| File | Isi | Audiens |
|------|-----|---------|
| [`README.md`](./README.md) (ini) | Ringkasan, tujuan, ruang lingkup, arsitektur, matriks peran, peta navigasi | Semua |
| [`00-foundation.md`](./00-foundation.md) | Pondasi lintas-peran: autentikasi JWT, envelope respons, **offline-first & sync**, idempotency, error code, konvensi uang/tanggal, struktur project Expo | Engineering (BE + Mobile) |
| [`01-api-contract.md`](./01-api-contract.md) | **Kontrak API lengkap** semua endpoint mobile, request/response, mengikuti `ApiResponse<T>` & `PageResponse<T>` yang sudah ada di web | Engineering (BE + Mobile) |
| [`10-role-owner.md`](./10-role-owner.md) | Flow penuh peran **Owner** di mobile + **tiket** | Product, Eng, QA |
| [`20-role-kasir.md`](./20-role-kasir.md) | Flow penuh peran **Kasir** (inti POS) + **tiket** | Product, Eng, QA |
| [`30-role-admin.md`](./30-role-admin.md) | Flow peran **Admin platform** (SaaS superadmin) + **tiket** | Product, Eng, QA |

> Istilah **HBS** diperlakukan sebagai _"Halaman / Berkas / Screen per peran"_ — yaitu daftar layar + alur tiap peran. Jika maksud Anda HBS = Handlebars template, beri tahu; struktur dokumen tetap sama, hanya artefak keluaran tiket yang berubah.

---

## 1. Latar belakang & masalah

KasirMu adalah POS SaaS untuk UMKM Indonesia (warung, toko, F&B). Aplikasi **web** sekarang sudah punya:

- **Peran Owner** — cockpit kelola bisnis: dashboard, outlet, produk (varian/UOM/grosir), stok (in/out/opname), kasir & shift (monitoring), transaksi (monitoring + approve/reject void), member & piutang, keuangan (P/L), laporan, pengaturan (pajak, metode bayar, Midtrans, diskon), langganan.
- **Peran Admin** — superadmin platform SaaS: kelola tenant/owner, paket, langganan, pembayaran/invoice, refund, dashboard MRR.

**Yang BELUM ada di web:** UI untuk **kasir membuat transaksi**. Di kode web, modul transaksi hanya bisa _membaca_ dan _approve/reject void_ — tidak ada layar "buat transaksi". Inilah peran utama aplikasi mobile.

**Masalah yang diselesaikan mobile:**
1. Kasir butuh alat jualan cepat di tablet/HP, tahan internet putus (offline-first).
2. Owner butuh memantau & approve dari mana saja.
3. Admin butuh akses darurat ke kondisi platform dari ponsel.

---

## 2. Tujuan & sasaran (Goals)

| # | Tujuan | Metrik sukses |
|---|--------|---------------|
| G1 | Kasir bisa menyelesaikan 1 transaksi tunai < 15 detik dari buka keranjang → struk tercetak | p90 ≤ 15s |
| G2 | Transaksi tetap berjalan saat offline & ter-sync otomatis saat online | 0 transaksi hilang; konflik < 0,1% |
| G3 | Data web & mobile **selaras** (produk, stok, harga, shift, transaksi, member) | Sinkron < 5 detik saat online |
| G4 | Owner bisa approve void & lihat omzet realtime dari mobile | Aksi approve ≤ 3 tap |
| G5 | Paritas peran: Owner, Kasir, Admin semua bisa login di mobile | 3 peran lolos UAT |

**Non-goals (v1):** desain ulang web; fitur loyalty/poin lanjutan; multi-mata-uang; e-commerce/marketplace sync (tetap di web Pro); hardware selain printer thermal Bluetooth/USB & scanner.

---

## 3. Keputusan kunci (sudah dikonfirmasi)

| Topik | Keputusan | Implikasi |
|-------|-----------|-----------|
| **3 Peran** | **Owner, Kasir, Admin platform** (paritas penuh dengan web) | Satu app, routing per-peran berdasarkan klaim `role` di JWT |
| **Autentikasi** | **JWT email/password** (access + refresh), **tanpa PIN** | Pergantian kasir = logout/login. Field `pin` di tipe `Kasir` tidak dipakai mobile v1 (lihat catatan risiko di `00-foundation.md`) |
| **Cakupan** | **POS lengkap + offline-first & sync** | Perlu local DB (SQLite/WatermelonDB), outbox queue, idempotency key, konflik-resolusi |
| **API** | **Perluas API Next.js yang ada jadi backend bersama** | Endpoint kasir baru di bawah `/api/*` mengikuti envelope `ApiResponse<T>` / `PageResponse<T>`; mobile pakai header `Authorization: Bearer` (web tetap cookie) |

> ⚠️ **Catatan integrasi penting:** backend nyata **belum ada** — web masih memakai mock in-memory (`src/lib/api/owner/*`). PRD ini mengasumsikan endpoint-endpoint di [`01-api-contract.md`](./01-api-contract.md) akan **diimplementasikan nyata** (DB persisten) sebagai bagian dari proyek mobile, menggantikan mock. Tiket backend untuk ini ada di tiap file peran (prefix `BE-`).

---

## 4. Arsitektur tingkat tinggi

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Web (Next.js, cookie)   │         │  Mobile (Expo, JWT)      │
│  Owner cockpit + Admin   │         │  Owner · Kasir · Admin   │
└────────────┬─────────────┘         └────────────┬─────────────┘
             │  HTTPS /api (ApiResponse<T> envelope)             │
             └───────────────────┬───────────────────────────────┘
                                 ▼
              ┌─────────────────────────────────────────┐
              │  Backend bersama (Next.js Route Handlers │
              │  /app/api/**) — DB persisten             │
              │  Auth: cookie (web) + Bearer JWT (mobile)│
              └─────────────────────┬───────────────────┘
                                    ▼
                          ┌───────────────────┐
                          │  Database (Postgres │
                          │  /MySQL) + Midtrans │
                          └───────────────────┘

Mobile internal:
  Expo Router (file-based) ──> Screens per role
  Redux Toolkit (state)   ──> sama seperti web (@reduxjs/toolkit sudah dipakai)
  RTK Query / fetch wrapper ──> apiClient + Bearer + refresh interceptor
  SQLite (expo-sqlite / WatermelonDB) ──> cache + outbox antrian transaksi
  expo-secure-store ──> simpan refresh token
  expo-print / BLE printer lib ──> cetak struk thermal
```

**Prinsip keselarasan web ↔ mobile:**
- **Satu sumber tipe data.** Tipe domain di [`src/types/owner.ts`](../../src/types/owner.ts) jadi _source of truth_. Mobile meng-_import_ tipe yang sama lewat paket bersama (lihat ticket `FND-2`).
- **Satu envelope respons.** Semua endpoint balas `ApiResponse<T>` (lihat [`src/lib/api/response.ts`](../../src/lib/api/response.ts)); list pakai `PageResponse<T>`.
- **Stok & harga otoritatif di server.** Mobile menghitung total lokal untuk UX, tapi server **wajib** re-validasi & re-hitung saat transaksi masuk (anti manipulasi & anti race stok).

---

## 5. Matriks peran × kapabilitas (mobile)

Legenda: ✅ penuh · 🔶 terbatas/baca-saja · ➖ tidak ada di mobile v1

| Kapabilitas | Owner | Kasir | Admin |
|---|:--:|:--:|:--:|
| Login JWT | ✅ | ✅ | ✅ |
| Pilih outlet aktif | ✅ (semua) | 🔶 (hanya outlet assigned) | ➖ |
| **Buka/Tutup shift** | ✅ | ✅ | ➖ |
| **POS — buat transaksi** | ✅ | ✅ | ➖ |
| Pindai barcode | ✅ | ✅ | ➖ |
| Diskon transaksi | ✅ | 🔶 (jika `canDiscount`) | ➖ |
| Void transaksi | ✅ (langsung) | 🔶 (ajukan; butuh approval jika tanpa `canVoid`) | ➖ |
| **Approve/Reject void** | ✅ | ➖ | ➖ |
| Lihat harga modal (HPP) | ✅ | 🔶 (jika `canViewCostPrice`) | 🔶 |
| Cetak / kirim struk | ✅ | ✅ | ➖ |
| Member & piutang (kredit) | ✅ | 🔶 (utang otomatis saat checkout kredit) | ➖ |
| **Kelola member (tambah/edit/hapus)** | ✅ | 🔶 (jika `canManageMembers`) | ➖ |
| **Debt aging** (laporan umur piutang) | ✅ | 🔶 (lihat di konter) | ➖ |
| Bayar utang member (**partial**, FIFO) | ✅ | 🔶 (jika diizinkan) | ➖ |
| Laporan shift (X/Z report) | ✅ | 🔶 (jika `canViewShiftReport`) | ➖ |
| Dashboard omzet realtime | ✅ | 🔶 (shift sendiri) | ✅ (platform) |
| Kelola produk/stok | 🔶 (stok cepat: opname/in-out) | ➖ | ➖ |
| Kelola kasir | ✅ | ➖ | ➖ |
| Pengaturan toko (pajak/bayar) | ✅ | ➖ | ➖ |
| Kelola tenant/paket/langganan | ➖ | ➖ | ✅ |
| Pembayaran/invoice/refund (SaaS) | ➖ | ➖ | ✅ |

> Permission Kasir (`canVoid`, `canDiscount`, `canViewShiftReport`, `canViewCostPrice`) sudah ada di tipe [`Kasir.permissions`](../../src/types/owner.ts) dan **harus dihormati** oleh mobile + ditegakkan ulang di server. PRD ini **menambah** `canManageMembers` (kelola data member) — lihat tiket `FND-7`.

---

## 6. Persona

- **Sari, Kasir** — 24 th, pakai tablet Android di konter warung. Butuh cepat, tahan sinyal jelek, tombol besar, struk langsung cetak.
- **Pak Ahmad, Owner** — 3 outlet, sering keliling. Buka mobile untuk cek omzet harian & approve void dari motor/rumah.
- **Dimas, Admin platform** — tim KasirMu. Sesekali butuh cek dari HP: ada pembayaran gagal? ada owner mau aktivasi?

---

## 7. Ringkasan ruang lingkup rilis

| Fase | Isi | Peran utama |
|------|-----|-------------|
| **MVP (R1)** | Auth JWT + refresh, pilih outlet, **shift buka/tutup**, **POS keranjang + varian + grosir + diskon + pajak**, bayar **tunai/QRIS(manual)**, cetak struk, **offline-first + sync**, void (ajukan/approve), laporan shift Z. | Kasir, Owner |
| **R2** | Midtrans (QRIS dinamis/VA), member & piutang penuh (**debt aging + pembayaran partial FIFO**), kirim struk WA/email, dashboard Owner realtime, stok cepat (opname/in-out) di mobile. | Kasir, Owner |
| **R3** | Admin platform di mobile (tenant, langganan, pembayaran, refund), notifikasi push, multi-device sync lanjutan. | Admin |

Detail tiket per fase ada di masing-masing file peran.

---

## 8. Risiko & mitigasi (ringkas)

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Backend nyata belum ada (web masih mock) | Mobile tak bisa integrasi nyata | Tiket `BE-*` membangun endpoint + DB persisten dulu; mock dipakai untuk dev paralel |
| Tanpa PIN → pergantian kasir lambat di 1 tablet | UX kasir | Sesi JWT panjang + "switch user" cepat (cache kredensial device, re-auth password); pertimbangkan PIN di R2 (field sudah ada) |
| Konflik stok saat offline (oversell) | Stok minus | Server otoritatif; saat sync, transaksi yang bikin stok minus ditandai `needs_review`, bukan ditolak diam-diam |
| Idempotency saat retry sync | Transaksi dobel | `clientTxnId` (UUID) unik + endpoint idempoten (lihat `00-foundation.md` §Idempotency) |
| Keamanan harga/diskon dimanipulasi di client | Kebocoran margin | Server re-hitung total & validasi permission, abaikan total dari client |

---

## 9. Cara membaca tiket

Setiap tiket memakai format konsisten:

```
### [PREFIX-NN] Judul ringkas
**Peran:** Owner | Kasir | Admin · **Area:** Mobile | Backend · **Fase:** R1|R2|R3 · **Estimasi:** S/M/L
**Deskripsi:** ...
**Acceptance Criteria:**
- [ ] kriteria 1 (Given/When/Then bila perlu)
**Dependensi:** [TIKET-LAIN]
**Endpoint terkait:** lihat 01-api-contract.md §...
```

Prefix tiket: `FND-` (foundation), `BE-` (backend/API), `OWN-` (Owner), `KSR-` (Kasir), `ADM-` (Admin), `QA-` (testing lintas).

➡️ Lanjut ke [`00-foundation.md`](./00-foundation.md).
