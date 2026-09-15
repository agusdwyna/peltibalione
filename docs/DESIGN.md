# PELTI Bali One — Design System

> **Product:** PELTI Bali One
> **Design Direction:** Premium · Elegant · Restrained · Professional · Comfortable
> **Primary Reference:** PELTI Bali Logo
> **UI Framework:** daisyUI
> **Styling:** Tailwind CSS
> **Design Philosophy:** Luxury without extravagance

---

# 1. Design Vision

PELTI Bali One adalah sistem administrasi resmi, bukan aplikasi consumer/social.

Visual identity harus memberikan kesan:

* **Mewah**
* **Berkelas**
* **Resmi**
* **Tegas**
* **Tenang**
* **Modern**
* **Profesional**
* **Nyaman digunakan dalam waktu lama**

Namun hindari:

* terlalu banyak warna gold
* gradient berlebihan
* glassmorphism
* shadow besar
* border radius berlebihan
* animasi yang tidak diperlukan
* tampilan terlalu "friendly"
* dashboard yang terlalu ramai
* ornamen dekoratif yang tidak memiliki fungsi

> **Core principle:**
>
> **Premium melalui restraint, bukan melalui dekorasi.**

---

# 2. Brand Character

Logo PELTI memiliki karakter visual yang kuat:

```text
BLACK
+
GOLD
+
STRONG GEOMETRY
+
SPORTS
+
AUTHORITY
```

Design system menerjemahkan karakter tersebut ke UI dengan pendekatan:

```text
Logo Gold
     ↓
Accent Gold

Logo Black
     ↓
Primary / Surface / Text

Strong Logo Geometry
     ↓
Clear Borders + Strong Typography

Sports Identity
     ↓
Compact + Dense Information
```

---

# 3. Color Philosophy

Jangan menjadikan gold sebagai background utama.

Gold digunakan untuk:

* primary action tertentu
* active state
* highlight
* selected item
* important metric
* icon accent
* subtle decorative line

Sebagian besar UI menggunakan:

```text
Black
Charcoal
White
Warm Gray
```

Dengan gold sebagai aksen.

---

# 4. Color Tokens

## Brand

```css
--brand-black: #151515;
--brand-charcoal: #1F1F1F;
--brand-gold: #D4A72C;
--brand-gold-light: #E4C15A;
--brand-gold-dark: #A77C13;
```

Gold utama:

```text
#D4A72C
```

digunakan secara hemat. Brand token ini menjadi acuan utama implementasi frontend dan tidak boleh digantikan oleh warna bawaan template.

---

# 5. Light Theme

Light theme adalah default untuk dashboard administratif. Putih menjadi dominant base color agar content area terasa bersih, lapang, dan nyaman untuk pekerjaan administratif dalam durasi lama.

```css
--background: #FFFFFF;
--surface: #FFFFFF;
--surface-subtle: #F7F7F5;

--text-primary: #171717;
--text-secondary: #5F5F5A;
--text-muted: #85857F;

--border: #E4E3DE;
--border-strong: #D4D3CC;

--accent: #C8951F;
--accent-hover: #A97B12;

--success: #2F6B4F;
--warning: #A87517;
--danger: #A33A35;
--info: #3F637A;
```

### Visual hierarchy

```text
Background
#F7F7F5

     ↓

Surface
#FFFFFF

     ↓

Border
#E4E3DE

     ↓

Primary Text
#171717

     ↓

Gold Accent
#C8951F
```

---

# 6. Dark Theme

Dark mode tersedia, tetapi bukan identitas utama.

```css
--background: #111111;
--surface: #191919;
--surface-subtle: #222222;

--text-primary: #F5F3ED;
--text-secondary: #B8B5AC;
--text-muted: #85827A;

--border: #30302D;
--border-strong: #41413D;

--accent: #D4A72C;
--accent-hover: #E4C15A;
```

Hindari pure black:

```text
#000000
```

untuk seluruh background.

Gunakan:

```text
#111111
#151515
#191919
```

agar mata lebih nyaman.

---

# 7. Gold Usage Rule

Gold adalah **accent**, bukan dominant color.

### Recommended

