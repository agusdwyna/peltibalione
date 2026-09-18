# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Master Data Wasit Tenis PELTI Bali

**Nama Modul:** Master Data Wasit  
**Sistem:** Master Data PELTI Bali  
**Versi:** 1.0  
**Status:** Draft Development

---

# 1. Latar Belakang

PELTI Bali membutuhkan Master Data Wasit untuk mendata seluruh wasit tenis yang berada di masing-masing Kabupaten/Kota di Bali.

Data wasit dikelompokkan berdasarkan **Distrik PELTI**, sehingga PELTI Bali dapat mengetahui:

- Siapa saja wasit yang tersedia.
- Wasit berasal dari distrik mana.
- Status aktif wasit.
- Pengalaman sebagai wasit.
- Peran kewasitan yang dikuasai.
- Lisensi dan sertifikasi yang dimiliki.
- Turnamen yang pernah ditangani.
- Informasi kontak wasit.
- Ketersediaan untuk menerima penugasan.

---

# 2. Tujuan

Master Data Wasit bertujuan untuk:

1. Mendata seluruh wasit tenis di Bali.
2. Mengelompokkan wasit berdasarkan Distrik PELTI.
3. Mengetahui status aktif wasit.
4. Mengetahui pengalaman kewasitan.
5. Mengetahui peran/kualifikasi masing-masing wasit.
6. Menyimpan data lisensi dan sertifikasi.
7. Menyimpan riwayat turnamen yang pernah ditangani.
8. Mengetahui jumlah pengalaman turnamen.
9. Menyediakan informasi kontak wasit.
10. Mempermudah pencarian wasit ketika diperlukan untuk turnamen.
11. Memastikan data wasit melalui proses verifikasi admin.

---

# 3. Struktur Master Data Wasit

Form Master Data Wasit terdiri dari **7 bagian utama**:

1. Informasi Pribadi Wasit
2. Informasi Kewasitan
3. Lisensi & Sertifikasi
4. Riwayat Turnamen
5. Kontak Wasit
6. Informasi Tambahan
7. Verifikasi Admin

---

# 4. Informasi Pribadi Wasit

Bagian ini digunakan untuk menyimpan identitas dasar wasit.

## Foto Profil

**Tipe:** Upload Image  
**Wajib:** Ya

Format:

- JPG
- JPEG
- PNG

Foto digunakan sebagai foto profil wasit.

---

## Nama Lengkap

**Tipe:** Text  
**Wajib:** Ya

Contoh:

`I Made ABC`

---

## NIK

**Tipe:** Text  
**Wajib:** Ya

Contoh:

`5171XXXXXXXXXXXX`

Ketentuan:

- NIK harus unik.
- Digunakan sebagai identitas internal.
- NIK tidak ditampilkan pada halaman publik.

---

## Jenis Kelamin

**Tipe:** Select  
**Wajib:** Ya

Pilihan:

- Laki-laki
- Perempuan

---

## Tanggal Lahir

**Tipe:** Date  
**Wajib:** Ya

Contoh:

`12 Mei 1990`

Umur dihitung otomatis oleh sistem.

---

## Alamat Lengkap

**Tipe:** Textarea  
**Wajib:** Ya

Tidak perlu memisahkan Kabupaten, Kecamatan, dan Desa.

Contoh:

`Jl. Diponegoro No. 10, Tabanan, Bali`

---

## Distrik PELTI

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

Distrik digunakan sebagai pengelompokan utama wasit.

---

# 5. Informasi Kewasitan

Bagian ini merupakan informasi utama mengenai aktivitas dan pengalaman seorang wasit.

## Status Wasit

**Tipe:** Select  
**Wajib:** Ya

Pilihan:

- Aktif
- Tidak Aktif

Default:

`Aktif`

---

## Menjadi Wasit Sejak

**Tipe:** Year  
**Wajib:** Ya

Contoh:

`2018`

Sistem dapat menghitung lama pengalaman secara otomatis.

Contoh:

`8 Tahun Pengalaman`

---

## Peran Wasit

**Tipe:** Multi Select / Checkbox  
**Wajib:** Ya

Pilihan:

- Chair Umpire
- Line Umpire
- Referee
- Chief Umpire

Wasit dapat memiliki lebih dari satu peran.

Contoh:

`Chair Umpire, Line Umpire`

---

## Tingkat Wasit

**Tipe:** Select

