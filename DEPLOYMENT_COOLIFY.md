# Deploy PELTI Bali One ke Coolify

Aplikasi dibangun menjadi satu container. Express melayani API dan frontend React pada domain yang sama. PostgreSQL dijalankan sebagai resource terpisah di Coolify.

## 1. Buat database

Di project Coolify, tambahkan resource **PostgreSQL**. Salin internal connection URL dari database tersebut. Gunakan internal URL agar koneksi tidak keluar dari jaringan Coolify.

## 2. Buat application

Tambahkan application dari repository Git, lalu pilih build pack **Dockerfile**.

- Dockerfile location: `/Dockerfile`
- Port: `4000`
- Health check path: `/api/health`

## 3. Environment variables

Tambahkan variabel berikut pada application:

```env
DATABASE_URL=postgresql://USER:PASSWORD@POSTGRES_HOST:5432/DATABASE_NAME?schema=public
JWT_SECRET=GANTI_DENGAN_RANDOM_SECRET_MINIMAL_32_KARAKTER
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://domain-anda.com
UPLOAD_DIR=/app/backend/uploads
MAX_FILE_SIZE=4194304
RUN_DB_SEED=true
DB_MIGRATION_RETRIES=10
```

Jangan memasukkan `.env` ke repository. Nilai `DATABASE_URL` dan password harus berasal dari Coolify.

## 4. Persistent storage

Tambahkan persistent storage pada application:

```text
Destination path: /app/backend/uploads
```

Tanpa storage ini, foto dan dokumen upload akan hilang saat container dibuat ulang.

## 5. Deploy pertama

Deploy application. Saat container dimulai, entrypoint otomatis menjalankan:

```text
prisma migrate deploy
prisma db seed        (hanya jika RUN_DB_SEED=true)
node dist/index.js
```

Seed dapat dijalankan ulang dan tidak akan mereset password akun yang sudah ada. Setelah deploy pertama berhasil, ubah `RUN_DB_SEED=false`, lalu ganti seluruh password bawaan.

Akun awal central admin:

```text
Email: admin@peltibali.id
Password: admin123!
```

## 6. Deploy berikutnya

Push perubahan ke repository dan deploy ulang melalui Coolify. Migrasi yang belum diterapkan akan dijalankan otomatis sebelum aplikasi dimulai. Jangan memakai `prisma migrate dev` atau `prisma migrate reset` di server produksi.

## Pengujian

Setelah deploy, buka:

```text
https://domain-anda.com/api/health
```

Respons yang benar berbentuk:

```json
{"status":"ok","timestamp":"..."}
```
