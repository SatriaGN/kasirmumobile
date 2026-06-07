# 10 — Peran OWNER (mobile)

> Owner = pemilik bisnis/tenant. Di web sudah punya cockpit lengkap. Di **mobile**, fokus Owner adalah **monitoring di genggaman + aksi cepat (approve void, stok cepat) + bisa turun jadi kasir**. Bukan replika penuh web; ambil yang relevan untuk mobilitas.

---

## A. Tujuan peran

Owner bisa: pantau omzet realtime semua/satu outlet → lihat aktivitas kasir & shift berjalan → **approve/reject void** → cek stok menipis & lakukan stok cepat (in/out/opname) → kelola kasir (status aktif/nonaktif) → lihat piutang & catat pembayaran → **masuk mode POS** (jualan langsung saat menggantikan kasir).

## B. Daftar layar (HBS Owner)

| Kode | Layar | Ringkas |
|------|-------|---------|
| O-S01 | **Login** | JWT (role owner) |
| O-S02 | **Dashboard** | KPI omzet hari ini vs kemarin, transaksi, kasir aktif, stok menipis, grafik per jam |
| O-S03 | **Pemilih Outlet** | Semua / per outlet (filter global) |
| O-S04 | **Aktivitas Live** | Transaksi terkini + kasir aktif (status shift) |
| O-S05 | **Persetujuan Void** | Daftar `void_requested`; approve/reject |
| O-S06 | **Laporan** | Omzet harian/mingguan/bulanan, top produk, performa kasir |
| O-S07 | **Stok & Alert** | Stok menipis/habis; aksi stok cepat |
| O-S08 | **Stok Cepat** | Stock-in / stock-out / opname (mobile) |
| O-S09 | **Kasir & Shift** | Daftar kasir, status; shift berjalan; force close |
| O-S10 | **Piutang (Debtor)** | Ringkasan utang member; **debt aging**; catat pembayaran (partial) |
| O-S10b | **Detail Piutang Member** | Daftar utang per entri (sisa/outstanding, jatuh tempo, status) + bayar partial |
| O-S11 | **Mode POS** | Masuk alur kasir (lihat `20-role-kasir.md`) |
| O-S12 | **Pengaturan ringkas** | Lihat pajak/metode bayar (read); edit penuh tetap di web |
| O-S13 | **Profil/Notifikasi/Logout** | |

## C. Peta alur (flow)

```
O-S01 Login ──(role=owner)──> O-S02 Dashboard
O-S02 ──filter──> O-S03 Pilih Outlet ──> (KPI ter-scope)
O-S02 ──"kasir aktif"──> O-S04 Aktivitas Live ──> O-S09 Kasir & Shift
O-S02 ──badge void N──> O-S05 Persetujuan Void ──approve──> stok kembali + omzet terkoreksi
O-S02 ──"stok menipis M"──> O-S07 Stok & Alert ──> O-S08 Stok Cepat
O-S02 ──tab──> O-S06 Laporan
O-S02 ──tab──> O-S10 Piutang & Aging ──tap member──> O-S10b Detail ──bayar partial (FIFO)──> alokasi + sisa
O-S02 ──FAB "Jualan"──> O-S11 Mode POS (alur Kasir penuh)
```

---

## D. Rincian alur & aturan

### D1. Dashboard (O-S02) & pemilih outlet (O-S03)
- Sumber: `GET /api/owner/dashboard/summary` → `OwnerDashboardSummary` (omzet hari ini/kemarin, txn, kasir aktif, stok alert, top produk, omzet per jam, status outlet).
- Filter outlet global (default: semua). Pull-to-refresh; auto-refresh ringan saat layar fokus.
- Online-only untuk angka realtime (boleh tampilkan cache terakhir + label "data … lalu" bila offline).

### D2. Aktivitas live (O-S04)
- `GET /api/owner/dashboard/live-activity` → transaksi terkini + kasir aktif (jam mulai shift, jumlah txn, omzet). Tap kasir → O-S09.