Pilihan sederhana:

- Daerah
- Provinsi
- Nasional
- Internasional

Tingkat ini digunakan sebagai pengelompokan internal.

Detail kualifikasi resmi tetap mengikuti data lisensi atau sertifikasi yang dimiliki wasit.

---

## Jumlah Turnamen

**Tipe:** Otomatis / Read Only

Jumlah turnamen **tidak perlu diinput manual**.

Sistem menghitung berdasarkan jumlah data pada **Riwayat Turnamen**.

Contoh:

`24 Turnamen`

---

# 6. Lisensi & Sertifikasi

Satu wasit dapat mempunyai lebih dari satu lisensi atau sertifikat.

Gunakan tombol:

`+ Tambah Lisensi / Sertifikat`

---

## Nama Lisensi / Sertifikat

**Tipe:** Text

Contoh:

`Sertifikasi Officiating Level 1`

---

## Level / Tingkat

**Tipe:** Text

Contoh:

`Level 1`

atau sesuai dengan nama level pada sertifikat yang dimiliki.

---

## Penyelenggara

**Tipe:** Text

Contoh:

`PELTI`

---

## Tahun Diperoleh

**Tipe:** Year

Contoh:

`2024`

---

## Upload Sertifikat

**Tipe:** File Upload

Format:

- PDF
- JPG
- JPEG
- PNG

---

## Contoh Data

**Nama Sertifikat:** Sertifikasi Officiating Level 1  
**Level:** Level 1  
**Penyelenggara:** PELTI  
**Tahun:** 2024  
**Dokumen:** sertifikat.pdf

---

# 7. Riwayat Turnamen

Bagian ini digunakan untuk mencatat pengalaman nyata wasit dalam suatu turnamen.

Satu wasit dapat memiliki **banyak riwayat turnamen**.

Gunakan tombol:

`+ Tambah Pengalaman Turnamen`

---

## Nama Turnamen

**Tipe:** Text / Select  
**Wajib:** Ya

Contoh:

`Bali Open 2026`

Jika Master Turnamen sudah tersedia, field ini nantinya menggunakan pilihan dari **Master Turnamen**.

---

## Tahun Turnamen

**Tipe:** Year

Contoh:

`2026`

---

## Tingkat Turnamen

**Tipe:** Select

Pilihan:

- Kabupaten/Kota
- Provinsi
- Nasional
- Internasional

---

## Peran Saat Bertugas

**Tipe:** Select

Pilihan:

- Chair Umpire
- Line Umpire
- Referee
- Chief Umpire

---

## Lokasi Turnamen

**Tipe:** Text

Contoh:

`Denpasar, Bali`

---

## Contoh Riwayat

### Bali Open 2026

**Tingkat:** Provinsi  
**Peran:** Chair Umpire  
**Lokasi:** Denpasar, Bali

### Porprov Bali 2025

**Tingkat:** Provinsi  
**Peran:** Referee  
**Lokasi:** Bali

### Kejurnas Junior 2024

**Tingkat:** Nasional  
**Peran:** Chair Umpire  
**Lokasi:** Jakarta

---

# 8. Kontak Wasit

Bagian kontak dibuat sederhana agar wasit mudah dihubungi ketika diperlukan.

## Nomor HP / WhatsApp

**Tipe:** Text  
**Wajib:** Ya

Contoh:

`081234567890`

---

## Email

**Tipe:** Email  
**Wajib:** Tidak

Contoh:

`wasit@email.com`

---

## Instagram / Social Media

**Tipe:** Text  
**Wajib:** Tidak

Contoh:

`@namawasit`

---

## Bersedia Menerima Penugasan

**Tipe:** Radio / Switch

Pilihan:

- Ya
- Tidak

Digunakan untuk mengetahui apakah wasit saat ini bersedia menerima penugasan pada turnamen.

---

# 9. Informasi Tambahan

Bagian ini tidak perlu dibuat terlalu banyak input.

Cukup digunakan untuk menyimpan informasi tambahan mengenai pengalaman wasit.

## Pengalaman / Catatan Kewasitan

**Tipe:** Textarea

Contoh:

`Aktif menjadi wasit tenis sejak tahun 2018 dan telah bertugas pada berbagai turnamen tingkat Kabupaten/Kota, Provinsi, dan Nasional.`

---

## Catatan Tambahan

**Tipe:** Textarea  
**Wajib:** Tidak

