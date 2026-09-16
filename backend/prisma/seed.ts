import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// PRD §5 — Organization Structure (9 Kabupaten/Kota Bali, seed data)
const DISTRICTS = [
  { code: 'BDG', name: 'Badung' },
  { code: 'BGL', name: 'Bangli' },
  { code: 'BLL', name: 'Buleleng' },
  { code: 'DPS', name: 'Denpasar' },
  { code: 'GYN', name: 'Gianyar' },
  { code: 'JBR', name: 'Jembrana' },
  { code: 'KRA', name: 'Karangasem' },
  { code: 'KLG', name: 'Klungkung' },
  { code: 'TAB', name: 'Tabanan' },
]

// Kelompok Umur (PRD §24) — band usia + gender; KU otomatis dari tahun lahir.
const AGE_GROUPS = [
  { code: 'KU 8', name: 'KU 8', minAge: 0, maxAge: 8, gender: null, sortOrder: 1 },
  { code: 'KU 10 PI', name: 'KU 10 Putri', minAge: 9, maxAge: 10, gender: 'PUTRI', sortOrder: 2 },
  { code: 'KU 10 PA', name: 'KU 10 Putra', minAge: 9, maxAge: 10, gender: 'PUTRA', sortOrder: 3 },
  { code: 'KU 12 PI', name: 'KU 12 Putri', minAge: 11, maxAge: 12, gender: 'PUTRI', sortOrder: 4 },
  { code: 'KU 12 PA', name: 'KU 12 Putra', minAge: 11, maxAge: 12, gender: 'PUTRA', sortOrder: 5 },
  { code: 'KU 14 PA', name: 'KU 14 Putra', minAge: 13, maxAge: 14, gender: 'PUTRA', sortOrder: 6 },
  { code: 'KU 14 PI', name: 'KU 14 Putri', minAge: 13, maxAge: 14, gender: 'PUTRI', sortOrder: 7 },
  { code: 'KU 16 PI', name: 'KU 16 Putri', minAge: 15, maxAge: 16, gender: 'PUTRI', sortOrder: 8 },
  { code: 'KU 16 PA', name: 'KU 16 Putra', minAge: 15, maxAge: 16, gender: 'PUTRA', sortOrder: 9 },
  { code: 'KU 18 PI', name: 'KU 18 Putri', minAge: 17, maxAge: 18, gender: 'PUTRI', sortOrder: 10 },
  { code: 'KU 18 PA', name: 'KU 18 Putra', minAge: 17, maxAge: 18, gender: 'PUTRA', sortOrder: 11 },
] as const

async function main() {
  console.log('🌱 Seeding districts...')
  for (const d of DISTRICTS) {
    await prisma.district.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    })
  }

  console.log('🌱 Seeding age groups...')
  for (const ag of AGE_GROUPS) {
    await prisma.ageGroup.upsert({
      where: { code: ag.code },
      update: { name: ag.name, minAge: ag.minAge, maxAge: ag.maxAge, gender: ag.gender as 'PUTRA' | 'PUTRI' | null, sortOrder: ag.sortOrder },
      create: { ...ag, gender: ag.gender as 'PUTRA' | 'PUTRI' | undefined },
    })
  }

  console.log('🌱 Seeding default Central Admin...')
  const centralPasswordHash = await bcrypt.hash('admin123!', 10)
  const centralAdmin = await prisma.user.upsert({
    where: { email: 'admin@peltibali.id' },
    update: { name: 'Central Admin', passwordHash: centralPasswordHash, isActive: true },
    create: {
      email: 'admin@peltibali.id',
      name: 'Central Admin',
      passwordHash: centralPasswordHash,
      isActive: true,
    },
  })

  // null districtId can't be matched via compound unique — use findFirst + create
  const existingRole = await prisma.userRole.findFirst({
    where: { userId: centralAdmin.id, role: 'CENTRAL_ADMIN', districtId: null },
  })
  if (!existingRole) {
    await prisma.userRole.create({
      data: { userId: centralAdmin.id, role: 'CENTRAL_ADMIN', districtId: null },
    })
  }

  console.log('🌱 Seeding District Admin accounts...')
  const districtPasswordHash = await bcrypt.hash('password123', 10)
  for (const districtData of DISTRICTS) {
    const district = await prisma.district.findUniqueOrThrow({ where: { code: districtData.code } })
    const emailName = district.name.toLowerCase().replace(/[^a-z0-9]+/g, '')
    const districtAdmin = await prisma.user.upsert({
      where: { email: `admin@${emailName}.com` },
      update: { name: `Admin ${district.name}`, passwordHash: districtPasswordHash, isActive: true },
      create: {
        email: `admin@${emailName}.com`,
        name: `Admin ${district.name}`,
        passwordHash: districtPasswordHash,
        isActive: true,
      },
    })

    const existingDistrictRole = await prisma.userRole.findFirst({
      where: { userId: districtAdmin.id, role: 'DISTRICT_ADMIN', districtId: district.id },
    })
    if (!existingDistrictRole) {
      await prisma.userRole.create({
        data: { userId: districtAdmin.id, role: 'DISTRICT_ADMIN', districtId: district.id },
      })
    }
  }

  console.log('✅ Seed complete')
  console.log('   Central Admin: admin@peltibali.id / admin123!')
  console.log('   District Admins: admin@badung.com, admin@bangli.com, admin@buleleng.com, admin@denpasar.com, admin@gianyar.com, admin@jembrana.com, admin@karangasem.com, admin@klungkung.com, admin@tabanan.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
