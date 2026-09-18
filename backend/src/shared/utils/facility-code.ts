import { prisma } from '../database/prisma'

/**
 * Generate unique facility code per district.
 * Format: FC-{DISTRICT_CODE}-{SEQUENCE}
 * Example: FC-DPS-000001
 */
export async function generateFacilityCode(districtCode: string): Promise<string> {
  const count = await prisma.facility.count({
    where: { district: { code: districtCode } },
  })
  const sequence = String(count + 1).padStart(6, '0')
  return `FC-${districtCode}-${sequence}`
}
