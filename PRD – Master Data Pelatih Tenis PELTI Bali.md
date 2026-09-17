# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Master Data Pelatih Tenis PELTI Bali

**Nama Modul:** Master Data Pelatih  
**Sistem:** Master Data PELTI Bali  
**Versi:** 1.0  
**Status:** Draft Development

---

# 1. Latar Belakang

PELTI Bali membutuhkan sistem pendataan pelatih tenis yang terpusat agar data pelatih dari seluruh Kabupaten/Kota di Bali dapat tercatat dan dikelola dalam satu sistem.

Data pelatih dikelompokkan berdasarkan **Distrik PELTI Kabupaten/Kota**, sehingga PELTI Bali dapat mengetahui jumlah dan profil pelatih dari masing-masing wilayah.

Contoh:

- PELTI Denpasar
- PELTI Badung
- PELTI Tabanan
- PELTI Gianyar
- PELTI Bangli
- PELTI Klungkung
- PELTI Karangasem
- PELTI Buleleng
- PELTI Jembrana

Sistem tidak hanya menyimpan identitas pelatih, tetapi juga informasi kepelatihan, tempat/club melatih, jumlah atlet yang dilatih, lisensi dan sertifikasi, serta informasi kontak.

---

# 2. Tujuan

Master Data Pelatih bertujuan untuk:

1. Mendata seluruh pelatih tenis di Bali.
2. Mengelompokkan pelatih berdasarkan Distrik PELTI.
3. Mengetahui status aktif pelatih.
4. Mengetahui tempat atau club tempat pelatih melakukan kegiatan kepelatihan.
5. Mengetahui kategori atlet yang dilatih.
6. Mengetahui jumlah atlet yang sedang dilatih.
7. Menyimpan data lisensi dan sertifikasi pelatih.
8. Menyimpan pengalaman dan prestasi pelatih.
9. Menyediakan informasi kontak pelatih.
10. Mempermudah PELTI Bali melakukan monitoring data pelatih.
11. Menyediakan proses verifikasi data oleh admin.

---

# 3. Hak Akses

## 3.1 Admin PELTI Kabupaten/Kota

Admin Distrik dapat:

- Melihat data pelatih pada distriknya.
- Menambahkan data pelatih.
- Mengubah data pelatih.
- Mengupload foto pelatih.
- Mengupload sertifikat/lisensi.
- Melihat status verifikasi.
- Mengirim data untuk diverifikasi.

Contoh:

Admin PELTI Tabanan mengelola data pelatih yang berada di Distrik PELTI Tabanan.

---

## 3.2 Admin PELTI Bali

Admin PELTI Bali dapat:

- Melihat seluruh data pelatih di Bali.
- Melihat pelatih berdasarkan distrik.
- Menambahkan data pelatih.
- Mengubah data pelatih.
- Melakukan verifikasi data.
- Menolak data.
- Memberikan catatan verifikasi.
- Melihat statistik jumlah pelatih.
- Melakukan pencarian dan filter data.

---

# 4. Struktur Form Master Pelatih

Form Master Pelatih dibagi menjadi **6 bagian utama**:

1. Informasi Pribadi
2. Informasi Kepelatihan
3. Lisensi & Sertifikasi
4. Kontak Pelatih
5. Informasi Tambahan
6. Verifikasi Admin

---

# 5. Informasi Pribadi

Bagian ini berisi identitas utama pelatih.

## Field

### Foto Profil

**Tipe:** Upload Image

Digunakan sebagai foto profil pelatih.

Format:

- JPG
- JPEG
- PNG

---

### Nama Lengkap

**Tipe:** Text  
**Wajib:** Ya

Contoh:

`I Made ABC`

---

### NIK

**Tipe:** Text / Number  
**Wajib:** Ya

Contoh:

`5171XXXXXXXXXXXX`

Ketentuan:

- NIK digunakan sebagai identitas internal.
- NIK harus unik.
- NIK tidak ditampilkan pada halaman publik.

---

### Jenis Kelamin

**Tipe:** Select  
**Wajib:** Ya

Pilihan:

- Laki-laki
- Perempuan

---

### Tanggal Lahir

**Tipe:** Date  
**Wajib:** Ya

Contoh:

`12 Mei 1985`

Umur dapat dihitung otomatis oleh sistem berdasarkan tanggal lahir.

---

### Alamat Lengkap

**Tipe:** Textarea  
**Wajib:** Ya