### D3. Persetujuan void (O-S05) — aksi kritis
- Sumber: transaksi `status=void_requested` (`/api/owner/approvals/void-pending` atau `/api/owner/transactions?status=void_requested`).
- Approve/Reject → `PUT /api/owner/transactions/{id}` `{action:"approve_void"|"reject_void"}`.
- **Approve** → server set `voided`, **kembalikan stok**, koreksi omzet shift terkait. Tampilkan konfirmasi (aksi memengaruhi uang/stok).
- Badge jumlah pending muncul di dashboard & tab.

### D4. Laporan (O-S06)
- `GET /api/owner/laporan` → `LaporanData` (omzet harian/mingguan/bulanan, top produk dgn SKU/kategori, performa kasir: txn, omzet, rata-rata, jumlah shift, void). Grafik via charting mobile (paritas konsep dengan recharts web).

### D5. Stok & alert + stok cepat (O-S07/O-S08) — R2
- Daftar `StockEntry` status `low`/`empty` dari `GET /api/owner/stock`.
- Stok cepat: `stock/in` (`StockInItem[]` dengan konversi UOM), `stock/out` (`StockOutItem[]` + alasan), `opname` (`StockOpnameItem[]`). Menghasilkan `StockMovement` → konsisten dengan web & POS.

### D6. Kasir & shift (O-S09)
- Daftar kasir (status aktif/nonaktif) & shift berjalan. **Force close shift** → `PUT /api/owner/shifts/{id}` (sudah ada di web). Tampilkan selisih kas hasil paksa-tutup.
- (R2) ubah status kasir aktif/nonaktif dari mobile; cabut sesi device kasir.

### D7. Piutang + Debt Aging (O-S10/O-S10b) — R2
- **Daftar & aging:** `GET /api/owner/debtor/aging` → `summary` (total outstanding + bucket **0-7 / 8-14 / 15-30 / 30+**, overdue) + `rows` (per member). Tampilkan kartu ringkasan bucket di atas, daftar member ber-filter (`bucket`, `overdueOnly`, tipe member) di bawah. Member overdue ditandai (warna/ikon).
- **Detail member (O-S10b):** detail `/{memberId}` kini mengembalikan `records` dengan `outstanding`/`dueDate`/`status` + `aging` per-member. Tiap entri utang menampilkan sisa & umur.
- **Pembayaran partial:** `POST /api/owner/debtor/payment` dengan `amount` boleh < total (cicilan). Alokasi **FIFO otomatis** (utang tertua dulu); Owner boleh override pilih utang via `targetDebtRecordIds`. Respons memuat rincian alokasi & sisa per utang. Idempoten (`Idempotency-Key`).
- Aturan dipertahankan: pembayaran **tak boleh melebihi** total piutang (`422 BUSINESS_RULE`).

### D8. Mode POS (O-S11)
- Owner boleh menjalankan **alur kasir penuh** (buka shift atas namanya / outlet terpilih). Semua aturan di [`20-role-kasir.md`](./20-role-kasir.md) berlaku; permission Owner = penuh (boleh void langsung, diskon, lihat HPP).

### D9. Pengaturan (O-S12)
- Mobile **menampilkan** pajak/metode bayar/diskon (read-only) untuk verifikasi. Edit penuh (Midtrans key, dll.) tetap di **web** untuk keamanan. Tautan "Buka di web" bila perlu.

---

## E. Edge case Owner

| Kondisi | Perilaku |
|---------|----------|
| Multi-outlet, paket membatasi | Hormati `OUTLET_LIMITS`/`KASIR_LIMITS`; tampilkan kunci upgrade |
| Approve void transaksi yang stoknya sudah berubah | Server tetap kembalikan stok secara relatif (movement), tampilkan hasil |
| Offline saat buka dashboard | Tampilkan cache + label basi; sembunyikan aksi mutasi (approve) sampai online |
| Force close shift dengan outbox kasir belum sync | Peringatkan bahwa angka final bisa berubah setelah sync |

---

## F. Tiket — OWNER

