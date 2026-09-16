# PELTI Bali One

Sistem pendataan pemain PELTI Bali: pendaftaran via form publik per kabupaten/kota,
verifikasi berjenjang (distrik → pusat), master data pemain, peringkat PNP,
riwayat prestasi, dan audit trail.

| Layer | Teknologi |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS + Zustand |
| Backend | Express + TypeScript + Prisma + Zod |
| Database | PostgreSQL |
| Auth | JWT + RBAC (`CENTRAL_ADMIN`, `DISTRICT_ADMIN`, `PLAYER`) |

---

## 1. Prasyarat

- **Node.js ≥ 20** (`node --version`)
- **PostgreSQL ≥ 14** berjalan lokal (atau URL database remote)
- **npm** (bawaan Node)
- Git

Port default:

| Service | URL |
|---|---|
| Backend API | `http://localhost:4000/api` |
| Frontend web | `http://localhost:5173` |

---

## 2. Clone & Install

```bash
git clone <repo-url> peltibalione
cd peltibalione

# install root + backend + frontend sekaligus
npm install
npm install --prefix backend
npm install --prefix frontend
```

---

## 3. Siapkan Database

Buat database kosong di PostgreSQL:

```sql
CREATE DATABASE pelti_bali_one;
```

Atau via CLI:

```bash
createdb pelti_bali_one
```

---

## 4. Konfigurasi Env Backend

```bash
cp backend/.env.example backend/.env
```

Isi `backend/.env` (sesuaikan password Postgres):

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pelti_bali_one?schema=public"
JWT_SECRET="ganti-minimal-32-karakter-acak"
JWT_EXPIRES_IN="7d"
PORT=4000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=4194304
```

> `JWT_SECRET` wajib diganti di production. `CORS_ORIGIN` harus sama persis
> dengan URL frontend.

---

## 5. Migrate + Seed Database

```bash
# dari root
npm run db:migrate   # prisma migrate dev (backend)
npm run db:seed      # seed 9 kabupaten/kota + akun admin

# atau dari dalam backend/
cd backend
npx prisma migrate dev
npx prisma db seed
```

Seed membuat:

- 9 district Bali (Badung, Bangli, Buleleng, Denpasar, Gianyar, Jembrana,
  Karangasem, Klungkung, Tabanan)
- Master kelompok umur (KU 8 – KU 18 PA/PI)
- Central admin + 1 district admin per kabupaten

Cek isi DB secara visual (opsional):

```bash
npm run db:studio --prefix backend
```

---

## 6. Konfigurasi Env Frontend (opsional)

Default frontend memanggil `http://localhost:4000/api`.
Hanya perlu file env bila backend beda host/port:

```bash
# frontend/.env
VITE_API_URL=http://localhost:4000/api
```

---

## 7. Jalankan Aplikasi

```bash
# dari root — jalan backend + frontend bersamaan
npm run dev
```

Atau terpisah (dua terminal):

```bash
npm run dev --prefix backend    # http://localhost:4000/api
npm run dev --prefix frontend   # http://localhost:5173
```

---

## 8. Login Pertama

| Role | Email | Password |
|---|---|---|
| Central Admin | `admin@peltibali.id` | `admin123!` |
| District Admin | `admin@badung.com` (dst, lihat `backend/prisma/seed.ts`) | `password123` |

Alur normal per distrik:

1. Login sebagai district admin → buka **Daftar Pemain**.
2. Form pendaftaran dibuat **otomatis** (status `DRAFT`).
3. Klik **Kelola Form → Publikasikan** → **Salin Link**.
4. Bagikan link publik `/form/player/:token` untuk pendaftaran.
5. Pengajuan masuk → verifikasi → tutup form bila periode selesai.

---

## 9. Skrip Penting

```bash
# root
npm run dev           # backend + frontend sekaligus
npm run build         # build backend + frontend
npm run lint          # lint backend + frontend
npm run db:migrate    # prisma migrate dev
npm run db:seed       # prisma db seed
npm run db:studio     # prisma studio

# backend saja
npm run dev --prefix backend      # tsx watch
npm run build --prefix backend    # tsc → dist/
npm start --prefix backend        # node dist/index.js (production)

# frontend saja
npm run dev --prefix frontend     # vite dev
npm run build --prefix frontend   # vite build → dist/
```

---

## 10. Struktur Proyek

```text
peltibalione/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # data model (PRD §40)
│   │   ├── seed.ts            # district + admin + age groups
│   │   └── migrations/
│   ├── src/
│   │   ├── modules/           # forms, players, submissions,
│   │   │                      # verification, districts, users, …
│   │   └── shared/            # auth, rbac, prisma, errors, audit
│   └── uploads/               # file upload lokal (dev)
├── frontend/
│   └── src/
│       ├── modules/           # players, forms, verification, …
│       ├── pages/             # public form, check status, landing
│       ├── lib/api.ts         # API client
│       └── stores/            # auth + workspace (zustand)
└── docs/
    ├── PRD.md
    ├── DESIGN.md
    └── STACK.md
```

---

## 11. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| `Can't reach database` saat migrate | Postgres mati / `DATABASE_URL` salah | Nyalakan Postgres, cek user/password/nama DB |
| Migration gagal di tengah | DB sudah setengah migrate | `npx prisma migrate resolve --applied <nama-migrasi>` lalu `migrate dev` lagi. Jangan edit file migrasi yang sudah applied |
| Frontend `Failed to fetch` | Backend mati / `VITE_API_URL` salah | Nyalakan backend, samakan URL + `CORS_ORIGIN` |
| Modal teman beda (Buat Form vs Publish) | Beda backend/DB, beda `districtId` di token, atau token lama | Samakan `VITE_API_URL`, login ulang, bandingkan `GET /api/forms` di DevTools |
| `ACTIVE_FORM_EXISTS` | Sudah ada form aktif di district itu | Tutup form lama dulu sebelum publish baru (1 aktif per district) |
| Upload gagal | File > 4MB / bukan JPEG-PNG | Kecilkan file, cek `MAX_FILE_SIZE` dan `UPLOAD_DIR` |
| Port bentrok | 4000/5173 dipakai app lain | Matikan app lain atau ubah `PORT` (backend) |

---

## 12. Dokumen Terkait

- `docs/PRD.md` — kebutuhan bisnis lengkap
- `docs/DESIGN.md` — arah visual (restrained, anti-generic)
- `docs/STACK.md` — ringkasan teknologi
