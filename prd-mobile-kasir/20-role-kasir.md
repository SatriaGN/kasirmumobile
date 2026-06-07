# 20 — Peran KASIR (inti POS mobile)

> Peran utama aplikasi. Menutup gap web (tidak ada UI buat-transaksi). Kasir adalah operator di tablet/HP konter.
> Acuan permission: [`Kasir.permissions`](../../src/types/owner.ts) → `canVoid`, `canDiscount`, `canViewShiftReport`, `canViewCostPrice`.

---

## A. Tujuan peran

Kasir bisa: login → buka shift → jualan cepat (scan/cari, varian, grosir, diskon, member) → bayar (tunai/QRIS/kartu/transfer) → cetak struk → (ajukan) void → tutup shift dengan rekonsiliasi kas. **Semua tahan offline.** Bila diberi izin (`canManageMembers`), kasir juga bisa **kelola data member (tambah/edit/hapus)** & menerima cicilan piutang.

## B. Daftar layar (HBS Kasir)

| Kode | Layar | Ringkas |
|------|-------|---------|
| K-S01 | **Login** | Email+password (JWT) |
| K-S02 | **Pilih Outlet** | Hanya jika kasir di-assign > 1 outlet |
| K-S03 | **Buka Shift** | Input kas awal |
| K-S04 | **POS / Katalog** | Grid produk, search, scan, kategori, keranjang |
| K-S05 | **Detail Item** | Pilih varian/UOM, qty, catatan, harga grosir auto |
| K-S06 | **Keranjang** | Ringkasan, diskon, pilih member, kredit |
| K-S07 | **Checkout / Bayar** | Pilih metode, numpad tunai, QRIS, hitung kembalian |
| K-S08 | **Struk** | Pratinjau, cetak ulang, kirim WA/email |
| K-S09 | **Riwayat Transaksi** | Daftar shift ini; tap → detail; void |
| K-S10 | **Void** | Form alasan; langsung/ajukan sesuai permission |
| K-S11 | **Tutup Shift** | Input kas akhir → Z-report → cetak |
| K-S12 | **Status Sinkronisasi** | Daftar outbox, item perlu tinjauan |
| K-S13 | **Profil/Logout** | Info kasir, ganti user |
| K-S14 | **Piutang & Aging** | Daftar member berutang + bucket umur (0-7/8-14/15-30/30+); cari, filter overdue |
| K-S15 | **Detail Piutang & Bayar** | Utang per entri (sisa/jatuh tempo) + catat **pembayaran partial** (FIFO) |
| K-S16 | **Kelola Member** | Daftar member; cari; tambah/edit/hapus *(gated `canManageMembers`)* |
| K-S17 | **Form Member** | Tambah/edit member (nama, telepon, email, alamat, tipe, status) |

## C. Peta alur (flow)

```
K-S01 Login ──(role=kasir)──> [outletIds>1?] ──ya──> K-S02 Pilih Outlet ──┐
                                  └──tidak──────────────────────────────────┤
                                                                            ▼
                                              [ada shift aktif?] ──ya──> K-S04 POS
                                                      └──tidak──> K-S03 Buka Shift ──> K-S04 POS

K-S04 POS ──tap produk──> K-S05 Detail Item ──tambah──> (keranjang badge++)
K-S04 ──scan barcode──> (auto add / K-S05 jika multi-varian)
K-S04/keranjang ──> K-S06 Keranjang ──diskon/member──> K-S07 Checkout
K-S07 ──bayar sukses──> [server commit / outbox] ──> K-S08 Struk ──cetak──> kembali K-S04
K-S04 ──menu──> K-S09 Riwayat ──tap──> detail ──void──> K-S10
K-S04 ──menu──> K-S11 Tutup Shift ──> Z-report ──cetak──> K-S01/К-S13
K-S04 ──menu──> K-S14 Piutang & Aging ──tap member──> K-S15 Detail ──bayar partial (FIFO)──> alokasi + sisa
K-S04/K-S06 ──"kelola/＋ member" (canManageMembers)──> K-S16 Kelola Member ──tambah/edit──> K-S17 Form ──simpan──> kembali
                                                          K-S16 ──hapus──> [totalDebt>0?] ──ya──> tolak (lunasi dulu) / ──tidak──> hapus
```