### [OWN-1] Login & routing owner
**Peran:** Owner · **Area:** Mobile · **Fase:** R1 · **Estimasi:** S
**Deskripsi:** O-S01 login JWT; `role=owner` → stack owner (dashboard).
**Acceptance Criteria:**
- [ ] Owner masuk dashboard; akses endpoint owner/admin sesuai role.
- [ ] FAB "Jualan" tersedia untuk masuk mode POS.
**Dependensi:** FND-1, FND-3 · **Endpoint:** §Auth

### [OWN-2] Dashboard KPI + pemilih outlet
**Peran:** Owner · **Area:** Mobile · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** O-S02/O-S03; render `OwnerDashboardSummary`, filter outlet global, pull-to-refresh.
**Acceptance Criteria:**
- [ ] Tampilkan omzet hari ini vs kemarin (+%), txn, kasir aktif, stok alert, grafik per jam.
- [ ] Filter outlet mengubah seluruh angka.
- [ ] Offline → cache + label "diperbarui … lalu".
**Dependensi:** OWN-1 · **Endpoint:** §10 `/dashboard/summary`

### [OWN-3] Aktivitas live (transaksi & kasir aktif)
**Peran:** Owner · **Area:** Mobile · **Fase:** R1 · **Estimasi:** S
**Deskripsi:** O-S04 dari `live-activity`; tap kasir → detail shift.
**Acceptance Criteria:**
- [ ] Daftar transaksi terkini + kasir aktif tampil & auto-refresh.
- [ ] Navigasi ke O-S09 berfungsi.
**Dependensi:** OWN-2 · **Endpoint:** §10 `/dashboard/live-activity`

### [OWN-4] Persetujuan void (approve/reject)
**Peran:** Owner · **Area:** Mobile+Backend · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** O-S05 daftar `void_requested`; approve/reject dengan konfirmasi; badge pending di dashboard.
**Acceptance Criteria:**
- [ ] Approve ≤ 3 tap; konfirmasi muncul (aksi uang/stok).
- [ ] Approve → `voided`, stok kembali, omzet shift terkoreksi.
- [ ] Reject → `completed`.
- [ ] Badge jumlah pending akurat.
**Dependensi:** OWN-2, BE-3 · **Endpoint:** §6 `PUT /api/owner/transactions/{id}`, §10 void-pending

### [OWN-5] Laporan (omzet, top produk, performa kasir)
**Peran:** Owner · **Area:** Mobile · **Fase:** R1 · **Estimasi:** M
**Deskripsi:** O-S06 render `LaporanData` dengan grafik harian/mingguan/bulanan & tabel.
**Acceptance Criteria:**
- [ ] Ketiga periode tampil + top produk + performa kasir.
- [ ] Angka konsisten dengan web (sumber data sama).
**Dependensi:** OWN-2 · **Endpoint:** §10 `/api/owner/laporan`

### [OWN-6] Stok & alert + stok cepat
**Peran:** Owner · **Area:** Mobile · **Fase:** R2 · **Estimasi:** M
**Deskripsi:** O-S07/O-S08; daftar stok menipis, lakukan in/out/opname dari mobile.
**Acceptance Criteria:**
- [ ] Daftar `low`/`empty` akurat per outlet.
- [ ] In/out/opname menghasilkan `StockMovement` & menyesuaikan stok.
- [ ] Konversi UOM pada stock-in benar.
**Dependensi:** OWN-2 · **Endpoint:** §9 `/api/owner/stock/*`

### [OWN-7] Kasir & shift (monitoring + force close)
**Peran:** Owner · **Area:** Mobile+Backend · **Fase:** R1 (force close) / R2 (kelola status) · **Estimasi:** M
**Deskripsi:** O-S09 daftar kasir & shift berjalan; force close; (R2) ubah status & cabut sesi.
**Acceptance Criteria:**
- [ ] Force close menutup shift + menampilkan selisih.
- [ ] (R2) nonaktifkan kasir → sesi device kasir tercabut saat refresh.
**Dependensi:** OWN-3 · **Endpoint:** §5 `PUT /api/owner/shifts/{id}`

