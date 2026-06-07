# 30 — Peran ADMIN PLATFORM (mobile)

> Admin = superadmin **platform SaaS KasirMu** (tim internal), bukan admin toko. Di web sudah punya panel lengkap (`/admin/*`). Di **mobile**, Admin butuh **akses darurat & monitoring di HP**: cek kesehatan platform, tangani pembayaran gagal, setujui aktivasi/upgrade, lihat tenant. Bukan operasi POS.
>
> Tipe domain: [`src/types/admin.ts`](../../src/types/admin.ts) — `Owner` (tenant), `Toko`, `Subscription`, `Payment`/`Invoice`, `PendingAction`.

---

## A. Tujuan peran

Admin bisa: lihat ringkasan platform (MRR, signup, status) → tinjau **antrian tindakan** (pembayaran gagal, upgrade manual, permintaan refund) → retry pembayaran gagal → catat pembayaran manual / proses refund invoice → cari & lihat detail tenant (owner) + toko + langganan. Semua aksi uang **dua-langkah konfirmasi** + idempoten.

## B. Daftar layar (HBS Admin)

| Kode | Layar | Ringkas |
|------|-------|---------|
| A-S01 | **Login** | JWT (role admin) |
| A-S02 | **Dashboard Platform** | MRR, signup, owner aktif/trial/past_due, pembayaran gagal |
| A-S03 | **Antrian Tindakan** | `PendingAction[]` (failed_payment, manual_upgrade, refund_request, …) prioritas |
| A-S04 | **Pembayaran** | Log pembayaran + tab **Gagal**; retry |
| A-S05 | **Detail Invoice** | Rincian invoice; catat pembayaran manual; refund |
| A-S06 | **Tenants (Owner)** | Cari/daftar owner; status; tap → detail |
| A-S07 | **Detail Tenant** | Profil owner + toko + langganan + riwayat |
| A-S08 | **Langganan** | Daftar & detail subscription; status, MRR, siklus |
| A-S09 | **Profil/Notifikasi/Logout** | Push untuk pembayaran gagal/antrian |

## C. Peta alur (flow)

```
A-S01 Login ──(role=admin)──> A-S02 Dashboard Platform
A-S02 ──"antrian N"──> A-S03 Antrian Tindakan
A-S03 ──failed_payment──> A-S04 Pembayaran (Gagal) ──retry──> status update
A-S03 ──refund_request──> A-S05 Detail Invoice ──refund──> (konfirmasi 2 langkah)
A-S03 ──manual_upgrade──> A-S07 Detail Tenant / A-S08 Langganan
A-S02 ──"pembayaran gagal M"──> A-S04
A-S02 ──cari tenant──> A-S06 Tenants ──tap──> A-S07 Detail Tenant ──> A-S08 Langganan
```

---

## D. Rincian alur & aturan

### D1. Dashboard platform (A-S02)
- `GET /api/admin/dashboard/summary` (+ `mrr`, `signups`, `recent-activity` bila perlu). KPI: MRR, owner aktif/trial/past_due/suspended, signup, pembayaran gagal hari ini.
- Online-only (data sensitif & realtime).

### D2. Antrian tindakan (A-S03) — pusat kerja Admin
- `GET /api/admin/pending-actions` → `PendingAction[]` dengan `type` & `priority`. Urut prioritas (high dulu). Setiap item men-_deeplink_ ke layar aksi yang tepat.

### D3. Pembayaran & retry (A-S04)
- `GET /api/admin/payments` & `/payments/failed`. Aksi **retry**: `POST /api/admin/payments/{id}/retry` (idempoten). Konfirmasi sebelum retry.

### D4. Invoice: pembayaran manual & refund (A-S05) — aksi uang
- `GET /api/admin/invoices/{id}`. **Catat pembayaran manual**: `POST /api/admin/invoices/{id}/payment`. **Refund**: `POST /api/admin/invoices/{id}/refunds`.
- **Wajib konfirmasi dua-langkah** (ketik nominal / tahan tombol) karena outward-facing & menyangkut uang. Idempoten via `Idempotency-Key`.

### D5. Tenants & langganan (A-S06/07/08)
- `GET /api/admin/users?q=` → daftar owner/tenant; detail `/users/{id}` (+ `tokos`, `subscription-history`). Langganan: `GET /api/admin/subscriptions` & `/{id}` (+ billing-history, change-log, pending-actions). Mobile **baca**; mutasi langganan kompleks (ubah paket) diarahkan ke web kecuali aksi cepat yang sudah ada endpoint-nya.

### D6. Keamanan & audit
- Aksi admin **selalu** butuh access token valid (role `admin`) + ditegakkan server (`FORBIDDEN_ROLE` bila bukan admin). Semua mutasi tercatat (audit) di server. Pertimbangkan **re-auth/biometrik** sebelum refund di mobile (R3).

---

## E. Edge case Admin

| Kondisi | Perilaku |
|---------|----------|
| Bukan role admin mengakses endpoint admin | 403 `FORBIDDEN_ROLE`; sembunyikan menu |
| Retry pembayaran sudah sukses dari proses lain | Idempoten → tampilkan status terkini, bukan error |
| Refund melebihi jumlah invoice | Server tolak `422 BUSINESS_RULE`; tampilkan alasan |
| Offline | Sembunyikan semua aksi mutasi; hanya cache baca terakhir dengan label basi |
| Push pembayaran gagal | Deeplink langsung ke A-S04 item terkait |

---

## F. Tiket — ADMIN

### [ADM-1] Login & routing admin
**Peran:** Admin · **Area:** Mobile · **Fase:** R3 · **Estimasi:** S
**Deskripsi:** A-S01 login JWT; `role=admin` → stack admin. Tegakkan role di server.
**Acceptance Criteria:**
- [ ] Admin masuk stack admin; non-admin diblok dari endpoint admin (403).
- [ ] Menu POS/owner tidak muncul untuk admin.
**Dependensi:** FND-1, FND-3 · **Endpoint:** §Auth