---

## D. Rincian alur & aturan bisnis

### D1. Buka shift (K-S03)
- 1 kasir hanya boleh 1 shift **aktif** per outlet. Saat submit, kirim `POST /api/kasir/shifts/open` dgn `clientShiftId` + `kasAwal`.
- Bila server balas `409 SHIFT_ALREADY_OPEN` → tampilkan shift aktif & lanjut memakainya (jangan buat baru).
- Offline: shift dibuat lokal `pending`; POS langsung bisa dipakai. Saat sync, mapping `clientShiftId→serverId`.

### D2. POS & keranjang (K-S04 → K-S06)
- **Sumber data:** cache lokal (produk/harga/stok/pajak/diskon dari `bootstrap`/`sync`).
- **Tambah item:** tap → K-S05. Jika produk punya `variants` → wajib pilih varian. Jika punya `uomConversions` → boleh pilih satuan jual (mis. "kardus").
- **Harga grosir otomatis:** saat qty (dlm satuan dasar) memenuhi tier `wholesalePrices`, harga satuan turun ke tier `minQty` terbesar yang terpenuhi (lihat kontrak hitung [`00-foundation.md`](./00-foundation.md) §6). Tampilkan badge "Harga grosir".
- **Stok:** tampilkan sisa stok; boleh tetap jual saat stok 0 (kebijakan: jangan blok penjualan; tandai untuk ditinjau). Beri peringatan visual bila qty > stok.
- **HPP:** kolom harga modal/margin hanya tampil bila `canViewCostPrice`.
- **Catatan item** (mis. "tanpa gula") didukung per item.

### D3. Diskon & member (K-S06)
- **Diskon transaksi**: pilih dari `DiscountConfig` aktif yang `minPurchase` terpenuhi.
- **Diskon manual** (nominal/persen bebas): **hanya** jika `canDiscount`. Jika tidak, tombol disembunyikan; opsi "minta diskon" (R2: kirim ke supervisor/owner).
- **Member**: cari via `GET /api/kasir/members?q=`. Jika member `canCredit` → opsi **bayar nanti (utang)** muncul di checkout.

### D4. Checkout & pembayaran (K-S07)
- Metode tampil sesuai `paymentMethods` yang `isEnabled` di settings outlet.
- **Tunai**: numpad besar, tombol nominal cepat (Rp 50rb/100rb/uang pas). Hitung kembalian realtime.
- **QRIS/Transfer manual**: tampilkan gambar QR / info rekening dari settings; kasir konfirmasi "sudah bayar".
- **QRIS dinamis / VA (Midtrans, R2)**: `POST /api/kasir/payments/charge` → tampilkan QR → poll status → auto-lanjut saat `settlement`.
- **Kredit (utang)**: hanya jika member dipilih & `canCredit`. Server membuat `DebtRecord(debt)` & menaikkan `totalDebt`.
- Submit → `POST /api/kasir/transactions` (Idempotency-Key = `clientTxnId`). **Server menghitung ulang total** → jika `recalculated:true`, struk pakai nilai server (tampilkan info kecil).
- Offline → simpan ke outbox `pending`, langsung tampilkan struk dari hitungan lokal (ditandai "menunggu sinkron").

### D5. Struk (K-S08)
- Render dari `printPayload`. Cetak ke printer thermal Bluetooth/USB (`expo-print`/lib BLE). Cetak ulang & kirim WA/email (R2).
- Nomor struk: pakai `receiptNo` server bila online; offline pakai nomor sementara lokal lalu sinkron ke `code` server.

### D6. Void (K-S09 → K-S10)
- `POST /api/kasir/transactions/{id}/void-request` + alasan.
- Jika `canVoid` → langsung `voided` (stok dikembalikan). Else → `void_requested` (menunggu Owner approve via mobile/web). Tampilkan status "menunggu persetujuan".
- Batas waktu void (aturan bisnis, mis. hanya transaksi shift berjalan) → server balas `422 BUSINESS_RULE` bila dilanggar.