Alamat tidak perlu dipisahkan menjadi Provinsi, Kabupaten, Kecamatan, dan Desa.

Contoh:

`Jl. Diponegoro No. 10, Tabanan, Bali`

---

### Distrik PELTI

**Tipe:** Select  
**Wajib:** Ya

Pilihan:

- Denpasar
- Badung
- Tabanan
- Gianyar
- Bangli
- Klungkung
- Karangasem
- Buleleng
- Jembrana

Distrik digunakan sebagai pengelompokan utama data pelatih.

---

# 6. Informasi Kepelatihan

Bagian ini menyimpan informasi mengenai aktivitas pelatih.

### Status Pelatih

**Tipe:** Select  
**Wajib:** Ya

Pilihan:

- Aktif
- Tidak Aktif

Default:

`Aktif`

---

### Mulai Melatih Sejak

**Tipe:** Year / Number

Contoh:

`2015`

Sistem dapat menghitung pengalaman:

`2026 - 2015 = 11 Tahun Pengalaman`

---

### Tempat / Club Melatih

**Tipe:** Text

Contoh:

`Tabanan Tennis Club`

Untuk tahap awal cukup menggunakan text.

Jika nantinya terdapat Master Club, field ini dapat dihubungkan dengan data club.

---

### Kategori Atlet yang Dilatih

**Tipe:** Multi Select

Pilihan:

- Junior
- Senior
- Semua Umur

Pengguna dapat memilih sesuai kategori atlet yang biasa dilatih.

---

### Jumlah Atlet Aktif Dilatih

**Tipe:** Number

Contoh:

`15`

Berarti pelatih saat ini memiliki sekitar 15 atlet aktif yang dilatih.

Pada pengembangan berikutnya, jumlah ini dapat dihitung otomatis apabila Master Atlet sudah dihubungkan dengan Master Pelatih.

---

### Spesialisasi Pelatih

**Tipe:** Multi Select

Pilihan:

- Teknik
- Fisik
- Taktik
- Performance
- Fundamental
- Umum
- Lainnya

Jika memilih:

`Lainnya`

munculkan input:

`Spesialisasi Lainnya`

---

# 7. Lisensi & Sertifikasi

Bagian ini digunakan untuk menyimpan lisensi, sertifikat, atau pendidikan kepelatihan yang pernah diperoleh.

Satu pelatih dapat mempunyai **lebih dari satu sertifikat**.

Gunakan tombol:

`+ Tambah Lisensi / Sertifikat`

---

## Data Sertifikat

### Nama Lisensi / Sertifikat

**Tipe:** Text

Contoh:

`Lisensi Pelatih Tenis Level 1`

---

### Level / Tingkat

**Tipe:** Text

Contoh:

`Level 1`

atau:

`Nasional`

---

### Penyelenggara

**Tipe:** Text

Contoh:

`PELTI`

---

### Tahun Diperoleh

**Tipe:** Year

Contoh:

`2024`

---

### File Sertifikat

**Tipe:** Upload

Format yang diperbolehkan:

- PDF
- JPG
- JPEG
- PNG

---

## Contoh

Pelatih dapat mempunyai:

**Sertifikat 1**

Nama:
`Lisensi Pelatih Level 1`

Penyelenggara:
`PELTI`

Tahun:
`2022`

---

**Sertifikat 2**

Nama:
`National Tennis Coaching Course`

Penyelenggara:
`PELTI`

Tahun:
`2024`

---

# 8. Kontak Pelatih

Bagian ini digunakan agar pelatih dapat dihubungi apabila diperlukan.

### Nomor HP / WhatsApp

**Tipe:** Text  
**Wajib:** Ya

Contoh:

`081234567890`

---

### Email

**Tipe:** Email  
**Wajib:** Tidak

Contoh:

`pelatih@email.com`

---

### Instagram / Social Media

**Tipe:** Text  
**Wajib:** Tidak

Contoh:

`@namapelatih`

---

### Bersedia Menerima Atlet Baru

**Tipe:** Radio / Switch

Pilihan:

- Ya
- Tidak

Field ini dapat digunakan apabila ke depan direktori pelatih ditampilkan kepada masyarakat.

---

# 9. Informasi Tambahan

Bagian ini digunakan untuk informasi yang tidak perlu dibuat menjadi banyak field.

### Pengalaman / Prestasi Pelatih

**Tipe:** Textarea

Contoh:

`Pelatih Tabanan Tennis Club sejak 2015. Pernah mendampingi atlet pada Porprov Bali dan berbagai kejuaraan tenis junior tingkat daerah dan nasional.`

