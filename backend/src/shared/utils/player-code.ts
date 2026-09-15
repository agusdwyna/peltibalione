import { prisma } from '../database/prisma'

/**
 * Generate unique player code per district.
 * Format: PL-{DISTRICT_CODE}-{SEQUENCE}
 * Example: PL-BDG-000001
 */
export async function generatePlayerCode(districtCode: string): Promise<string> {
  const count = await prisma.player.count({
    where: { district: { code: districtCode } },
  })
  const sequence = String(count + 1).padStart(6, '0')
  return `PL-${districtCode}-${sequence}`
}