### [OWN-8] Piutang, Debt Aging & pembayaran partial
**Peran:** Owner · **Area:** Mobile · **Fase:** R2 · **Estimasi:** M
**Deskripsi:** O-S10/O-S10b: ringkasan **debt aging** (bucket 0-7/8-14/15-30/30+), daftar member ber-filter, detail per-utang (outstanding/jatuh tempo/status), catat **pembayaran partial** dengan alokasi FIFO (override opsional). Idempoten.
**Acceptance Criteria:**
- [ ] Kartu ringkasan menampilkan total outstanding + nilai tiap bucket + jumlah member overdue.
- [ ] Filter `bucket`/`overdueOnly`/tipe member berfungsi; member overdue ditandai.
- [ ] Detail member menampilkan tiap entri utang dengan sisa & umur hari.
- [ ] Bayar `amount` < total (partial) → utang berkurang sebagian; entri jadi `partial`/`paid`; FIFO tertua dulu.
- [ ] Override `targetDebtRecordIds` membayar utang terpilih lebih dulu.
- [ ] Bayar > total utang ditolak (`422`); `totalDebt` & bucket ter-update setelah bayar.
**Dependensi:** OWN-2, BE-DEBT-1 · **Endpoint:** §8 `/api/owner/debtor/aging`, `/{memberId}`, `/payment`

### [OWN-9] Mode POS untuk Owner
**Peran:** Owner · **Area:** Mobile · **Fase:** R1 · **Estimasi:** S (reuse Kasir)
**Deskripsi:** O-S11 masuk alur kasir penuh dengan permission Owner (void langsung, diskon, HPP terlihat).
**Acceptance Criteria:**
- [ ] Owner bisa buka shift & bertransaksi.
- [ ] Void langsung tanpa approval.
**Dependensi:** Semua tiket KSR inti · **Endpoint:** §5, §6

### [OWN-10] Pengaturan ringkas (read-only) + tautan web
**Peran:** Owner · **Area:** Mobile · **Fase:** R2 · **Estimasi:** S
**Deskripsi:** O-S12 menampilkan pajak/metode bayar/diskon; edit sensitif diarahkan ke web.
**Acceptance Criteria:**
- [ ] Konfigurasi tampil benar (sama dengan settings web).
- [ ] Aksi edit terkunci dengan tautan "Buka di web".
**Dependensi:** OWN-2 · **Endpoint:** §3 `/api/owner/settings`

### Tiket Backend pendukung Piutang

### [BE-DEBT-1] Debt aging + pembayaran partial dengan alokasi FIFO
**Peran:** Owner/Kasir · **Area:** Backend · **Fase:** R2 · **Estimasi:** M
**Deskripsi:** Perluas model `DebtRecord` (field `dueDate`, `outstanding`, `status`, `allocations`, `method` — aditif, tak merusak web). Implementasi endpoint aging (`/api/owner/debtor/aging`, `/api/kasir/debtor/aging`) dengan bucket **0-7/8-14/15-30/30+** dihitung dari `dueDate ?? createdAt`. Perluas `POST /debtor/payment`: dukung `amount` partial + alokasi **FIFO** (override `targetDebtRecordIds`), idempoten via `Idempotency-Key`/`clientPaymentId`. Saat transaksi `credit:true`, set `outstanding=amount`, `status="open"`, `dueDate` dari tenor (bila ada).
**Acceptance Criteria:**
- [ ] Aging summary & per-member akurat; bucket tepat di batas (uji umur 7/8/14/15/30/31 hari).
- [ ] Pembayaran partial mengurangi `outstanding` entri tertua dulu; entri jadi `partial`/`paid`.
- [ ] Override `targetDebtRecordIds` dihormati & divalidasi milik member (`422` bila bukan).
- [ ] Idempoten: retry pembayaran tak menggandakan; `totalDebt` konsisten.
- [ ] Bayar > total → `422 BUSINESS_RULE` (aturan existing dipertahankan).
- [ ] Endpoint web existing (`/debtor`, `/{memberId}`, `/payment`) tetap kompatibel.
**Dependensi:** FND-6 · **Endpoint:** §8

➡️ Lanjut: [`30-role-admin.md`](./30-role-admin.md).