---

### Catatan Tambahan

**Tipe:** Textarea  
**Wajib:** Tidak

Digunakan jika terdapat informasi tambahan mengenai pelatih.

---

# 10. Verifikasi Admin

Bagian ini **hanya dapat diakses oleh Admin yang memiliki hak verifikasi**.

Pelatih atau penginput biasa tidak perlu mengisi bagian ini.

---

## Status Verifikasi

Pilihan:

- Menunggu
- Terverifikasi
- Ditolak

Default ketika data pertama dibuat:

`Menunggu`

---

## Catatan Admin

**Tipe:** Textarea

Contoh:

`Data pelatih dan sertifikat telah diperiksa dan dinyatakan lengkap.`

Jika ditolak, admin dapat memberikan alasan.

Contoh:

`Dokumen sertifikat belum jelas. Silakan upload kembali.`

---

## Data Otomatis

Ketika admin melakukan verifikasi, sistem menyimpan:

- Tanggal Verifikasi
- Waktu Verifikasi
- Admin yang melakukan verifikasi

Data tersebut tidak perlu diinput manual.

---

# 11. Alur Pendataan Pelatih

Alur utama:

**Admin Kabupaten / Penginput**

↓

**Tambah Pelatih**

↓

**Informasi Pribadi**

↓

**Informasi Kepelatihan**

↓

**Lisensi & Sertifikasi**

↓

**Kontak Pelatih**

↓

**Informasi Tambahan**

↓

**Submit**

↓

**Status: Menunggu Verifikasi**

↓

**Admin Verifikator Memeriksa Data**

↓

Jika sesuai:

**Terverifikasi**

Jika tidak sesuai:

**Ditolak + Catatan**

---

# 12. Halaman Daftar Pelatih

Sistem menyediakan halaman:

# Master Pelatih

Data ditampilkan dalam tabel.

Kolom utama:

| Kolom | Keterangan |
|---|---|
| Foto | Foto profil |
| Nama Pelatih | Nama lengkap |
| Distrik | Asal PELTI |
| Club / Tempat Melatih | Tempat melatih |
| Pengalaman | Lama melatih |
| Jumlah Atlet | Atlet aktif |
| Status | Aktif / Tidak Aktif |
| Verifikasi | Menunggu / Terverifikasi / Ditolak |
| Aksi | Detail / Edit |

Tidak semua informasi perlu ditampilkan pada tabel.

Informasi lengkap ditampilkan pada halaman **Detail Pelatih**.

---

# 13. Filter Data

Halaman Master Pelatih menyediakan filter sederhana.

### Pencarian

Pencarian berdasarkan:

- Nama Pelatih
- NIK
- Club / Tempat Melatih

### Filter Distrik

Contoh:

`Semua Distrik`

`Denpasar`

`Badung`

`Tabanan`

`Gianyar`

dan seterusnya.

### Filter Status

- Semua
- Aktif
- Tidak Aktif

### Filter Verifikasi

- Semua
- Menunggu
- Terverifikasi
- Ditolak

---

# 14. Detail Pelatih

Ketika pengguna membuka salah satu pelatih, sistem menampilkan profil lengkap.

Contoh:

## I Made ABC

**Distrik:** PELTI Tabanan

**Status:** Aktif

**Pengalaman:** 11 Tahun

**Club:** Tabanan Tennis Club

**Spesialisasi:** Teknik & Fundamental

**Kategori:** Junior

**Jumlah Atlet:** 15 Atlet

**WhatsApp:** 081234567890

---

## Lisensi

**Lisensi Pelatih Level 1**  
PELTI — 2022

**National Coaching Course**  
PELTI — 2024

---

## Pengalaman

Pelatih Tabanan Tennis Club sejak tahun 2015 dan pernah mendampingi atlet dalam berbagai kejuaraan.

---

# 15. Statistik Pelatih

Admin PELTI Bali dapat melihat statistik sederhana seperti:

**Total Pelatih**

`125 Pelatih`

**Pelatih Aktif**

`110 Pelatih`

**Pelatih Tidak Aktif**

`15 Pelatih`

Data juga dapat dilihat berdasarkan distrik.

Contoh:

| Distrik | Jumlah Pelatih |
|---|---:|
| Denpasar | 25 |
| Badung | 20 |
| Tabanan | 15 |
| Gianyar | 18 |
| Buleleng | 12 |

Angka di atas hanya contoh tampilan, bukan data sebenarnya.