### D7. Tutup shift (K-S11)
- Input kas akhir → `POST /api/kasir/shifts/{id}/close` → terima `zReport`.
- Tampilkan ringkasan: kas awal, penjualan per metode, kas seharusnya, **selisih** (lebih/kurang), jumlah transaksi, void. Cetak Z-report.
- **Z-report detail hanya bila `canViewShiftReport`**; jika tidak, tampilkan ringkas (jumlah transaksi & status) tanpa angka omzet penuh — konfigurasi sesuai permission.
- Tidak boleh tutup shift bila masih ada outbox transaksi `pending` (paksa sync dulu) — kecuali offline, beri peringatan & tandai shift "tutup menunggu sinkron".

### D8. Piutang & Debt Aging (K-S14 → K-S15)
Memungkinkan kasir **menagih & menerima cicilan utang member di konter**.
- **Daftar & aging (K-S14):** `GET /api/kasir/debtor/aging` → kartu ringkasan bucket umur (**0-7 / 8-14 / 15-30 / 30+ hari**, dihitung dari `dueDate ?? tanggal utang`) + daftar member berutang. Cari nama/telepon; filter `overdueOnly` / `bucket`. Member overdue ditandai jelas (mis. merah). Online-utama; bila offline tampilkan cache terakhir dengan label basi (pembayaran tetap bisa via outbox).
- **Detail & bayar (K-S15):** tampilkan tiap entri utang dengan **sisa (outstanding)**, **jatuh tempo**, dan **umur**. Catat pembayaran via `POST /api/owner/debtor/payment`:
  - **Partial:** `amount` boleh < total (cicilan). Hitung "sisa setelah bayar" realtime.
  - **Alokasi FIFO otomatis** (utang tertua dulu). Kasir tak perlu memilih; opsi lanjutan "pilih utang" mengirim `targetDebtRecordIds`.
  - `method` (tunai/qris/transfer) dicatat. Idempoten (`clientPaymentId`).
  - Offline → masuk outbox (`createPaymentRecord` di [`00-foundation.md`](./00-foundation.md) §3.2); `totalDebt` di-update optimistis, dikonfirmasi server saat sync.
- **Gating:** akses menu ini bisa dibatasi (kebijakan tenant). Bayar > total piutang → `422 BUSINESS_RULE`.
- **Catat utang baru** tidak dilakukan di sini — utang muncul otomatis saat checkout `credit:true` (lihat D4).

### D9. Kelola Member — tambah/edit/hapus (K-S16 → K-S17)
**Gated permission `canManageMembers`.** Tanpa permission, menu "Kelola Member" disembunyikan; di K-S06 hanya tersedia **cari & pilih** (tanpa tombol tambah/edit/hapus).
- **Akses:** dari menu utama (K-S16) atau dari keranjang (K-S06) saat lampir member ("＋ Member baru" / "Edit").
- **Daftar (K-S16):** `GET /api/kasir/members` (cari nama/telepon, filter tipe/status). Offline → dari cache member.
- **Tambah (K-S17):** form `MemberFormValues` (nama & telepon **wajib**, email/alamat opsional, **tipe member** dari `GET /api/kasir/member-types`, status). Submit → `POST /api/kasir/members` (idempoten, `clientMemberId`). `canCredit` **ditentukan server** dari tipe (tak bisa diatur kasir). Setelah dibuat dari keranjang → langsung terpilih untuk transaksi.
- **Edit (K-S17):** ubah field → `PUT /api/kasir/members/{id}`. Ganti tipe → server me-resync `canCredit`/`memberTypeName` (aturan web).
- **Hapus (K-S16):** konfirmasi → `DELETE /api/kasir/members/{id}`.
  - **Diblok bila `totalDebt > 0`** → tampilkan pesan `"Member masih memiliki piutang aktif"` + tawaran buka K-S15 untuk lunasi dulu. (Aturan web dipertahankan.)
  - Member terkait transaksi historis tetap utuh (transaksi menyimpan nama/ID member secara historis; menghapus member tidak menghapus transaksi).
