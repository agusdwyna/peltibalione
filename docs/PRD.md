# PRD — Pelti Bali Data Center

## Phase 1 — Foundation & Player Registry

**Status:** Draft v0.2 — Business Rules Locked
**Scope:** Foundation, Organization, Account, Public Registration, Player Registry
**Target:** Web Application

---

# 1. Product Overview

Pelti Bali membutuhkan sebuah **Central Data Center** sebagai sumber data terpusat untuk mendata dan mengelola informasi pemain tenis di seluruh Kabupaten/Kota di Bali.

Phase 1 difokuskan pada fondasi sistem dan pendataan pemain.

Sistem memungkinkan:

* Admin Pusat mengelola seluruh sistem;
* Admin Kabupaten/Kota mengelola data pada wilayahnya;
* Admin Kabupaten/Kota membuat dan mengekspos form pendaftaran;
* masyarakat/pemain melakukan submission tanpa wajib memiliki akun;
* submission diproses menjadi master data pemain;
* pemain yang telah terdaftar dapat mengaktifkan akun;
* satu akun dapat memiliki beberapa role;
* data pemain dapat diperbarui melalui mekanisme terkontrol;
* data sensitif memiliki workflow verifikasi;
* perubahan penting memiliki audit trail.

---

# 2. Tujuan Produk

Phase 1 memiliki tujuan:

1. Membuat database pemain Pelti Bali yang terpusat.
2. Menghilangkan ketergantungan pada pendataan terpisah melalui Google Form/Spreadsheet.
3. Menyediakan struktur Kabupaten/Kota sebagai scope pengelolaan data.
4. Menyediakan manajemen akun Admin Pusat.
5. Menyediakan manajemen akun Admin Kabupaten/Kota.
6. Menyediakan akun pemain yang terhubung dengan data identitas pemain.
7. Menyediakan public registration tanpa mewajibkan login.
8. Menjaga kredibilitas data melalui proses verifikasi.
9. Menyimpan bukti dan histori perubahan data jika diperlukan.
10. Menjadi fondasi untuk pengembangan modul Pelatih, Wasit, Satpras, dan Competition Management di fase berikutnya.

---

# 3. Non-Goals Phase 1

Fitur berikut **tidak termasuk dalam scope Phase 1**:

* Modul Pelatih
* Modul Wasit
* Modul Satpras / Sarana-Prasarana
* Competition Management
* Tournament Management
* Draw Management
* Match Management
* Scoring Management
* Ranking Engine
* Integrasi sistem kompetisi lama
* Sistem pembayaran
* Membership / payment system
* Mobile application
* Public directory pemain
* Public player search
* Integrasi eksternal PNP secara otomatis

Struktur sistem harus tetap memungkinkan fitur tersebut ditambahkan pada fase berikutnya.

---

# 4. Product Principles

## 4.1 Account ≠ Player

Akun pengguna bukan merupakan master data pemain.

```text
User Account
      │
      ↓
Person
      │
      ↓
Player Profile
```

Seseorang dapat memiliki akun tanpa membuat Player baru.

Sebaliknya, Player dapat exist tanpa memiliki akun.

---

## 4.2 One Person, One Identity

Satu individu hanya memiliki satu master identity dalam sistem.

Akun tidak boleh membuat duplicate Player hanya karena pengguna melakukan registrasi ulang.

---

## 4.3 One Account Can Have Multiple Roles

Satu akun dapat memiliki beberapa role.

Contoh:

```text
User
├── Player
├── Coach       (Future)
└── Referee     (Future)
```

Phase 1 hanya mengaktifkan role:

```text
CENTRAL_ADMIN
DISTRICT_ADMIN
PLAYER
```

Model data harus mendukung multi-role sejak awal.

---

## 4.4 Account Is Bound to NIK

Akun individu terikat dengan identitas berdasarkan NIK.

NIK digunakan sebagai identity binding / matching attribute, bukan sebagai primary key database.

```text
User
   │
   └── NIK
         ↓
      Person
         ↓
      Player
```

NIK harus diperlakukan sebagai sensitive personal data.

---

## 4.5 Submission Does Not Require Login

