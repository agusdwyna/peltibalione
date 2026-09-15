import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import type { VerificationDecisionInput } from './verification.schema'

export async function decide(
  requestId: string,
  decision: 'APPROVED' | 'REJECTED',
  reviewerId: string,
  input: VerificationDecisionInput,
  scope: { central: boolean; districtId: string | null },
) {
  const vr = await prisma.verificationRequest.findUnique({ where: { id: requestId } })
  if (!vr) throw AppError.notFound('Verification request not found')
  if (vr.status !== 'PENDING') throw AppError.conflict('ALREADY_DECIDED', 'Verification request already processed')

  // Level-based authority check: DISTRICT level requires district scope match;
  // CENTRAL level requires central admin (PRD §32–§34).
  if (vr.level === 'CENTRAL' && !scope.central) {
    throw AppError.forbidden('Central verification requires CENTRAL_ADMIN')
  }
  if (vr.level === 'DISTRICT' && !scope.central && vr.districtId !== scope.districtId) {
    throw AppError.forbidden('Out of district scope')
  }

  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: input.notes,
      },
    })

    // On APPROVE, apply changes based on entity type
    if (decision === 'APPROVED' && request.payload) {
      if (request.entityType === 'PLAYER') {
        // PRD §32 — finalize player verification (PENDING_VERIFICATION → VERIFIED)
        const payload = request.payload as { playerId?: string }
        if (payload.playerId) {
          await tx.player.update({
            where: { id: payload.playerId },
            data: { status: 'VERIFIED' },
          })
        }
      } else if (request.entityType === 'DISTRICT_TRANSFER') {
        const payload = request.payload as { playerId?: string; toDistrictId?: string }
        if (payload.playerId && payload.toDistrictId) {
          const player = await tx.player.findUnique({ where: { id: payload.playerId } })
          if (player) {
            await tx.districtHistory.create({
              data: {
                playerId: player.id,
                fromDistrictId: player.districtId,
                toDistrictId: payload.toDistrictId,
                changedBy: reviewerId,
              },
            })
            await tx.player.update({
              where: { id: player.id },
              data: { districtId: payload.toDistrictId },
            })
          }
        }
      } else if (request.entityType === 'PLAYER') {
        const payload = request.payload as { playerId?: string }
        if (payload?.playerId) {
          await tx.player.update({
            where: { id: payload.playerId },
            data: { status: 'REJECTED' },
          })
        }
      }
    }

    return request
  })

  await writeAuditLog({
    actorId: reviewerId,
    action: decision,
    entityType: 'VERIFICATION',
    entityId: vr.id,
    districtId: vr.districtId,
    oldValue: { status: vr.status },
    newValue: { status: decision, notes: input.notes },
  })

  return updated
}