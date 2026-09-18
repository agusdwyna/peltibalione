import { prisma } from '../database/prisma'

/**
 * Generate unique coach code per district.
 * Format: CO-{DISTRICT_CODE}-{SEQUENCE}
 * Example: CO-DPS-000001
 */
export async function generateCoachCode(districtCode: string): Promise<string> {
  const count = await prisma.coach.count({
    where: { district: { code: districtCode } },
  })
  const sequence = String(count + 1).padStart(6, '0')
  return `CO-${districtCode}-${sequence}`
}