Public registration dapat dilakukan tanpa login.

```text
Public User
     ↓
Public Form
     ↓
Submission
```

Submission kemudian diproses oleh Admin Kabupaten.

Setelah Player berhasil dibuat dan diverifikasi, sistem dapat mengarahkan pengguna untuk mengaktifkan akun.

---

# 5. Organization Structure

Kabupaten/Kota merupakan **master data**.

Daftar Kabupaten/Kota tidak dibuat secara manual oleh admin melalui UI.

Data Kabupaten/Kota menggunakan **seed data**.

```text
Pelti Bali
│
├── Badung
├── Bangli
├── Buleleng
├── Denpasar
├── Gianyar
├── Jembrana
├── Karangasem
├── Klungkung
└── Tabanan
```

Master Kabupaten/Kota digunakan sebagai scope data dan authorization.

---

# 6. User Roles

Phase 1 memiliki tiga role utama:

```text
CENTRAL_ADMIN
DISTRICT_ADMIN
PLAYER
```

Satu User dapat memiliki lebih dari satu role.

---

# 7. Central Admin

Central Admin merupakan administrator tingkat Pelti Bali.

Sistem mendukung **multiple Central Admin**.

Hak akses:

* melihat seluruh data;
* mengelola Admin Pusat;
* mengelola Admin Kabupaten;
* melihat seluruh Kabupaten/Kota;
* melihat seluruh pemain;
* melakukan final verification;
* mengelola konfigurasi master data;
* mengelola kelompok umur;
* mengelola status pemain;
* melihat audit log;
* melakukan tindakan administratif tingkat pusat.

Central Admin tidak terikat pada satu Kabupaten/Kota.

---

# 8. District Admin

District Admin merupakan administrator tingkat Kabupaten/Kota.

Sistem mendukung **multiple District Admin dalam satu Kabupaten/Kota**.

Contoh:

```text
Badung
├── Admin Badung A
├── Admin Badung B
└── Admin Badung C
```

Semua Admin Badung memiliki scope:

```text
districtId = BADUNG
```

District Admin:

* dapat melihat pemain di Kabupaten/Kota-nya;
* dapat membuat public registration form;
* dapat melihat submission dari form tersebut;
* dapat melakukan verifikasi sesuai kewenangan;
* dapat membantu mengelola data pemain;
* dapat melakukan aksi administratif terhadap pemain sesuai permission;
* dapat mengajukan perubahan Kabupaten pemain;
* dapat melihat audit data wilayahnya.

District Admin tidak dapat mengakses data Kabupaten/Kota lain.

---

# 9. Player Account

Player Account digunakan oleh individu untuk mengakses data pemain yang terhubung dengannya.

Player Account:

* dapat melihat profil sendiri;
* dapat memperbarui data yang diperbolehkan;
* dapat mengajukan perubahan data;
* dapat menginput PNP ranking;
* dapat melihat status pengajuan;
* dapat melihat histori perubahan miliknya.

Player tidak dapat:

* melihat pemain lain;
* mengubah pemain lain;
* melakukan verifikasi;
* mengubah Kabupaten secara langsung;
* membuat master Player lain melalui akun sendiri.

---

# 10. Account Lifecycle

Player dapat exist tanpa account.

Lifecycle:

```text
PUBLIC SUBMISSION
       ↓
DISTRICT REVIEW
       ↓
PLAYER CREATED
       ↓
VERIFIED
       ↓
ACCOUNT INVITATION
       ↓
ACCOUNT ACTIVATION
       ↓
ACTIVE ACCOUNT
```

Aktivasi akun dilakukan setelah Player berhasil dibuat dan memenuhi kondisi verifikasi yang ditetapkan sistem.

---

# 11. Account Activation

Setelah Player berhasil diverifikasi, sistem dapat memberikan mekanisme:

> **Aktifkan Akun Anda**

Player kemudian melakukan account activation.

Account activation menghubungkan:

```text
User
   ↓
Person
   ↓
Player
```

Akun tidak membuat Player baru.

---

# 12. Public Registration

Public registration merupakan pintu utama untuk pendataan pemain baru.