- **Offline:** tambah/edit/hapus masuk outbox (lihat [`00-foundation.md`](./00-foundation.md) §3.2). Tampilkan optimistis dengan label "menunggu sinkron". Konflik (mis. hapus tapi server menolak karena piutang muncul saat sync) → item `needs_review` di K-S12 dengan pesan, perubahan lokal di-_rollback_.
- **Catatan:** tipe member (`MemberType`) **read-only** bagi kasir — pengelolaannya tetap di Owner (web).

---

## E. Status kosong, error, & edge case

| Kondisi | Perilaku |
|---------|----------|
| Belum ada produk di cache & offline | Tampilkan "Belum ada data. Sambungkan internet untuk memuat katalog." |
| Scan barcode tak dikenal | Toast "Produk tidak ditemukan" + opsi cari manual |
| Tunai < total | Tombol bayar nonaktif + pesan kurang |
| Stok 0 / minus | Boleh lanjut; badge "Stok habis", transaksi ditandai `stockReview` saat sync |
| Permission ditolak (void/diskon/kelola member) | Sembunyikan aksi; jika dipaksa via API → 403 `PERMISSION_DENIED` |
| Hapus member yang masih berpiutang | Tolak dengan `422`; tawarkan buka K-S15 untuk lunasi dulu |
| Edit member: ganti tipe member | `canCredit`/`memberTypeName` di-resync server; tampilkan nilai baru |
| Server koreksi total (`recalculated`) | Struk pakai nilai server; tampilkan banner kecil |
| Token kedaluwarsa saat jualan | Auto-refresh diam-diam; jualan tidak terganggu |
| Refresh gagal (sesi dicabut owner) | Simpan outbox, paksa login ulang; data offline tidak hilang |

---

## F. Tiket — KASIR

### [KSR-1] Login & routing kasir
**Peran:** Kasir · **Area:** Mobile · **Fase:** R1 · **Estimasi:** S
**Deskripsi:** Layar K-S01 login JWT; setelah sukses, arahkan ke pilih-outlet/buka-shift/POS sesuai kondisi.
**Acceptance Criteria:**
- [ ] Login salah → pesan dari `INVALID_CREDENTIALS`.
- [ ] `role=kasir` masuk stack kasir; peran lain tidak masuk stack kasir.
- [ ] Outlet tunggal → lewati K-S02.
**Dependensi:** FND-1, FND-3 · **Endpoint:** §Auth

### [KSR-2] Pilih outlet & bootstrap cache
**Peran:** Kasir · **Area:** Mobile · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** K-S02 + panggil `bootstrap`, isi SQLite (produk/pengaturan/member/shift aktif).
**Acceptance Criteria:**
- [ ] Hanya outlet di `outletIds` tampil.
- [ ] Setelah pilih, cache terisi & shift aktif terdeteksi.
- [ ] Offline tanpa cache sebelumnya → pesan butuh online.
**Dependensi:** FND-4, BE-(bootstrap) · **Endpoint:** §2 `/api/kasir/bootstrap`

### [KSR-3] Buka shift (online + offline)
**Peran:** Kasir · **Area:** Mobile+Backend · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** K-S03; `POST /shifts/open` idempoten; tangani `409 SHIFT_ALREADY_OPEN`.
**Acceptance Criteria:**
- [ ] Buka shift online → `Shift` aktif tersimpan.
- [ ] Sudah ada shift aktif → gabung, bukan buat baru.
- [ ] Offline → shift lokal `pending`; POS aktif; sync memetakan id.
**Dependensi:** FND-4, BE-2 · **Endpoint:** §5 `/api/kasir/shifts/open`

### [KSR-4] Layar POS: grid produk + search + kategori
**Peran:** Kasir · **Area:** Mobile · **Fase:** R1 · **Estimasi:** L
**Deskripsi:** K-S04 list virtualized (1.000+ SKU), filter kategori, pencarian nama/SKU, dari cache lokal.
**Acceptance Criteria:**
- [ ] 1.000 SKU scroll 60fps.
- [ ] Search & filter bekerja offline dari cache.
- [ ] Badge keranjang menampilkan jumlah item.
**Dependensi:** KSR-2

