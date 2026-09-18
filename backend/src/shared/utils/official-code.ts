import { prisma } from '../database/prisma'

/**
 * Generate unique official (wasit) code per district.
 * Format: RF-{DISTRICT_CODE}-{SEQUENCE}
 * Example: RF-DPS-000001
 */
export async function generateOfficialCode(districtCode: string): Promise<string> {
  const count = await prisma.official.count({
    where: { district: { code: districtCode } },
  })
  const sequence = String(count + 1).padStart(6, '0')
  return `RF-${districtCode}-${sequence}`
}