```text
[ Save Changes ]
     ↑
   Gold
```

```text
Active Navigation
       ↑
     Gold
```

```text
Important Statistic
       ↑
     Gold
```

### Avoid

```text
████████████████████
████ GOLD BACKGROUND █
████████████████████
```

Gold yang terlalu dominan akan membuat sistem terlihat seperti:

* kasino
* luxury hotel
* wedding theme
* aplikasi trading

Bukan organisasi olahraga profesional.

---

# 8. Color Ratio

Gunakan komposisi warna **60–30–10** pada setiap halaman dan section utama:

```text
60%  Warna utama / base color
     Putih dan surface netral terang sebagai ruang kerja utama

30%  Warna kedua / supporting color
     Charcoal, warm gray, border, dan area navigasi untuk hierarchy

10%  Warna elemen / accent color
     Gold dan semantic colors untuk action, status, highlight, serta feedback
```

Implementasi praktis:

```text
████████████████████  White / light neutral base — 60%
██████████            Charcoal / supporting neutral — 30%
███                   Gold + semantic elements — 10%
```

Aturan penerapan:

* Putih menjadi dominant base color untuk canvas, surface utama, dan area kerja dashboard.
* Charcoal digunakan sebagai warna kedua untuk sidebar, topbar tertentu, heading kuat, teks, dan struktur navigasi—bukan untuk memenuhi seluruh content area.
* Gold digunakan sebagai elemen aksen terbatas: primary action, active indicator, selected state, metric penting, serta garis atau icon highlight.
* Semantic colors tetap muted dan dihitung sebagai bagian dari 10% elemen, bukan sebagai blok warna besar.
* Komposisi 60–30–10 adalah panduan visual, bukan kewajiban menghitung setiap pixel; whitespace tetap diprioritaskan.

Gold harus terasa **special** karena jarang digunakan.

---

# 9. Typography

Typography harus terlihat:

* mature
* clean
* authoritative
* readable

Hindari font yang terlalu playful.

## Recommended Font

### Primary

```text
Inter
```

Alternative:

```text
Plus Jakarta Sans
```

Untuk sistem administratif, **Inter** menjadi pilihan utama.

---

# 10. Typography Scale

```text
Display
36px / 40px
font-weight: 700

Page Heading
28px / 34px
font-weight: 700

Section Heading
20px / 28px
font-weight: 650

Card Heading
16px / 24px
font-weight: 600

Body
14px / 22px
font-weight: 400

Small
13px / 20px
font-weight: 400

Caption
12px / 18px
font-weight: 500
```

Dashboard tidak menggunakan heading yang terlalu besar.

---

# 11. Typography Weight

Gunakan weight secara terbatas:

```text
400 → Body
500 → Label
600 → Heading / Button
700 → Page Heading / Important Value
```

Hindari:

```text
800
900
```

kecuali untuk kebutuhan branding tertentu.

---

# 12. Logo Usage

Logo PELTI digunakan pada:

* login page
* application shell
* sidebar/header
* official documents
* empty states tertentu

Jangan menaruh logo di setiap card.

### Recommended

```text
┌──────────────────────────┐
│ [ PELTI LOGO ]           │
│ PELTI Bali One           │
│                          │
│ Dashboard                │
│ Players                  │
│ Registration             │
└──────────────────────────┘
```

Logo tetap menjadi **identity anchor**, bukan dekorasi.

---

# 13. Logo + Wordmark

Recommended:

```text
[LOGO]

PELTI Bali One
Central Management System
```

Untuk sidebar:

```text
[LOGO]  PELTI Bali One
```

Untuk mobile:

```text
[LOGO]
```

---

# 14. Layout Philosophy

Layout harus terasa:

> **spacious but dense enough for administration**

Bukan:

> huge cards with excessive empty space

Dan bukan:

> compact enterprise software from 2010

Target:

```text
Clean
     ↓
Readable
     ↓
Efficient
     ↓
Professional
```

---

# 15. Application Shell

Desktop:

```text
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│ Sidebar              Topbar                                 │
│                                                              │
│ ┌─────────────┐     ┌────────────────────────────────────┐  │
│ │ PELTI       │     │ Breadcrumb      Search    Profile │  │
│ │ Bali One    │     ├────────────────────────────────────┤  │
│ │             │     │                                    │  │
│ │ Dashboard   │     │ Page Content                       │  │
│ │ Players     │     │                                    │  │
│ │ Forms       │     │                                    │  │
│ │ Submission  │     │                                    │  │
│ │ Verification│     │                                    │  │
│ │             │     │                                    │  │
│ │             │     │                                    │  │
│ └─────────────┘     └────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# 16. Sidebar

Sidebar harus terasa:

* solid
* quiet
* premium
* functional

Recommended background:

```text
#151515
```

Text:

```text
#F5F3ED
```

Inactive:

```text
#9C9A92
```

Active:

```text
Gold
```

Contoh:

```text
PELTI Bali One

OVERVIEW
  Dashboard

REGISTRY
  Players
  Clubs

REGISTRATION
  Forms
  Submissions

VERIFICATION
  Verification

SYSTEM
  Users
  Audit Log
```

---

# 17. Sidebar Active State

Jangan menggunakan background gold penuh.

Recommended:

```text
┌──────────────────────────┐
│ ┃  Players               │
└──────────────────────────┘
  ↑
gold indicator
```

Atau:

```text
┌──────────────────────────┐
│   ● Players              │
└──────────────────────────┘
```

Gold digunakan sebagai indicator.

---

# 18. Topbar

Topbar minimal.

Elements:

```text
Breadcrumb
Search
Notification
Profile
```

Contoh:

```text
Players / Registry                    Agus   ●
```

Tidak perlu banyak icon.

---

# 19. Page Header

Setiap halaman menggunakan struktur konsisten:

```text
Players
Manage registered PELTI Bali players.

                         [ Add Player ]
```

atau:

```text
Player Registry
1,284 registered players

[ Search players... ] [ Filter ] [ Export ]
```

Page header harus langsung menjawab:

1. Saya berada di mana?
2. Apa yang bisa saya lakukan?
3. Apa informasi pentingnya?

---

# 20. Cards

Card menggunakan style minimal.

```css
border-radius: 10px;
border: 1px solid var(--border);
background: var(--surface);
box-shadow: none;
```

Shadow hanya digunakan jika diperlukan untuk hierarchy.

Avoid:

```text
huge shadow
rounded-3xl
glass effect
gradient
```

---

# 21. Border Radius

PELTI Bali One menggunakan radius yang lebih tegas.

Recommended:

```text
xs   = 4px
sm   = 6px
md   = 8px
lg   = 10px
xl   = 12px
```

Default:

```text
8px
```

Avoid:

```text
rounded-full
rounded-3xl
rounded-[32px]
```

kecuali avatar/badge.

---

# 22. Buttons

Button harus terlihat solid dan confident.

### Primary

```text
Background: Gold
Text: Dark
```

Contoh:

```text
[ Save Player ]
```

### Secondary

```text
Background: Transparent
Border: #D4D3CC
Text: Dark
```

### Destructive

```text
Semantic danger
```

Tidak menggunakan gold untuk destructive action.

---

# 23. Button Hierarchy

Dalam satu area:

```text
[ Save Changes ]   [ Cancel ]
     ↑
   Primary
