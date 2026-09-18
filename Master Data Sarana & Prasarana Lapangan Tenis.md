# Master Data Sarana & Prasarana Lapangan Tenis

Dokumen ini berisi struktur data yang digunakan untuk pendataan sarana dan prasarana lapangan tenis. Form dibuat sederhana agar mudah diisi, tetapi tetap mencakup informasi penting mengenai identitas, kondisi teknis, fasilitas, pengelola, dan operasional lapangan.

---

## 1. Identitas & Lokasi Lapangan

Data dasar mengenai identitas dan lokasi lapangan tenis.

### Input Data

- **Nama Lapangan**
  - Contoh: Lapangan Tenis Lumintang

- **Alamat Lengkap**
  - Menggunakan satu input text/textarea.
  - Tidak perlu memisahkan Kabupaten/Kota, Kecamatan, dan Desa/Kelurahan.
  - Contoh:
    `Jl. Mulawarman, Dauh Puri Kaja, Denpasar Utara, Kota Denpasar, Bali`

- **Lokasi Google Maps**
  - Pengguna dapat memasukkan link Google Maps atau memilih titik lokasi pada Maps.
  - Latitude dan longitude dapat disimpan otomatis oleh sistem dan tidak perlu ditampilkan sebagai input.

- **Deskripsi Lapangan**
  - Berisi penjelasan singkat mengenai lapangan.
  - Contoh:
    `Lapangan tenis outdoor yang memiliki 3 court dengan fasilitas pendukung.`

---

## 2. Data Teknis Lapangan

Bagian ini digunakan untuk mencatat spesifikasi dan kondisi teknis lapangan.

### Input Data

- **Jumlah Court**
  - Contoh: `3`

- **Jenis Lapangan**
  - Outdoor
  - Indoor
  - Semi Indoor

- **Jenis Permukaan**
  - Hard Court
  - Clay
  - Grass
  - Synthetic

- **Panjang Court**
  - Contoh: `23,77 meter`

- **Lebar Court**
  - Contoh: `10,97 meter`

- **Ruang Bebas Belakang**
  - Contoh: `6,40 meter`

- **Ruang Bebas Samping Kiri**
  - Contoh: `3,66 meter`

- **Ruang Bebas Samping Kanan**
  - Contoh: `3,66 meter`

- **Kondisi Permukaan**
  - Baik
  - Cukup
  - Perlu Perbaikan

- **Penerangan / Lampu**
  - Ada
  - Tidak Ada

- **Jumlah Lampu**
  - Diisi apabila lapangan memiliki penerangan.
  - Contoh: `8`

- **Kondisi Net**
  - Baik
  - Cukup
  - Rusak

---

## 3. Foto Lapangan

Digunakan sebagai dokumentasi kondisi lapangan.

### Input Data

- **Upload minimal 6 foto lapangan**
- Format dapat menggunakan JPG, JPEG, atau PNG.
- Pengguna dapat memilih salah satu foto sebagai **Foto Utama / Cover**.
- Tidak perlu memberikan keterangan untuk setiap foto.

Contoh:

- Foto 1
- Foto 2
- Foto 3
- Foto 4
- Foto 5
- Foto 6

Salah satu foto dapat ditandai sebagai:

`Foto Utama / Cover`

---

## 4. Sarana & Prasarana

Pengguna cukup memilih fasilitas yang tersedia menggunakan checkbox.

### Pilihan Fasilitas

- [ ] Toilet
- [ ] Kamar Mandi / Shower
- [ ] Ruang Ganti
- [ ] Tribun Penonton
- [ ] Kantin / Cafe
- [ ] Area Parkir
- [ ] Tempat Ibadah
- [ ] Ruang Tunggu
- [ ] Wi-Fi
- [ ] Papan Skor
- [ ] Kursi Wasit
- [ ] Ruang Pemain
- [ ] Security / Keamanan
- [ ] Lainnya

Jika memilih **Lainnya**, tampilkan input tambahan:

`Nama Fasilitas Lainnya: __________`

---

## 5. Pengelola Lapangan

Digunakan untuk menyimpan informasi pihak yang bertanggung jawab terhadap lapangan.

### Input Data

- **Nama Pengelola / Instansi**
  - Contoh: `PELTI Denpasar`

- **Nama PIC**
  - Contoh: `I Made ABC`

- **No. HP / WhatsApp**
  - Contoh: `081234567890`

---

## 6. Operasional Lapangan

Berisi informasi mengenai penggunaan dan operasional lapangan.

### Input Data

- **Status Lapangan**
  - Aktif
  - Renovasi
  - Tidak Aktif

- **Jam Operasional**
  - Jam Buka
  - Jam Tutup
  - Contoh: `06:00 - 22:00`

- **Akses Lapangan**
  - Umum
  - Anggota
  - Khusus

- **Harga Sewa / Jam**
  - Bersifat opsional.
  - Contoh: `Rp100.000 / jam`

---

## 7. Verifikasi & Grade Lapangan

Bagian ini **hanya dapat diisi oleh Admin PELTI** dan tidak ditampilkan sebagai input untuk pengguna biasa.

### Status Verifikasi

- Menunggu
- Terverifikasi
- Ditolak

### Grade Lapangan

- Grade A
- Grade B
- Grade C

### Catatan Admin

Admin dapat memberikan catatan mengenai hasil pemeriksaan atau penilaian lapangan.

Contoh:

`Kondisi lapangan baik dan fasilitas pertandingan memadai.`

### Data Otomatis Sistem

Sistem secara otomatis menyimpan:

- Tanggal Verifikasi
- Admin yang melakukan verifikasi

---

# Alur Pendataan

Alur pengisian data lapangan:

**Identitas & Lokasi**  
↓  
**Data Teknis Lapangan**  
↓  
**Foto Lapangan**  
↓  
**Sarana & Prasarana**  
↓  
**Pengelola Lapangan**  
↓  
**Operasional Lapangan**  
↓  
**Submit Data**  
↓  
**Verifikasi Admin PELTI**  
↓  
**Penentuan Grade A / B / C**

---

# Hak Akses

## Penginput / Admin Kabupaten

Dapat:

- Menambahkan data lapangan
- Mengisi identitas dan lokasi
- Mengisi data teknis
- Mengupload foto
- Memilih fasilitas
- Mengisi informasi pengelola
- Mengisi informasi operasional
- Mengirim data untuk diverifikasi

## Admin PELTI

Dapat:

- Melihat seluruh data lapangan
- Memeriksa data yang dikirim
- Memverifikasi atau menolak data
- Menentukan Grade A, B, atau C
- Memberikan catatan verifikasi

---

# Kesimpulan Struktur Form

Form Master Sarana & Prasarana Lapangan terdiri dari **7 bagian utama**:

1. Identitas & Lokasi Lapangan
2. Data Teknis Lapangan
3. Foto Lapangan
4. Sarana & Prasarana
5. Pengelola Lapangan
6. Operasional Lapangan
7. Verifikasi & Grade Lapangan

Struktur dibuat sederhana agar proses input tidak terlalu panjang, tetapi informasi utama mengenai lapangan tenis tetap tercatat dengan lengkap.