import { prisma } from '../database/prisma'

interface AuditLogInput {
  actorId: string
  action: string
  entityType: string
  entityId: string
  districtId?: string | null
  oldValue?: unknown
  newValue?: unknown
}

/**
 * Write an immutable audit log entry per PRD §37.
 */
export async function writeAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      districtId: input.districtId,
      oldValue: input.oldValue === undefined ? undefined : JSON.parse(JSON.stringify(input.oldValue)),
      newValue: input.newValue === undefined ? undefined : JSON.parse(JSON.stringify(input.newValue)),
    },
  })
}