---

# 16. Relasi dengan Master Atlet

Pada pengembangan berikutnya, Master Pelatih dapat dihubungkan dengan Master Atlet.

Relasi:

**Pelatih**

↓

**Memiliki / Melatih Banyak Atlet**

Contoh:

`I Made ABC`

↓

- Atlet A
- Atlet B
- Atlet C
- Atlet D

Dengan sistem tersebut, field:

**Jumlah Atlet Aktif Dilatih**

tidak perlu lagi diketik manual.

Sistem menghitung otomatis berdasarkan jumlah atlet yang masih aktif dan terhubung dengan pelatih.

Contoh:

`15 Atlet Aktif`

Kemudian pada Detail Pelatih dapat tersedia menu:

`Lihat Atlet yang Dilatih`

---

# 17. Validasi Data

Sistem harus melakukan validasi dasar.

### NIK

- Wajib diisi.
- Tidak boleh duplikat.
- Digunakan untuk identifikasi internal.

### Nama

- Wajib diisi.

### Distrik

- Wajib dipilih.

### Nomor WhatsApp

- Wajib diisi.

### Foto

- Validasi format file.

### Sertifikat

- Validasi format file.
- Maksimal ukuran file ditentukan oleh sistem.

---

# 18. Keamanan Data

Beberapa data pelatih merupakan data internal dan tidak boleh ditampilkan secara bebas.

### Data Internal

- NIK
- Alamat lengkap
- Catatan admin
- Dokumen sertifikat tertentu
- Informasi internal verifikasi

### Data yang Dapat Ditampilkan pada Direktori Publik

Jika nantinya dibuat Direktori Pelatih:

- Foto
- Nama
- Distrik
- Club
- Spesialisasi
- Pengalaman
- Lisensi
- Jumlah atlet
- Status menerima atlet baru
- Kontak yang diizinkan

---

# 19. Struktur Data Utama

Secara konsep database dapat dipisahkan menjadi:

### `coaches`

Menyimpan:

- Identitas pelatih
- Distrik
- Informasi kepelatihan
- Kontak
- Status
- Informasi verifikasi

### `coach_certificates`

Menyimpan:

- Pelatih
- Nama sertifikat
- Level
- Penyelenggara
- Tahun
- File sertifikat

Relasi:

`1 Pelatih → Banyak Sertifikat`

Pada pengembangan berikutnya dapat ditambahkan:

### `coach_athletes`

Digunakan untuk menghubungkan:

`Pelatih ↔ Atlet`

Sehingga satu pelatih dapat memiliki banyak atlet.

---

# 20. Ringkasan Form

Form input Master Pelatih terdiri dari:

## 1. Informasi Pribadi

- Foto Profil
- Nama Lengkap
- NIK
- Jenis Kelamin
- Tanggal Lahir
- Alamat Lengkap
- Distrik PELTI

## 2. Informasi Kepelatihan

- Status Pelatih
- Mulai Melatih Sejak
- Tempat / Club Melatih
- Kategori Atlet
- Jumlah Atlet Aktif
- Spesialisasi

## 3. Lisensi & Sertifikasi

- Nama Lisensi
- Level
- Penyelenggara
- Tahun
- Upload Sertifikat
- Bisa tambah lebih dari satu

## 4. Kontak

- WhatsApp
- Email
- Instagram / Social Media
- Bersedia menerima atlet baru

## 5. Informasi Tambahan

- Pengalaman / Prestasi
- Catatan Tambahan

## 6. Verifikasi Admin

- Status Verifikasi
- Catatan Admin
- Tanggal Verifikasi otomatis
- Verifikator otomatis

---

# 21. Kesimpulan

Master Data Pelatih digunakan sebagai pusat pendataan seluruh pelatih tenis yang berada di bawah PELTI Bali.

Struktur dibuat sederhana agar proses input tidak terlalu rumit, tetapi tetap mampu memberikan informasi penting mengenai:

**Siapa pelatihnya → berasal dari distrik mana → melatih di mana → sudah berapa lama melatih → spesialisasinya apa → memiliki lisensi apa → berapa atlet yang dilatih → bagaimana menghubungi pelatih → apakah datanya sudah diverifikasi.**

Dengan struktur tersebut, Master Pelatih juga dapat dikembangkan dan diintegrasikan dengan **Master Atlet, Master Club, Master Lapangan, data pertandingan, serta sistem statistik PELTI Bali** pada tahap berikutnya.