### [KSR-5] Pindai barcode
**Peran:** Kasir · **Area:** Mobile+Backend · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** Kamera/scanner → cocokkan ke produk (lokal dulu, fallback `lookup`). Multi-varian → buka K-S05.
**Acceptance Criteria:**
- [ ] Barcode dikenal → item tertambah / pilih varian.
- [ ] Tak dikenal → pesan + cari manual.
- [ ] Berfungsi offline untuk produk yang ada di cache.
**Dependensi:** KSR-4 · **Endpoint:** §4 `/api/kasir/products/lookup`

### [KSR-6] Detail item: varian, UOM, qty, harga grosir
**Peran:** Kasir · **Area:** Mobile · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** K-S05; pilih `variants`/`uomConversions`, atur qty, catatan; hitung harga efektif termasuk tier `wholesalePrices`.
**Acceptance Criteria:**
- [ ] Produk bervarian wajib pilih varian sebelum tambah.
- [ ] Qty memicu harga grosir sesuai tier (uji batas `minQty`).
- [ ] Pilih UOM mengubah harga & konversi stok benar.
**Dependensi:** KSR-4 · **Acuan hitung:** `00-foundation.md` §6

### [KSR-7] Keranjang: diskon, member, kredit
**Peran:** Kasir · **Area:** Mobile · **Fase:** R1 (diskon config) / R2 (member-kredit penuh) · **Estimasi:** M
**Deskripsi:** K-S06; terapkan `DiscountConfig`, diskon manual (gated `canDiscount`), lampirkan member, opsi kredit (gated `canCredit`).
**Acceptance Criteria:**
- [ ] Diskon config hanya muncul bila `minPurchase` terpenuhi.
- [ ] Diskon manual tersembunyi tanpa `canDiscount`.
- [ ] Opsi kredit hanya bila member `canCredit`.
- [ ] Total mengikuti kontrak hitung §6.
**Dependensi:** KSR-6, KSR-10 (member search) · **Endpoint:** §8

### [KSR-8] Checkout & pembayaran tunai/manual + commit transaksi
**Peran:** Kasir · **Area:** Mobile+Backend · **Fase:** R1 · **Estimasi:** L
**Deskripsi:** K-S07; numpad tunai, kembalian, QRIS/transfer manual (gambar dari settings), submit `POST /transactions` idempoten; offline → outbox.
**Acceptance Criteria:**
- [ ] Tunai < total → tak bisa bayar.
- [ ] Sukses online → `Transaction` + kembalian + struk.
- [ ] Offline → tersimpan `pending`, struk sementara, sync tanpa duplikasi.
- [ ] `recalculated:true` → struk pakai nilai server + info.
- [ ] Stok berkurang di server & menghasilkan `StockMovement(sale)`.
**Dependensi:** FND-4, BE-1 · **Endpoint:** §6 `/api/kasir/transactions`

### [KSR-9] Struk: cetak thermal + cetak ulang
**Peran:** Kasir · **Area:** Mobile · **Fase:** R1 (cetak) / R2 (WA/email) · **Estimasi:** M
**Deskripsi:** K-S08 render `printPayload`; integrasi printer Bluetooth/USB; cetak ulang dari riwayat.
**Acceptance Criteria:**
- [ ] Struk tercetak rapi (item, diskon, pajak, total, kembalian, footer).
- [ ] Cetak ulang menghasilkan struk identik.
- [ ] Gagal koneksi printer → pesan + simpan untuk cetak ulang.
**Dependensi:** KSR-8