### [ADM-2] Dashboard platform
**Peran:** Admin · **Area:** Mobile · **Fase:** R3 · **Estimasi:** M
**Deskripsi:** A-S02 render ringkasan platform (MRR, signup, status owner, pembayaran gagal).
**Acceptance Criteria:**
- [ ] KPI sesuai data web admin (sumber sama).
- [ ] Pull-to-refresh; offline → cache + label basi, aksi mutasi tersembunyi.
**Dependensi:** ADM-1 · **Endpoint:** §11 `/api/admin/dashboard/*`

### [ADM-3] Antrian tindakan (pending actions) + deeplink
**Peran:** Admin · **Area:** Mobile · **Fase:** R3 · **Estimasi:** M
**Deskripsi:** A-S03 daftar `PendingAction[]` urut prioritas; tiap item deeplink ke layar aksi.
**Acceptance Criteria:**
- [ ] Item high-priority di atas.
- [ ] `failed_payment`→A-S04, `refund_request`→A-S05, `manual_upgrade`→A-S07/08.
**Dependensi:** ADM-2 · **Endpoint:** §11 `/api/admin/pending-actions`

### [ADM-4] Pembayaran & retry
**Peran:** Admin · **Area:** Mobile+Backend · **Fase:** R3 · **Estimasi:** M
**Deskripsi:** A-S04 log pembayaran + tab gagal; retry idempoten dengan konfirmasi.
**Acceptance Criteria:**
- [ ] Daftar pembayaran & gagal tampil.
- [ ] Retry idempoten; status diperbarui; sudah-sukses tidak error.
**Dependensi:** ADM-3 · **Endpoint:** §11 `/payments`, `/payments/failed`, `/payments/{id}/retry`

### [ADM-5] Invoice: pembayaran manual & refund (aksi uang)
**Peran:** Admin · **Area:** Mobile+Backend · **Fase:** R3 · **Estimasi:** M
**Deskripsi:** A-S05 detail invoice; catat pembayaran manual & refund dengan konfirmasi dua-langkah + idempoten.
**Acceptance Criteria:**
- [ ] Refund/pembayaran butuh konfirmasi eksplisit (ketik nominal / tahan).
- [ ] Refund melebihi invoice → `422` ditampilkan.
- [ ] Idempoten (retry tak menggandakan).
- [ ] Tercatat di audit server.
**Dependensi:** ADM-4 · **Endpoint:** §11 `/invoices/{id}`, `/invoices/{id}/payment`, `/invoices/{id}/refunds`

### [ADM-6] Tenants (owner) — cari & detail
**Peran:** Admin · **Area:** Mobile · **Fase:** R3 · **Estimasi:** M
**Deskripsi:** A-S06/A-S07 cari/daftar owner; detail dengan toko & riwayat langganan.
**Acceptance Criteria:**
- [ ] Cari by nama/email/bisnis berfungsi (paginasi).
- [ ] Detail menampilkan toko + status + riwayat langganan.
**Dependensi:** ADM-2 · **Endpoint:** §11 `/users`, `/users/{id}`, `/users/{id}/tokos`, `/users/{id}/subscription-history`

### [ADM-7] Langganan — daftar & detail (read)
**Peran:** Admin · **Area:** Mobile · **Fase:** R3 · **Estimasi:** S
**Deskripsi:** A-S08 daftar & detail subscription (status, MRR, siklus, billing-history, change-log). Mutasi kompleks diarahkan ke web.
**Acceptance Criteria:**
- [ ] Daftar & detail tampil sesuai web.
- [ ] Aksi ubah paket kompleks → tautan "Buka di web" (kecuali aksi cepat ber-endpoint).
**Dependensi:** ADM-6 · **Endpoint:** §11 `/subscriptions`, `/subscriptions/{id}`, `/{id}/billing-history`, `/{id}/change-log`

### [ADM-8] Notifikasi push (pembayaran gagal / antrian) — R3
**Peran:** Admin · **Area:** Mobile+Backend · **Fase:** R3 · **Estimasi:** M
**Deskripsi:** Push saat pembayaran gagal / pending action baru; deeplink ke layar terkait.
**Acceptance Criteria:**
- [ ] Notifikasi diterima & membuka layar yang benar.
- [ ] Bisa dimatikan per kategori di profil.
**Dependensi:** ADM-3

### Tiket Backend pendukung Admin

### [BE-ADM-1] Role-guard & audit untuk endpoint admin (Bearer)
**Peran:** Admin · **Area:** Backend · **Fase:** R3 · **Estimasi:** M
**Deskripsi:** Pastikan endpoint `/api/admin/*` menerima Bearer JWT (mobile) selain cookie (web), menegakkan `role=admin` (403 `FORBIDDEN_ROLE`), dan mencatat audit untuk semua mutasi (retry/refund/payment).
**Acceptance Criteria:**
- [ ] Non-admin → 403; admin → akses.
- [ ] Setiap mutasi tercatat (actor, waktu, target, hasil).
- [ ] Retry/refund/payment idempoten via `Idempotency-Key`.
**Dependensi:** FND-1, FND-6

---

## G. Catatan paritas web ↔ mobile (Admin)

Semua endpoint admin **sudah ada** di web (`src/app/api/admin/*`). Pekerjaan mobile Admin sebagian besar adalah **UI + Bearer auth + role guard + audit + idempotency** pada endpoint yang sama — sehingga data Admin di web & mobile **otomatis selaras** (satu sumber data setelah migrasi DB `FND-6`).

⬅️ Kembali ke [`README.md`](./README.md).
