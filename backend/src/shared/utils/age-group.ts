import { prisma } from '../database/prisma'

export type Gender = 'PUTRA' | 'PUTRI'

type AgeGroupResolution = {
  id: string
  code: string
}

/**
 * Resolve the current age group while retaining the selected PA/PI track.
 *
 * `selectedAgeGroup` is the previously selected group code. When it is a
 * gendered group, its gender is the authority for promotion (for example,
 * KU 14 PA -> KU 16 PA). The optional legacy gender is only used when there
 * is no gendered selected group, so old records can still be synchronised.
 */
export async function resolveAgeGroup(
  birthDate: Date | undefined | null,
  selectedAgeGroup?: string | null,
  legacyGender?: Gender | null,
): Promise<AgeGroupResolution | null> {
  if (!birthDate) return null

  const selected = selectedAgeGroup
    ? await prisma.ageGroup.findUnique({
        where: { code: selectedAgeGroup },
        select: { id: true, code: true, gender: true },
      })
    : null
  const gender = selected?.gender ?? legacyGender ?? null
  const age = new Date().getFullYear() - birthDate.getFullYear()

  const group = await prisma.ageGroup.findFirst({
    where: {
      minAge: { lte: age },
      AND: [
        { OR: [{ maxAge: { gte: age } }, { maxAge: null }] },
        ...(gender ? [{ OR: [{ gender }, { gender: null }] }] : []),
      ],
    },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, code: true },
  })

  if (group) return group

  // Prefer an OPEN group for the retained track, if one exists.
  const open = await prisma.ageGroup.findFirst({
    where: {
      maxAge: null,
      ...(gender ? { OR: [{ gender }, { gender: null }] } : {}),
    },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, code: true },
  })
  if (open) return open

  // Keep a valid selected value when the master data has no band for the age.
  // This prevents a lazy sync from erasing a manually selected legacy group.
  return selected ? { id: selected.id, code: selected.code } : null
}