Admin Kabupaten dapat membuat dan mengekspos form.

Namun form tidak dibuat berbeda-beda berdasarkan periode.

---

# 13. Registration Form Model

Untuk Phase 1, sistem menggunakan model form yang sederhana.

Jenis form utama:

```text
PLAYER_REGISTRATION
```

Setiap Kabupaten/Kota dapat memiliki **satu form aktif untuk pendaftaran pemain**.

Contoh:

```text
Badung
└── Player Registration Form

Denpasar
└── Player Registration Form

Gianyar
└── Player Registration Form
```

Tujuan model ini adalah menghindari banyak form yang menyebabkan data tersebar.

---

# 14. Form Ownership

Setiap form memiliki owner.

```text
Form
├── ownerUserId
└── districtId
```

Untuk form yang dibuat oleh District Admin:

```text
District Admin Badung
        ↓
Player Registration Form
        ↓
districtId = BADUNG
```

Kabupaten/Kota submission **otomatis ditentukan berdasarkan form owner**.

Public user tidak memilih Kabupaten/Kota melalui dropdown.

---

# 15. Form Access

Form dapat:

* diekspos secara publik;
* dibuka kapan saja;
* tidak bergantung pada periode tertentu;
* ditutup oleh Admin Kabupaten;
* dibuka kembali kapan saja.

Form tidak menggunakan `startAt/endAt` sebagai requirement utama.

Lifecycle:

```text
DRAFT
  ↓
ACTIVE
  ↓
CLOSED
  ↓
ACTIVE
```

Form yang sudah pernah memiliki submission tidak boleh dihapus secara sembarangan.

---

# 16. Form Security

Public form menggunakan public token/identifier.

Contoh:

```text
/form/player/8f92jd73
```

Frontend tidak boleh menentukan Kabupaten secara bebas.

Backend harus mengambil:

```text
formId
   ↓
Form
   ↓
districtId
```

Kemudian submission menggunakan `districtId` dari form.

---

# 17. Form Submission

Submission merupakan data yang dikirim melalui public form.

Submission **bukan otomatis menjadi Player resmi**.

Lifecycle:

```text
SUBMITTED
     ↓
UNDER_REVIEW
     ↓
LINKED / CREATED
     ↓
VERIFIED
```

atau:

```text
SUBMITTED
     ↓
REJECTED
```

---

# 18. Duplicate Detection

Sebelum membuat Player baru, sistem melakukan duplicate detection.

Prioritas:

```text
NIK
```

Kemudian kombinasi:

```text
Nama
+
Tanggal Lahir
```

Tambahan:

```text
Nomor Telepon
Kabupaten
```

Sistem menghasilkan:

```text
NO_MATCH
POSSIBLE_MATCH
EXACT_MATCH
```

Nama saja tidak boleh digunakan untuk automatic merge.

---

# 19. Player Master Record

Setiap pemain memiliki satu master record.

Contoh:

```text
Player
├── Internal ID
├── Player Code
├── Personal Information
├── District
├── Club
├── PNP Ranking
├── Age Group
├── Photo
└── Status
```

Player Code merupakan business identifier.

Contoh:

```text
PL-BDG-000001
```

Internal database ID tetap menggunakan UUID/CUID.

---

# 20. Player Personal Information

Data utama pemain:

```text
Nama Lengkap
Tempat Lahir
Tanggal Lahir
NIK
Alamat
Nomor Telepon
Foto Diri
```

Foto diri merupakan **mandatory field**.

---

# 21. Player Tennis Information

Data tenis pemain:

```text
Kabupaten/Kota
Klub
PNP Ranking Terakhir
```

Pemain **boleh tidak memiliki klub**.

Contoh:

```text
clubId = null
```

Tidak memiliki klub bukan alasan submission ditolak.

---

# 22. Player Photo

Foto pemain wajib tersedia untuk Player Profile.

Format yang diperbolehkan:

```text
JPEG
PNG
```

Maximum file size:

```text
4 MB
```

File harus divalidasi pada backend.

Validasi minimal:

* MIME type;
* extension;
* file size;
* valid image content.

---

# 23. Age