### [KSR-10] Kelola member — cari, tambah, edit, hapus (CRUD)
**Peran:** Kasir · **Area:** Mobile+Backend · **Fase:** R2 · **Estimasi:** M
**Deskripsi:** K-S16/K-S17; cari member (untuk transaksi), dan **CRUD penuh** member yang di-gate `canManageMembers`: tambah (juga cepat dari keranjang), edit, hapus. Idempoten & offline-able.
**Acceptance Criteria:**
- [ ] Cari by nama/telepon (online; offline dari cache member) — **tanpa** permission khusus.
- [ ] Tanpa `canManageMembers`: tombol tambah/edit/hapus & menu "Kelola Member" tersembunyi; paksa API → `403`.
- [ ] Tambah: nama & telepon wajib; tipe dari `member-types`; `canCredit` ditetapkan server; dari keranjang → langsung terpilih.
- [ ] Edit: ganti tipe → `canCredit`/`memberTypeName` ter-resync.
- [ ] Hapus: berhasil bila `totalDebt=0`; bila berpiutang → `422` + arahan lunasi.
- [ ] Offline: tambah/edit/hapus optimistis via outbox; konflik saat sync → `needs_review` + rollback lokal.
- [ ] Tidak menghapus transaksi historis terkait member.
**Dependensi:** KSR-7, FND-4, FND-7, BE-MEM-1 · **Endpoint:** §8 `/api/kasir/members*`, `/api/kasir/member-types`

### [KSR-11] Riwayat transaksi & detail (shift berjalan)
**Peran:** Kasir · **Area:** Mobile+Backend · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** K-S09 daftar transaksi shift ini (online + outbox lokal), tap → detail.
**Acceptance Criteria:**
- [ ] Transaksi offline `pending` tampil dengan label status.
- [ ] Detail menampilkan item, total, metode, status void.
**Dependensi:** KSR-8 · **Endpoint:** §6 `GET /api/kasir/transactions`

### [KSR-12] Void / ajukan void
**Peran:** Kasir · **Area:** Mobile+Backend · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** K-S10 form alasan; langsung void jika `canVoid`, else `void_requested`.
**Acceptance Criteria:**
- [ ] `canVoid` → `voided`, stok dikembalikan, omzet shift dikoreksi.
- [ ] Tanpa `canVoid` → `void_requested`, status "menunggu persetujuan".
- [ ] Pelanggaran aturan (mis. lewat batas) → `422 BUSINESS_RULE` ditampilkan.
**Dependensi:** KSR-11 · **Endpoint:** §6 `/void-request`

### [KSR-13] Tutup shift + Z-report
**Peran:** Kasir · **Area:** Mobile+Backend · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** K-S11 input kas akhir; tampilkan & cetak Z-report; hormati `canViewShiftReport`.
**Acceptance Criteria:**
- [ ] Selisih kas terhitung benar (`kasAkhir − expectedCash`).
- [ ] Z-report per metode bayar akurat & bisa dicetak.
- [ ] Tanpa `canViewShiftReport` → ringkasan dibatasi (tanpa omzet penuh).
- [ ] Outbox `pending` → wajib sync dulu / peringatan offline.
**Dependensi:** KSR-3, KSR-8 · **Endpoint:** §5 `/shifts/{id}/close`

### [KSR-14] Panel status sinkronisasi & tinjauan
**Peran:** Kasir · **Area:** Mobile · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** K-S12 daftar outbox (pending/sending/synced/needs_review), aksi retry manual, lihat alasan gagal.
**Acceptance Criteria:**
- [ ] Indikator global (🟢🟡🔴⚠️) akurat & realtime.
- [ ] Item `needs_review` menampilkan pesan & bisa di-retry/edit.
- [ ] Tidak ada transaksi hilang setelah app di-_kill_ & dibuka lagi.
**Dependensi:** FND-4

### [KSR-15] Ganti user / logout
**Peran:** Kasir · **Area:** Mobile · **Fase:** R1 · **Estimasi:** S
**Deskripsi:** K-S13; logout mencabut sesi device; "ganti user" untuk pergantian kasir di 1 tablet.
**Acceptance Criteria:**
- [ ] Logout memanggil `/auth/logout` & menghapus token dari SecureStore.
- [ ] Outbox belum tersync → peringatan sebelum logout.
**Dependensi:** FND-3 · **Endpoint:** §Auth

