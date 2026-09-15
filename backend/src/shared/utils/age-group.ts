import { prisma } from '../database/prisma'

/**
 * PRD §24 — resolve age group from birth date.
 * Age is computed as `currentYear - birthYear` (year-only, no month/day precision).
 *
 * Band boundaries (master data in `age_groups`):
 *   KU-10  → age ≤ 10
 *   KU-12  → 11–12
 *   KU-14  → 13–14
 *   KU-16  → 15–16
 *   KU-18  → 17–18
 *   OPEN   → 19+ (future ceiling, entries may be absent today)
 */
export async function resolveAgeGroup(birthDate: Date | undefined | null): Promise<{
  id: string
  code: string
} | null> {
  if (!birthDate) return null

  const age = new Date().getFullYear() - birthDate.getFullYear()

  const group = await prisma.ageGroup.findFirst({
    where: {
      minAge: { lte: age },
      OR: [{ maxAge: { gte: age } }, { maxAge: null }],
    },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, code: true },
  })

  // Fallback: oldest band with no upper bound (OPEN).
  if (!group) {
    const open = await prisma.ageGroup.findFirst({
      where: { maxAge: null },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, code: true },
    })
    return open ?? null
  }

  return group
}