Usia merupakan **derived data**.

Usia tidak disimpan sebagai input manual.

Usia dihitung dari:

```text
Tanggal Lahir
+
Tahun Berjalan
```

Contoh:

```text
Tanggal lahir:
15 Mei 2010

Tahun berjalan:
2026

Age:
16
```

---

# 24. Age Group

Kelompok umur merupakan master/configuration data.

Kategori Phase 1:

```text
KU-10
KU-12
KU-14
KU-16
KU-18
```

Player tidak menginput kelompok umur secara manual.

Sistem menentukan kelompok umur berdasarkan:

```text
Birth Year
+
Current Year
+
Age Group Rule
```

Contoh:

```text
Birth Year: 2010
Current Year: 2026

Age Group:
KU-16
```

Aturan perhitungan harus dibuat sebagai configurable business rule sehingga perubahan aturan tidak mengharuskan perubahan struktur Player.

---

# 25. Player Status

Player memiliki status:

```text
DRAFT
PENDING_VERIFICATION
VERIFIED
ACTIVE
INACTIVE
ARCHIVED
REJECTED
```

Status utama yang digunakan pada operational flow:

```text
PENDING_VERIFICATION
VERIFIED
ACTIVE
INACTIVE
```

Master record tidak dihapus secara permanen melalui operational UI.

---

# 26. PNP Ranking

PNP Ranking diinput secara manual oleh user/pemain.

Player dapat memperbarui:

```text
PNP Ranking Terakhir
```

Sistem harus menyimpan:

```text
rank
period
updatedAt
updatedBy
```

Agar histori perubahan dapat ditelusuri.

---

# 27. PNP Update Notice

Sistem menyediakan mekanisme **annual update notice**.

Tujuannya mengingatkan pemain untuk memperbarui PNP ranking terbaru.

Contoh:

```text
PNP UPDATE

Peringkat terakhir:
#124

Update terakhir:
2026

[Update PNP]
```

Sistem dapat memberikan notification/reminder berdasarkan siklus tahunan.

---

# 28. Club

Club merupakan master data terpisah dari Player.

Player menyimpan reference:

```text
player.clubId
```

Player boleh memiliki:

```text
clubId = null
```

Phase 1 fokus pada pendataan klub sebagai affiliation reference.

Perpindahan klub tidak menjadi workflow khusus pada Phase 1.

Jika pemain mengganti klub:

```text
Current Club
```

dapat diperbarui sesuai verification policy.

---

# 29. District Transfer

Perpindahan Kabupaten/Kota **didukung secara administratif** dan tidak boleh dilakukan dengan sekadar mengubah field tanpa jejak.

Perpindahan harus menghasilkan action/history.

Contoh:

```text
Badung
   ↓
Transfer Request
   ↓
Denpasar
   ↓
Verification
   ↓
Current District = Denpasar
```

Histori sebelumnya tetap disimpan.

Contoh:

```text
District History

Badung
2024 — 2026

Denpasar
2026 — current
```

---

# 30. District Assignment

Saat Player didaftarkan melalui public form:

```text
Form Owner
      ↓
District
      ↓
Player
```

Public user tidak dapat menentukan Kabupaten secara bebas.

Jika terjadi perpindahan Kabupaten setelah Player dibuat, perubahan dilakukan melalui workflow transfer.

---

# 31. Data Update

Tidak semua perubahan langsung mengubah master data.

Untuk field yang membutuhkan approval:

```text
Player
   ↓
Change Request
   ↓
Verification
   ↓
Master Data Update
```

Contoh:

```text
Current:
Nama = Budi Santoso

Requested:
Nama = Budi S.
```

Request disimpan sampai diverifikasi.

---

# 32. Verification

Verification memiliki status:

```text
PENDING
APPROVED
REJECTED
```

Verification dapat memiliki level:

```text
DISTRICT
CENTRAL
```

Tidak semua perubahan harus melewati Central Admin.

Verification policy ditentukan berdasarkan jenis data.

---

# 33. Verification Principle

Prinsip:

> **Input authority dan verification authority tidak harus sama.**

Contoh:

```text
Player
   ↓
Submit Change
   ↓
District Admin
   ↓
Approve
```

Untuk perubahan sensitif:

```text
Player
   ↓
District Review
   ↓
Central Review
   ↓
Approved
```

---

# 34. Official Data

Master Player dianggap official setelah melewati verification workflow yang ditetapkan.

Baseline:

```text
Public Submission
      ↓
District Verification
      ↓
Player Record
```

Untuk field yang membutuhkan central approval:

```text
District Verification
      ↓
Central Verification
      ↓
Official
```

Detail verification matrix menjadi business rule tersendiri.

---

# 35. Data Visibility

## Player

Dapat melihat:

```text
Own Player Data
Own Requests
Own History
```

## District Admin

Dapat melihat:

```text
Players in Own District
Submissions in Own District
Verification Requests in Own District
```

## Central Admin

Dapat melihat:

```text
All Players
All Districts
All Submissions
All Verification Requests
Audit Logs
```

Public tidak memiliki akses terhadap database pemain.

---

# 36. Sensitive Data

Data berikut diperlakukan sebagai sensitive:

```text
NIK
Tanggal Lahir
Alamat
Nomor Telepon
```

UI harus melakukan masking jika diperlukan.

Contoh:

```text
NIK:
3273************
```

Public form submission tidak boleh dapat diakses oleh public user setelah submission selesai.

---

# 37. Audit Trail

Aktivitas penting harus memiliki audit log.

Minimal:

```text
Create Player
Update Player
Submit Change Request
Approve
Reject
Transfer District
Create Admin
Disable Admin
Create Form
Close Form
Reopen Form
Account Activation
```

Audit log:

```text
actor
action
entityType
entityId
oldValue
newValue
timestamp
```

Audit log immutable.

---

# 38. Multiple Admin

System mendukung:

```text
Multiple Central Admin
Multiple District Admin
```

District Admin tetap memiliki scope:

```text
districtId
```

Central Admin tidak memiliki district scope.

---

# 39. Permission Model

Authorization menggunakan kombinasi:

```text
Role
+
Scope
+
Action
```

Contoh:

```text
DISTRICT_ADMIN
+
districtId = BADUNG
+
UPDATE_PLAYER
```

berarti admin hanya dapat melakukan UPDATE_PLAYER terhadap Player Badung.

Frontend tidak menjadi sumber utama authorization.

Authorization harus ditegakkan pada backend.

---

# 40. Core Data Model

Core entities Phase 1:

```text
User
Role
UserRole
District
Person
Player
Club
PlayerPnpRanking
DistrictHistory
RegistrationForm
FormSubmission
VerificationRequest
AuditLog
File
```

Relasi konseptual:

```text
User
 │
 ├── UserRole
 │
 └── Person
       │
       └── Player
             │
             ├── District
             ├── Club?
             ├── PNP Ranking
             └── District History

District
 │
 ├── District Admins
 └── Players

RegistrationForm
 │
 ├── Owner
 ├── District
 └── FormSubmission

FormSubmission
 └── Player?

VerificationRequest
 └── Entity

File
 └── Entity
```

---

# 41. Architecture

Architecture menggunakan:

> **Modular Monolith**

Tidak menggunakan microservices pada Phase 1.

Tujuannya menjaga:

* development speed;
* domain separation;
* maintainability;
* deployment simplicity;
* extensibility.

Struktur:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── roles/
│   ├── districts/
│   ├── persons/
│   ├── players/
│   ├── clubs/
│   ├── forms/
│   ├── submissions/
│   ├── verification/
│   ├── files/
│   └── audit/
│
├── shared/
│   ├── components/
│   ├── types/
│   ├── constants/
│   ├── utils/
│   └── errors/
│
└── infrastructure/
    ├── database/
    ├── authentication/
    ├── storage/
    └── config/