```

Jangan:

```text
[ Gold Button ]
[ Gold Button ]
[ Gold Button ]
```

Satu section sebaiknya memiliki **satu primary action**.

---

# 24. Form Design

Form harus terasa administratif dan mudah dibaca.

Label:

```text
NIK
Nomor Induk Kependudukan
```

Input:

```text
┌──────────────────────────────────────────┐
│ 317xxxxxxxxx1234                         │
└──────────────────────────────────────────┘
```

Helper text:

```text
NIK digunakan untuk verifikasi identitas.
```

Error:

```text
NIK wajib diisi.
```

---

# 25. Input Style

Default:

```text
background: white
border: 1px solid #D9D8D2
radius: 8px
height: 40px
```

Focus:

```text
border → gold
ring → subtle gold
```

Jangan menggunakan focus ring besar berwarna terang.

---

# 26. Data Table

Data table adalah komponen utama karena sistem bersifat administratif.

Table harus:

* compact
* readable
* sortable
* filterable
* responsive
* memiliki clear row hierarchy

Contoh:

```text
┌──────────┬────────────────┬─────────┬──────────┬────────────┐
│ ID       │ Player         │ District│ Status   │ Action     │
├──────────┼────────────────┼─────────┼──────────┼────────────┤
│ PL-BDG-1 │ I Made ...     │ Badung  │ VERIFIED │ •••        │
│ PL-DPS-2 │ I Wayan ...    │ Denpasar│ PENDING  │ •••        │
└──────────┴────────────────┴─────────┴──────────┴────────────┘
```

---

# 27. Table Density

Default:

```text
Row height: 48–52px
```

Header:

```text
12–13px
font-weight: 600
uppercase optional
```

Body:

```text
14px
```

Tidak terlalu besar agar admin dapat melihat banyak data sekaligus.

---

# 28. Status Badge

Status badge harus subtle.

### Verified

```text
[ Verified ]
```

### Pending

```text
[ Pending ]
```

### Rejected

```text
[ Rejected ]
```

Gunakan background semantic yang sangat ringan.

Jangan membuat badge terlalu colorful.

---

# 29. Player Profile

Player profile menjadi salah satu halaman paling penting.

Layout:

```text
┌────────────────────────────────────────────────────┐
│                                                    │
│  [PHOTO]    I Made Agus                            │
│             PL-BDG-000124                          │
│             Badung · KU-18                         │
│                                                    │
│             [ VERIFIED ]                           │
│                                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│ General Information                                │
│                                                    │
│ Name             Date of Birth       NIK            │
│ ...              ...                 ...            │
│                                                    │
├────────────────────────────────────────────────────┤
│ Tennis Information                                 │
│                                                    │
│ District         Club                PNP Ranking    │
│ Badung           ...                 #128           │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

# 30. Player Photo

Photo menggunakan:

```text
Aspect ratio: 1:1
Radius: 8–12px
```

Jangan membuat photo terlalu bulat.

Profile photo:

```text
┌──────────┐
│          │
│   PHOTO  │
│          │
└──────────┘
```

bukan:

```text
     ◯
```

Avatar circle tetap diperbolehkan untuk compact UI seperti topbar.

---

# 31. Dashboard

Dashboard tidak perlu penuh dengan chart.

Prioritaskan operational information.

Contoh:

```text
Good morning, Admin.

Overview
────────────────────────────────────────────

[ 1,284 ]        [ 1,102 ]        [ 182 ]
Players          Verified         Pending


Player Registry
────────────────────────────────────────────

Recent registrations
...


Verification
────────────────────────────────────────────

Pending verification
...


District Overview
────────────────────────────────────────────

Badung       284
Denpasar     241
Gianyar      183
...
```

---

# 32. Dashboard Metric Cards

Metric card harus simple.

```text
REGISTERED PLAYERS

1,284
+24 this month
```

Tidak perlu:

```text
huge icon
gradient background
giant rounded card
```

Gold hanya boleh digunakan pada metric penting.

---

# 33. Empty State

Empty state harus tenang.

Contoh:

```text
No players found

Try changing your filters or add a new player.

[ Add Player ]
```

Jangan menggunakan illustration yang terlalu playful.

---

# 34. Modal

Modal:

```text
max-width: 520–640px
radius: 10px
border: 1px solid border
shadow: subtle
```

Header:

```text
Add Player
Register a new player into the registry.
```

Footer:

```text
[ Cancel ] [ Save Player ]
```

---

# 35. Drawer

Gunakan drawer untuk:

* filter
* quick detail
* verification detail
* player preview

Bukan untuk form yang sangat panjang.

---

# 36. Notification

Notification harus subtle.

Example:

```text
✓ Player successfully verified.
```

Tidak menggunakan animasi berlebihan.

---

# 37. Icons

Gunakan satu icon system secara konsisten.

Recommended:

```text
Lucide Icons
```

Icon style:

```text
stroke
simple
minimal
```

Avoid mixing:

```text
filled icons
3D icons
emoji
different icon libraries
```

---

# 38. Icon Size

Default:

```text
16px
```

Navigation:

```text
18px
```

Primary action:

```text
16–18px
```

Jangan menggunakan icon terlalu besar.

---

# 39. Spacing System

Gunakan spacing berbasis 4px. Prioritaskan whitespace dan jangan memadatkan content hanya untuk memenuhi layar. Ruang kosong dipakai untuk memisahkan hierarchy, menjaga keterbacaan table/form, dan memberi jeda antar action.

```text
4
8
12
16
20
24
32
40
48
64
```

Default content gap:

```text
16px
24px
```

Section gap:

```text
32px
```

---

# 40. Page Width

Desktop content:

```text
max-width: 1440px
```

Page horizontal padding:

```text
24px
32px
```

Pada monitor besar jangan membuat content memenuhi seluruh viewport tanpa batas.

---

# 41. Responsive

### Desktop

```text
Sidebar + Content
```

### Tablet

```text
Collapsed Sidebar + Content
```

### Mobile

```text
Topbar
Content
Bottom / Drawer Navigation
```

Data table pada mobile dapat berubah menjadi:

```text
Card/List View
```

jika table terlalu lebar.

---

# 42. Motion

Animation harus minimal.

Recommended:

```text
150–200ms
ease-out
```

Gunakan hanya untuk:

* modal
* drawer
* dropdown
* hover
* state transition

Tidak perlu:

* page transition berlebihan
* bouncing
* floating animation
* decorative animation

---

# 43. Shadows

Shadow sangat subtle.

Primary:

```css
box-shadow: 0 1px 2px rgba(0,0,0,.04);
```

Elevated:

```css
box-shadow: 0 8px 24px rgba(0,0,0,.08);
```

Gunakan elevated shadow hanya untuk:

* dropdown
* modal
* popover
* floating panel

---

# 44. Dark Surface Hierarchy

Untuk dark mode:

```text
#111111
   ↓
#151515
   ↓
#191919
   ↓
#222222
```

Hierarchy dibangun melalui **surface brightness**, bukan gold.

---

# 45. Gold Gradient

Gradient gold **tidak digunakan sebagai default UI**.

Avoid:

```css
background: linear-gradient(...);
```

Gold sebaiknya solid.

```text
#D4A72C
```

Hal ini membuat interface lebih mature.

---

# 46. Tables & Financial/Admin Feel

Karena sistem akan berisi banyak data, visual language harus mendekati:

```text
Professional Administration
```

bukan:

```text
Consumer App
```

Prioritas:

```text
Information Density
+
Clarity
+
Consistency
+
Speed
```

---

# 47. Design Tokens

Recommended token structure:

```css
:root {
  --color-brand: #D4A72C;
  --color-brand-dark: #A77C13;

  --color-bg: #FFFFFF;
  --color-surface: #FFFFFF;
  --color-surface-subtle: #F7F7F5;

  --color-text: #171717;
  --color-text-secondary: #5F5F5A;
  --color-text-muted: #85857F;

  --color-border: #E4E3DE;
  --color-border-strong: #D4D3CC;

  --color-success: #2F6B4F;
  --color-warning: #A87517;
  --color-danger: #A33A35;
  --color-info: #3F637A;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,.04);
  --shadow-md: 0 8px 24px rgba(0,0,0,.08);
}
```

---

# 48. Tailwind CSS Direction

Tailwind CSS digunakan sebagai styling foundation dengan komponen UI custom.

Style dan struktur visual dari template dashboard yang sudah dipasang dipertahankan sebagai baseline implementasi. Komponen template direkonstruksi secara bertahap agar sesuai dengan token, domain, dan workflow PELTI Bali One.

Contoh:

```text
Tailwind CSS
   ↓
Template Dashboard Baseline
   ↓
PELTI Theme Tokens
   ↓
PELTI Bali One Components
   ↓
Application UI
```

Jangan membiarkan default template menentukan business flow atau visual identity PELTI tanpa penyesuaian.

---

# 49. Component Philosophy

Shared component harus bersifat:

```text
Simple
Predictable
Composable
Accessible
Consistent
```

Contoh:

```text
Button
Input
Select
Modal
Drawer
DataTable
Badge
FileUpload
```