### [KSR-16] Menu Piutang & Debt Aging + pembayaran partial
**Peran:** Kasir · **Area:** Mobile+Backend · **Fase:** R2 · **Estimasi:** M
**Deskripsi:** K-S14/K-S15; daftar member berutang dengan **aging bucket** (0-7/8-14/15-30/30+), detail utang per-entri (sisa/jatuh tempo), catat **pembayaran partial** (alokasi FIFO, override opsional, idempoten, offline-able).
**Acceptance Criteria:**
- [ ] Ringkasan bucket & daftar member tampil; cari + filter `overdueOnly`/`bucket` berfungsi; member overdue ditandai.
- [ ] Detail menampilkan tiap utang dengan sisa & umur hari.
- [ ] Bayar partial (`amount` < total) → "sisa setelah bayar" benar; FIFO tertua dulu.
- [ ] Override pilih utang mengirim `targetDebtRecordIds`.
- [ ] Bayar > total → pesan `422`; `totalDebt` ter-update.
- [ ] Offline → pembayaran masuk outbox, ter-sync tanpa duplikasi; `totalDebt` optimistis.
**Dependensi:** KSR-2, FND-4, BE-DEBT-1 · **Endpoint:** §8 `/api/kasir/debtor/aging`, `/api/owner/debtor/payment`

### Tiket Backend pendukung Kasir

### [BE-1] Endpoint create transaksi + hitung otoritatif + stok atomik
**Peran:** Kasir · **Area:** Backend · **Fase:** R1 · **Estimasi:** L
**Deskripsi:** `POST /api/kasir/transactions`: validasi permission, hitung ulang total (§6), kurangi stok atomik + buat `StockMovement(sale)`, dukung kredit (buat `DebtRecord`), idempoten via `clientTxnId`/`Idempotency-Key`, tandai `stockReview` bila minus.
**Acceptance Criteria:**
- [ ] Total dihitung server; nilai client diabaikan.
- [ ] Retry dengan key sama tak menggandakan transaksi.
- [ ] Stok berkurang transaksional; sale → `StockMovement`.
- [ ] `credit:true` tanpa member `canCredit` → `422`.
**Dependensi:** FND-1, FND-6 · **Endpoint:** §6

### [BE-2] Endpoint shift open/close/report
**Peran:** Kasir · **Area:** Backend · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** open (idempoten, cegah shift dobel), close (hitung selisih + Z-report by method), report.
**Acceptance Criteria:**
- [ ] Cegah > 1 shift aktif/kasir/outlet (`409`).
- [ ] Z-report `byMethod`, `selisih`, `voidCount` benar.
**Dependensi:** FND-6 · **Endpoint:** §5

### [BE-3] Void + pengembalian stok + koreksi shift
**Peran:** Kasir/Owner · **Area:** Backend · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** `void-request` (langsung/ajukan) + approve/reject (sudah ada PUT owner) yang mengembalikan stok & mengoreksi omzet shift.
**Acceptance Criteria:**
- [ ] Approve void mengembalikan stok & menyesuaikan `Shift.totalOmzet`.
- [ ] Idempoten & aman dari double-void.
**Dependensi:** BE-1

### [BE-MEM-1] Endpoint member CRUD untuk Kasir (ber-permission)
**Peran:** Kasir · **Area:** Backend · **Fase:** R2 · **Estimasi:** M
**Deskripsi:** Sediakan `GET/POST/PUT/DELETE /api/kasir/members*` + `GET /api/kasir/member-types`, berbagi logika dengan `/api/owner/members*` tetapi menegakkan permission **`canManageMembers`** & scope tenant/outlet kasir. Pertahankan aturan web: tipe wajib valid, resync `canCredit` dari tipe, **tolak hapus bila `totalDebt > 0`**. Idempoten via `clientMemberId`/`Idempotency-Key`.
**Acceptance Criteria:**
- [ ] Tanpa `canManageMembers` → `403 PERMISSION_DENIED` pada POST/PUT/DELETE.
- [ ] POST/PUT menolak tipe tak valid (`422`) & menetapkan `canCredit` dari tipe.
- [ ] DELETE menolak member berpiutang (`422`, message identik web).
- [ ] Idempoten: retry create tak menggandakan member.
- [ ] Kompatibel dengan endpoint owner existing (handler bersama, guard berbeda).
**Dependensi:** FND-6, FND-7 · **Endpoint:** §8

➡️ Lanjut: [`10-role-owner.md`](./10-role-owner.md).