```

---

# 42. Technology Stack

## Frontend

```text
React
TypeScript
Tailwind CSS
Zustand
Zod
```

Tailwind CSS digunakan sebagai styling foundation dengan komponen UI custom.

Style dan struktur visual dari template dashboard yang sudah dipasang dipertahankan sebagai baseline, lalu direkonstruksi agar sesuai dengan domain dan identitas visual PELTI Bali One.

### Frontend Visual Direction

Frontend menggunakan brand color PELTI Bali One dengan komposisi visual 60–30–10:

* **60% warna utama:** putih dan neutral terang sebagai dominant base color, canvas, dan surface utama.
* **30% warna kedua:** charcoal, warm gray, border, dan area navigasi untuk hierarchy.
* **10% warna elemen:** gold brand dan semantic colors untuk action, active state, highlight, status, serta feedback.

Whitespace harus diprioritaskan agar dashboard tetap lapang, mudah dipindai, dan nyaman digunakan untuk pekerjaan administratif. Warna gold digunakan secara restrained dan tidak menjadi background dominan.

---

## Backend

```text
Node.js
TypeScript
```

Backend menggunakan modular architecture.

---

## Database Layer

```text
Prisma ORM
```

Prisma digunakan sebagai abstraction layer untuk relational database.

---

## Validation

```text
Zod
```

Schema validation digunakan pada:

* request body;
* query;
* form;
* API boundary;
* business input.

---

# 43. Shared Component Architecture

Komponen generik berada pada shared layer.

Contoh:

```text
shared/components/

DataTable
FormField
Input
Select
Button
Modal
Drawer
FileUpload
StatusBadge
ConfirmDialog
SearchInput
Pagination
PageHeader
EmptyState
LoadingState
```

Domain-specific component tetap berada di module masing-masing.

Contoh:

```text
players/components/
PlayerProfileCard
PlayerStatusBadge
PlayerDataForm
```

---

# 44. Frontend State

Zustand digunakan untuk client-side state.

Contoh:

```text
stores/
├── auth.store.ts
├── ui.store.ts
├── player-filter.store.ts
└── form.store.ts
```

Tidak menggunakan satu global store besar.

Domain state sebaiknya tetap scoped terhadap kebutuhan module.

---

# 45. Validation Architecture

Zod schema ditempatkan sedekat mungkin dengan domain.

Contoh:

```text
players/
├── player.schema.ts
├── player.service.ts
├── player.repository.ts
└── player.controller.ts
```

Schema:

```text
createPlayerSchema
updatePlayerSchema
playerFilterSchema
```

Frontend dan backend dapat menggunakan shared schema jika memungkinkan.

---

# 46. File Architecture

File seperti foto pemain disimpan pada external/object storage.

Database hanya menyimpan metadata:

```text
File
├── id
├── entityType
├── entityId
├── storageKey
├── originalName
├── mimeType
├── size
└── uploadedBy
```

File tidak boleh langsung menjadi public URL tanpa authorization jika file bersifat private.

---

# 47. Security Baseline

Sistem wajib:

* melakukan server-side authorization;
* melakukan backend validation;
* tidak menyimpan password plaintext;
* melakukan masking NIK;
* membatasi akses data pribadi;
* memvalidasi file upload;
* membatasi ukuran file;
* menerapkan rate limit pada public registration;
* menggunakan secure session/token management;
* mencatat aktivitas penting;
* mencegah district scope bypass;
* mencegah IDOR;
* mencegah duplicate Player;
* menjaga audit log tetap immutable.

---

# 48. MVP Acceptance Criteria

## Central Admin

* dapat login;
* dapat melihat seluruh pemain;
* dapat melihat seluruh Kabupaten/Kota;
* dapat membuat dan mengelola Admin Pusat;
* dapat membuat dan mengelola Admin Kabupaten;
* dapat melakukan verification;
* dapat melihat audit trail.

## District Admin

* dapat login;
* otomatis terikat dengan Kabupaten/Kota;
* dapat melihat pemain di wilayahnya;
* dapat membuat satu Player Registration Form;
* dapat membuka/menutup form;
* dapat membuka kembali form;
* dapat melihat submission;
* dapat melakukan review;
* dapat membuat/link Player;
* dapat melakukan verification sesuai permission.

## Public User

* dapat membuka public form;
* dapat mengisi data pemain;
* tidak perlu login;
* tidak dapat memilih Kabupaten jika form sudah terikat dengan Kabupaten;
* dapat melakukan submission;
* tidak dapat melihat data pemain lain.

## Player

* dapat menerima invitation;
* dapat melakukan account activation;
* dapat login;
* dapat melihat profil sendiri;
* dapat memperbarui data yang diizinkan;
* dapat mengajukan perubahan data;
* dapat menginput PNP;
* dapat melihat status request.

## System

* setiap Player memiliki unique Player Code;
* duplicate detection tersedia;
* Kabupaten otomatis berasal dari form owner;
* foto pemain wajib;
* foto hanya JPEG/PNG;
* maximum photo size 4 MB;
* kelompok umur dihitung otomatis;
* kelompok umur menggunakan kategori KU-10, KU-12, KU-14, KU-16, KU-18;
* usia dihitung berdasarkan tahun lahir dan tahun berjalan;
* Player boleh tanpa klub;
* District transfer memiliki histori dan action;
* multiple admin didukung;
* satu akun dapat memiliki multiple role;
* account terikat dengan NIK;
* public submission tidak otomatis menjadi official Player;
* audit trail tersedia untuk aktivitas penting.

---

# 49. Development Scope

Urutan implementasi:

```text
1. Project Foundation
       ↓
