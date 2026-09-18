# Player identity migration checks

Migration `20260917110000_merge_person_into_player` copies identity fields into
`players`, rewires `users.playerId`, drops `persons`, and renames the existing
submission table to `player_submissions`. Existing IDs and file references stay
unchanged. Historical migration files remain intact so existing installations and
fresh databases can use the same migration history.

Deploy backend and frontend together: the player API now exposes identity fields
at the top level (`player.fullName`, not `player.person.fullName`). The submission
HTTP routes remain `/api/submissions`.

Validation performed:

- Applied the migration to a database clone and compared every identity field,
  account-to-player link, and submission row before and after.
- Confirmed an unmapped Person aborts the transaction without partial changes.
- Applied all migrations to an empty database and checked that the result matches
  the Prisma schema.
- Ran the integration checks below on the disposable clone.

To rerun the integration checks, build the backend, restore a development database
backup into a disposable database named `pelti_identity_test_<suffix>`, apply all
migrations, and point `DATABASE_URL` at that disposable database. It must contain
an admin and at least two districts (the normal development seed supplies them).
Then run:

```sh
npm run build
node tests/player-identity.integration.cjs
```

The test creates player, submission, account, and audit fixtures. It intentionally
refuses a database name outside the disposable test prefix. Drop the disposable
database after the run.

For normal deployment, back up the database, then use `prisma migrate deploy` and
`prisma generate`. Do not reset an existing database. If an unmapped Person exists,
resolve its ownership before retrying; the migration intentionally preserves that
identity by refusing to drop the table.
