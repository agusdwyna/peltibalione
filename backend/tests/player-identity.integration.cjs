// Run only against a disposable database after applying all migrations.
const assert = require('node:assert/strict')
const { prisma } = require('../dist/shared/database/prisma')
const { getPlayerDetail, updatePersonalInfo } = require('../dist/modules/players/players.service')
const { detectDuplicate, createSubmissionInDistrict, reviewSubmission } = require('../dist/modules/submissions/submissions.service')
const { createAccountForPlayer, checkStatus } = require('../dist/modules/status/status.service')

async function main() {
  const database = new URL(process.env.DATABASE_URL).pathname
  assert.match(database, /pelti_identity_test_/, 'Use a disposable migration test database')
  const admin = await prisma.user.findFirstOrThrow({ where: { userRoles: { some: { role: 'CENTRAL_ADMIN' } } } })
  const district = await prisma.district.findFirstOrThrow()
  const otherDistrict = await prisma.district.findFirstOrThrow({ where: { id: { not: district.id } } })
  const req = { auth: { userId: admin.id, roles: [{ role: 'CENTRAL_ADMIN', districtId: null }] } }
  const input = { fullName: 'Migration Test Player', nik: '9999999999999911', gender: 'PUTRA', birthDate: new Date('2013-03-02'), address: 'Test address', whatsapp: '0800000000' }
  assert.equal((await detectDuplicate(input)).match, 'NO_MATCH')
  const submission = await createSubmissionInDistrict(input, district.id, admin.id)
  const reviewed = await reviewSubmission(submission.id, { action: 'LINK' }, admin.id, district.id)
  const player = reviewed.player
  assert.equal(player.fullName, input.fullName)
  assert.equal(player.nik, input.nik)
  assert.equal(player.whatsapp, input.whatsapp)
  assert.equal((await detectDuplicate(input)).playerId, player.id)
  assert.equal((await detectDuplicate({ fullName: input.fullName, birthDate: input.birthDate })).match, 'POSSIBLE_MATCH')
  const status = await checkStatus(input.nik, input.fullName)
  assert.equal(status.playerId, player.id)
  assert.equal('personId' in status, false)
  await createAccountForPlayer(player.id, input.nik, input.fullName)
  const account = await prisma.user.findUniqueOrThrow({ where: { playerId: player.id } })
  const ownReq = { auth: { userId: account.id, roles: [{ role: 'PLAYER', districtId: district.id }] } }
  const ownDetail = await getPlayerDetail(player.id, ownReq)
  assert.equal(ownDetail.fullName, input.fullName)
  assert.notEqual(ownDetail.nik, input.nik)
  assert.equal('person' in ownDetail, false)
  assert.equal('user' in ownDetail, false)
  await assert.rejects(getPlayerDetail(player.id, { auth: { userId: admin.id, roles: [{ role: 'DISTRICT_ADMIN', districtId: otherDistrict.id }] } }))
  await assert.rejects(updatePersonalInfo(player.id, { nik: '9999999999999922' }, req))
  const updated = await updatePersonalInfo(player.id, { fullName: 'Updated Test Player', nik: '9999999999999922', whatsapp: '0811111111', confirmIdentityChange: true }, req)
  assert.equal(updated.nik, '9999999999999922')
  assert.equal(updated.whatsapp, '0811111111')
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).nik, updated.nik)
  const duplicate = await createSubmissionInDistrict({ ...input, nik: updated.nik }, district.id, admin.id)
  await assert.rejects(reviewSubmission(duplicate.id, { action: 'LINK' }, admin.id, district.id))
  assert.equal((await prisma.playerSubmission.findUniqueOrThrow({ where: { id: duplicate.id } })).status, 'SUBMITTED')
  console.log('PASS: submission review, duplicate detection, flat identity, account ownership, district scope, NIK masking, profile editing and account NIK sync')
}
main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