2. Authentication & Authorization
       ↓
3. District Seed & Organization
       ↓
4. User & Role Management
       ↓
5. Person & Player Registry
       ↓
6. Club Master
       ↓
7. Public Player Registration
       ↓
8. Submission Review
       ↓
9. Player Verification
       ↓
10. Player Account Activation
       ↓
11. Player Self-Service
       ↓
12. Audit Trail
```

---

# 50. Future Modules

Setelah Phase 1 stabil, sistem dapat dikembangkan menjadi:

```text
Pelti Bali Data Center
│
├── Player
│
├── Coach              [Future]
│
├── Referee            [Future]
│
├── Facility           [Future]
│
├── Achievement        [Future]
│
└── Competition        [Future]
```

Module future tidak boleh mengubah prinsip dasar:

```text
Person Identity
+
Account
+
Role
+
District Scope
+
Verification
+
Audit Trail
```

---

# 51. Definition of Done — Phase 1

Phase 1 selesai apabila Pelti Bali memiliki sistem yang mampu:

1. Mengelola master Kabupaten/Kota melalui seed.
2. Mengelola multiple Central Admin.
3. Mengelola multiple District Admin.
4. Membatasi District Admin berdasarkan Kabupaten/Kota.
5. Mengelola multi-role User.
6. Mengikat akun individu dengan NIK.
7. Menerima public player registration tanpa login.
8. Menghubungkan submission dengan Kabupaten berdasarkan form owner.
9. Menghindari duplicate Player.
10. Membuat master Player.
11. Memberikan Player Code.
12. Menyimpan informasi identitas pemain.
13. Menyimpan afiliasi klub.
14. Memungkinkan pemain tanpa klub.
15. Mengelola PNP ranking terakhir.
16. Menghitung usia secara otomatis.
17. Menghitung kelompok umur secara otomatis.
18. Mewajibkan foto pemain dengan validasi JPEG/PNG maksimal 4 MB.
19. Melakukan verification workflow.
20. Mendukung player account activation.
21. Mendukung player self-service.
22. Mendukung District Transfer dengan histori dan action.
23. Menyimpan audit trail.
24. Menegakkan authorization di backend.
25. Menjadi fondasi yang siap menerima module berikutnya tanpa redesign core identity system.

---

# 52. Core Product Statement

> **Pelti Bali Data Center Phase 1 adalah centralized player registry yang menghubungkan identitas pemain, akun pengguna, Kabupaten/Kota, dan proses verifikasi dalam satu sumber data resmi.**

Prinsip operasional:

```text
PUBLIC CAN SUBMIT
        ↓
DISTRICT MANAGES
        ↓
CENTRAL GOVERNS
        ↓
PLAYER OWNS ACCESS
        ↓
SYSTEM PRESERVES HISTORY
```

Phase 1 berfokus pada **membangun fondasi data pemain yang reliable dan accountable**, bukan membangun sistem kompetisi.