Digunakan apabila terdapat informasi tambahan yang perlu dicatat mengenai wasit.

---

# 10. Verifikasi Admin

Bagian ini hanya dapat digunakan oleh admin yang mempunyai hak untuk melakukan verifikasi.

Wasit atau penginput data biasa tidak perlu mengisi bagian ini.

## Status Verifikasi

**Tipe:** Select

Pilihan:

- Menunggu
- Terverifikasi
- Ditolak

Default ketika data baru dibuat:

`Menunggu`

---

## Catatan Admin

**Tipe:** Textarea

Contoh ketika diterima:

`Identitas dan dokumen sertifikasi wasit telah diperiksa dan dinyatakan lengkap.`

Contoh ketika ditolak:

`Dokumen sertifikat belum jelas. Silakan upload kembali dokumen sertifikat.`

---

## Data Verifikasi Otomatis

Ketika admin melakukan verifikasi, sistem otomatis menyimpan:

- Tanggal Verifikasi
- Waktu Verifikasi
- Admin yang melakukan verifikasi

Data tersebut tidak perlu diinput manual.

---

# 11. Alur Pendataan Wasit

Alur pendataan:

**Tambah Data Wasit**

↓

**Informasi Pribadi**

↓

**Informasi Kewasitan**

↓

**Lisensi & Sertifikasi**

↓

**Riwayat Turnamen**

↓

**Kontak Wasit**

↓

**Informasi Tambahan**

↓

**Submit**

↓

**Menunggu Verifikasi**

↓

**Admin Memeriksa Data**

↓

### Jika Data Sesuai

**Terverifikasi**

### Jika Data Tidak Sesuai

**Ditolak + Catatan Admin**

---

# 12. Halaman Master Wasit

Halaman utama menampilkan daftar seluruh wasit.

Kolom tabel cukup:

| Kolom | Keterangan |
|---|---|
| Foto | Foto wasit |
| Nama | Nama lengkap |
| Distrik | Distrik PELTI |
| Peran | Chair Umpire / Referee / dll |
| Pengalaman | Lama menjadi wasit |
| Turnamen | Jumlah turnamen |
| Status | Aktif / Tidak Aktif |
| Verifikasi | Status verifikasi |
| Aksi | Detail / Edit |

Tidak semua informasi perlu dimunculkan di tabel.

Data lengkap ditampilkan pada **Detail Wasit**.

---

# 13. Filter Data Wasit

Sediakan filter sederhana:

## Pencarian

Pencarian berdasarkan:

- Nama Wasit
- NIK

## Distrik

- Semua Distrik
- Denpasar
- Badung
- Tabanan
- Gianyar
- Bangli
- Klungkung
- Karangasem
- Buleleng
- Jembrana

## Peran Wasit

- Semua
- Chair Umpire
- Line Umpire
- Referee
- Chief Umpire

## Status

- Semua
- Aktif
- Tidak Aktif

## Verifikasi

- Semua
- Menunggu
- Terverifikasi
- Ditolak

---

# 14. Detail Wasit

Halaman detail menampilkan profil lengkap.

Contoh:

# I Made ABC

**Distrik:** PELTI Tabanan  
**Status:** Aktif  
**Menjadi Wasit Sejak:** 2018  
**Pengalaman:** 8 Tahun  
**Peran:** Chair Umpire, Referee  
**Tingkat:** Nasional  
**Jumlah Turnamen:** 24 Turnamen  
**Bersedia Ditugaskan:** Ya

---

## Lisensi & Sertifikasi

**Sertifikasi Officiating Level 1**  
PELTI — 2022

**Sertifikasi Officiating Level 2**  
PELTI — 2024

---

## Riwayat Turnamen

**Bali Open 2026**  
Chair Umpire · Provinsi · Denpasar

**Porprov Bali 2025**  
Referee · Provinsi · Bali

**Kejurnas Junior 2024**  
Chair Umpire · Nasional · Jakarta

---

## Kontak

**WhatsApp:** 081234567890  
**Email:** wasit@email.com

---

# 15. Integrasi dengan Master Turnamen

Pada tahap awal, riwayat turnamen dapat dimasukkan secara manual.

Namun ketika sistem sudah mempunyai **Master Turnamen**, data wasit sebaiknya dihubungkan langsung dengan turnamen.

Konsep relasi:

**WASIT**

↓

**PENUGASAN WASIT**

↓