Domain component:

```text
PlayerCard
PlayerProfile
VerificationPanel
SubmissionReview
```

dipisahkan dari generic component.

---

# 50. Accessibility

Design harus tetap nyaman digunakan keyboard.

Minimum:

* visible focus state
* sufficient contrast
* semantic HTML
* keyboard navigation
* accessible labels
* error message yang jelas
* modal focus management

Gold tidak boleh menjadi satu-satunya indikator status.

Contoh:

```text
✓ Verified
```

bukan hanya:

```text
[ GOLD ]
```

---

# 51. Data Privacy UI

Karena sistem menyimpan NIK dan data personal, interface harus secara visual memperlakukan data tersebut sebagai sensitive.

Contoh:

```text
NIK

317xxxxxxxx1234
```

Action:

```text
[ Show ]
```

hanya jika user memiliki permission.

Jangan menampilkan NIK penuh pada:

* table
* dashboard
* search result umum
* public interface

---

# 52. Public Registration UI

Public registration memiliki visual sedikit lebih ringan dibanding admin.

Namun tetap menggunakan brand yang sama.

```text
             [PELTI LOGO]

           PELTI Bali One

       Player Registration
       Kabupaten Badung

 ┌─────────────────────────────┐
 │ Nama Lengkap                │
 └─────────────────────────────┘

 ┌─────────────────────────────┐
 │ NIK                         │
 └─────────────────────────────┘

 ...

             [ Submit ]
```

Tidak perlu sidebar.

---

# 53. Public Form Principle

Public form harus:

* simple
* focused
* trustworthy
* mobile friendly

Hindari menampilkan:

* admin terminology
* verification workflow
* internal status
* internal IDs
* unnecessary system information

User cukup tahu:

```text
Apa yang harus diisi
Mengapa diperlukan
Bagaimana submit
```

---

# 54. Login Page

Login page menjadi salah satu tempat branding paling kuat.

Recommended:

```text
┌───────────────────────────────────────────────┐
│                                               │
│                  [ PELTI LOGO ]               │
│                                               │
│                PELTI Bali One                 │
│          Central Management System            │
│                                               │
│       ┌─────────────────────────────┐         │
│       │ Email / Username             │         │
│       └─────────────────────────────┘         │
│                                               │
│       ┌─────────────────────────────┐         │
│       │ Password                     │         │
│       └─────────────────────────────┘         │
│                                               │
│       [ Sign In ]                             │
│                                               │
└───────────────────────────────────────────────┘
```

Background:

```text
#151515
```

Gold hanya digunakan pada:

* logo
* button
* subtle accent

---

# 55. Premium Principle

Kemewahan sistem **bukan** berasal dari:

```text
Gold everywhere
Gradient
Glass
Huge shadows
Fancy animations
```

Tetapi dari:

```text
Typography
Spacing
Alignment
Consistency
Material-like surfaces
Precise borders
Restrained colors
High-quality interactions
```

---

# 56. Visual Keywords

Semua designer/developer yang mengerjakan PELTI Bali One harus menggunakan keyword berikut:

```text
PREMIUM
RESTRAINED
AUTHORITATIVE
CLEAN
MATURE
SPORTS
OFFICIAL
QUIET
PRECISE
```

Dan menghindari:

```text
PLAYFUL
CUTE
COLORFUL
GAMIFIED
FLASHY
OVER-DECORATED
```

---

# 57. Final Design Direction

PELTI Bali One harus terasa seperti:

> **"Sistem resmi organisasi olahraga yang sudah matang."**

Bukan:

> "Aplikasi olahraga yang dibuat supaya terlihat keren."

Visual hierarchy:

```text
                    PELTI BALI ONE

                         ↓

                 Professional UI

                         ↓

              ┌─────────────────────┐
              │                     │
              │      CONTENT        │
              │                     │
              │   Clean & Clear     │
              │                     │
              └─────────────────────┘

       Black / Charcoal
              +
        Warm Neutral
              +
       Controlled Gold
```

### Golden Rule

> **Gold should be noticed, not everywhere.**

> **The interface should feel expensive without trying to look expensive.**