**TURNAMEN**

Contoh:

`Bali Open 2026`

memiliki:

- Referee → I Made A
- Chief Umpire → I Wayan B
- Chair Umpire → I Nyoman C
- Line Umpire → I Ketut D

Dengan demikian, riwayat turnamen pada profil wasit dapat terbentuk otomatis berdasarkan penugasan.

---

# 16. Validasi Data

Sistem harus memiliki validasi dasar:

### NIK

- Wajib.
- Harus unik.
- Tidak boleh digunakan oleh dua wasit berbeda.

### Nama

- Wajib diisi.

### Distrik

- Wajib dipilih.

### Peran Wasit

- Minimal satu peran.

### Nomor WhatsApp

- Wajib diisi.

### Foto

- Harus menggunakan format gambar yang diizinkan.

### Sertifikat

- File harus menggunakan format yang diizinkan.

---

# 17. Privasi Data

Data tertentu hanya boleh dilihat oleh admin.

## Data Internal

- NIK
- Alamat lengkap
- Dokumen sertifikat tertentu
- Catatan admin
- Informasi verifikasi internal

## Data Profil yang Dapat Ditampilkan

Jika nantinya dibuat direktori wasit publik, dapat menampilkan:

- Foto
- Nama
- Distrik
- Peran Wasit
- Tingkat
- Pengalaman
- Lisensi/Sertifikasi
- Riwayat Turnamen
- Jumlah Turnamen
- Status bersedia menerima penugasan
- Kontak yang diizinkan

---

# 18. Struktur Data Utama

Secara konsep database dapat dipisahkan menjadi:

## `officials`

Menyimpan:

- Identitas wasit
- Distrik
- Informasi kewasitan
- Kontak
- Status
- Informasi verifikasi

## `official_certificates`

Menyimpan:

- Wasit
- Nama sertifikat
- Level
- Penyelenggara
- Tahun
- File sertifikat

Relasi:

`1 Wasit → Banyak Sertifikat`

## `official_tournament_histories`

Menyimpan:

- Wasit
- Turnamen
- Tahun
- Tingkat
- Peran
- Lokasi

Relasi:

`1 Wasit → Banyak Riwayat Turnamen`

Jika nantinya Master Turnamen sudah terintegrasi, tabel riwayat dapat dikembangkan menjadi tabel **penugasan wasit** yang terhubung langsung dengan turnamen.

---

# 19. Ringkasan Master Data Wasit

## 1. Informasi Pribadi

- Foto Profil
- Nama Lengkap
- NIK
- Jenis Kelamin
- Tanggal Lahir
- Alamat Lengkap
- Distrik PELTI

## 2. Informasi Kewasitan

- Status Wasit
- Menjadi Wasit Sejak
- Peran Wasit
- Tingkat Wasit
- Jumlah Turnamen otomatis

## 3. Lisensi & Sertifikasi

- Nama Lisensi
- Level
- Penyelenggara
- Tahun
- Upload Sertifikat
- Dapat memiliki lebih dari satu sertifikat

## 4. Riwayat Turnamen

- Nama Turnamen
- Tahun
- Tingkat Turnamen
- Peran Saat Bertugas
- Lokasi Turnamen
- Dapat memiliki banyak riwayat turnamen

## 5. Kontak

- WhatsApp
- Email
- Instagram / Social Media
- Bersedia menerima penugasan

## 6. Informasi Tambahan

- Pengalaman / Catatan Kewasitan
- Catatan Tambahan

## 7. Verifikasi Admin

- Status Verifikasi
- Catatan Admin
- Tanggal Verifikasi otomatis
- Verifikator otomatis

---

# 20. Kesimpulan

Master Data Wasit menjadi pusat pendataan seluruh wasit tenis yang berada di bawah PELTI Bali.

Sistem harus dapat menjawab informasi utama:

**Siapa wasitnya → berasal dari distrik mana → sudah berapa lama menjadi wasit → memiliki peran apa → tingkat kewasitannya → lisensi apa yang dimiliki → pernah bertugas di turnamen apa saja → berapa jumlah turnamen yang pernah ditangani → bagaimana menghubunginya → apakah bersedia ditugaskan → apakah datanya sudah diverifikasi.**

Data Master Wasit nantinya dapat diintegrasikan dengan **Master Turnamen**, sehingga penugasan dan riwayat turnamen wasit dapat tercatat secara otomatis.