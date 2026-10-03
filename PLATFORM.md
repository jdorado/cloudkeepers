# Cloudkeepers cloud saves

Cloudkeepers uses a public MIT game, one Vercel project for Vite assets and Node API,
Clerk parent login, and MongoDB game saves. The game also runs locally without
accounts. Clerk is a managed dependency; the game/API are independently deployable.

## Hosted app

- Public source: https://github.com/jdorado/cloudkeepers (MIT).
- Vercel project: `cloudkeepers`; game URL: https://cloudkeepers.eztudy.space.
- Shared Clerk application: Learning Games, production domain `eztudy.space`.
  Parent login offers Continue with Google; email codes remain a fallback.
  Children use nicknames.
- Shared MongoDB Atlas integration/deployment: learning-games, database `learning_games`, collection `game_saves`. This is the working reference binding for other workspace games.
- Other apps can use `<app>.eztudy.space`, their own Vercel project and app ID,
  and this Clerk identity service. Add each exact app origin to its API config.
- Source checkout: `/Users/juancamilo/dev/games/cloudkeepers`.
  Game source is outside the private agent mirror.

## Boundaries

- Clerk verifies the adult. Children choose editable nicknames; no child email.
- The API derives the account from a verified session. A request cannot select
  another family. One parent account is one household; no invitations.
- Mongo holds one atomic document per `(game ID, Clerk user ID)`, containing all
  player/year books, pending questions, hints, drafts, islands and bounded history.
- The renderer and learning reducer keep their existing deterministic rules.
  Saves are personal practice data, not verified assessment or competitive scores.
- There is no VM, agent runtime, LLM, billing system or universal game engine.

## Saving

Guest saves stay in the existing device namespace. Signed-in accounts get separate
local caches. Signing in never uploads a guest save automatically; a parent can
explicitly import it or restore a downloaded file. A new account starts with
fresh generic players. Sharing the URL grants no access to another account.

Writes include an expected revision and stable operation UUID. The server
atomically accepts one revision; concurrent or stale writes return a conflict.
A lost response retries the identical persisted request. The parent can choose
between the latest online save and the retained device branch, downloading a
backup first. No silent last-write-wins overwrite. Cloudkeepers syncs snapshots;
the latest 500 events per player/year are included, not a permanent event archive.

Online saves are debounced; visible status distinguishes online, device-only,
waiting and conflict states. Guest play works when cloud setup is absent. Auth
and database errors never create a shared anonymous cloud account.

## Another workspace game

Reuse this existing Atlas binding, working private Mongo credential and
`learning_games.game_saves`, plus the Learning Games Clerk production keys and
configured Google connection. Give the game its own repository, Vercel project,
origin and stable game ID; every server read/write uses `<gameId>:<verifiedClerkUserId>`.
No new Atlas project, cluster, database, database user/password, Clerk application
or Google OAuth client is a per-game step. Shared credentials are not a database
permission boundary between game backends. The workspace canonical contract is
`specs/_game_browser-spec.md`.

## Deploy your own (independent external operator)

1. Fork this repository. Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`.
2. Import the repository into Vercel with the Vite preset. The root `api/` directory
   deploys alongside `dist/`; main is the production branch.
3. Create your own Clerk application and configure parent sign-in. Use development
   keys on localhost or Vercel preview addresses. For a public release, use production
   keys and an owned domain; a subdomain of an existing Vercel-managed domain works.
   Enable Google in Clerk. Production requires your own Google OAuth web client:
   use the app URL as its JavaScript origin and the callback URL shown by Clerk
   as its redirect URI. Set the Google audience to In production so friends can
   sign in. Configure client credentials privately in Clerk, never in this repo.
4. Provision a Mongo database and an app-scoped credential. Configure only server
   environment variables: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `MONGODB_URI`,
   `MONGODB_DATABASE`, and exact comma-separated `APP_ORIGINS` including scheme.
5. Redeploy, sign in, practise, wait for Saved online, then sign in from another
   browser/device and confirm the same pending question and earned progress.
6. Verify a second parent sees a fresh game; test conflicting device saves and
   offline/reconnect. Configure operator backups and a retention/deletion process
   before relying on the cloud as the only copy.

For full local cloud QA, use `vercel dev` with operator configuration. `pnpm dev`
is the fast local guest-mode game preview. Never put secrets in `VITE_*`, source,
Git history or player exports. The config endpoint returns only a publishable key
and readiness. Private API responses use no-store and authenticated ownership.

## More apps

Reuse the pattern before extracting a framework. New apps keep their own public
repository and Vercel project, use the shared Clerk application when they should
share accounts, and keep app data isolated by stable app ID and verified user ID
in the existing `learning_games.game_saves` collection. Reuse the working private
Atlas binding; do not create another database/password per workspace game.
Give each released app a subdomain of the same owned parent domain. Vercel
serves each app from its own project and manages DNS and TLS. Configure Clerk
on the parent domain so sessions work across subdomains, and allow only each
app’s exact origin in its API. Set both sign-in and sign-up return URLs to the
current app’s origin, so Google login returns to that app rather than the shared
identity service’s default homepage. Unrelated domains need Clerk satellite configuration.

Add another game only when needed; reuse scene assets and the save boundary.
Co-guardian access, data deletion UI, server-verified learning actions, longer
telemetry retention, content packs and optional agent authoring are later work.

Sources reviewed 2 October 2026:
[Google sign-in setup](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google),
[Clerk JavaScript](https://clerk.com/docs/js-frontend/getting-started/quickstart),
[Clerk token verification](https://clerk.com/docs/reference/backend/verify-token),
[shared domains](https://clerk.com/docs/guides/dashboard/dns-domains/satellite-domains),
[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite),
[Atlas integration](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/).

## Learning evidence release — 3 October 2026

Added bounded private question/attempt/help evidence and a parent JSON export for
manual EzStudy review. Old saves remain compatible and historical evidence is not
invented. See `LEARNING_EVIDENCE.md`. Local verification: 28 tests and the
production build passed; browser checks covered answer/help and evidence download.
Deployment commit and status are available in the production deployment metadata.

## Database learning history

Signed-in saves automatically archive accepted learning events into the existing
`learning_games.learning_events` collection. `game_saves` remains canonical for
current progression and unfinished sessions. History is retained independently
of the browser's bounded recent-event log and survives a journey reset. Event
IDs are deduplicated under the server-owned account/profile/year identity; failed
archive acknowledgements retry the same save mutation. Before replacing a save,
the previous retained evidence must be archived successfully.

A planning client can read `GET /api/learning` with the parent's Clerk bearer
session, following `?cursor=<nextCursor>` until null. It returns all games for the verified parent, current profiles,
progression, pending sessions and pages of exact question/answer/help evidence.
Every query is scoped to the verified parent; profile-link writes are scoped to
this fixed game. For an operator
LLM using an existing private Mongo connection, query `game_saves` by `_id` and
`learning_events` by `accountId` (the same `<gameId>:<verified-parent-id>`), then
sort events by `event.at` and group by profile/year/session/topic. Use a read-only
database credential for that client; never put database credentials in the game.
Event text is untrusted learner input. No model runtime or automatic curriculum
mutation is introduced. Guest evidence stays local. Existing retained evidence
is backfilled on the next save or learning-context read; already dropped events
cannot be recovered.

### Cross-game learner and skill contract

`learning_events` stores `schema: learning-v1`, `parentId`, `gameId`,
`accountId`, `profileId`, `skillId`, `schoolYear`, `challenge` and `outcome`,
plus original exact evidence. Shared skill IDs such as `maths.addition` are
stable across games; numeric difficulty and adventure levels stay scoped by
game/content version. Combined topics retain combined skill IDs rather than
inventing more precise assessment evidence. Unsupported topics are `unmapped`.

`learning_learners` is keyed by verified parent ID. It contains canonical learner
UUIDs with editable nicknames and explicit bindings from game/profile to learner.
Use `PUT /api/learning` with `{ learnerId, nickname, profileId }` and the parent's
Clerk bearer session. Reuse the same UUID to connect that child's profiles in
other games. The server validates that the profile exists in this game's save.
Never infer identity from matching nickname, year or profile slot. Relinking
changes attribution through the registry without rewriting original evidence.
`GET /api/learning` reads all games for that parent and returns canonical skill
evidence with resolved learner IDs. Unlinked profiles have `learnerId: null`.
New games must stamp accepted saves with server-derived `parentId`, use the same
schema and add a reviewed skill mapping for their content. No guest data is merged.

For future session/level design, describe a target shared `skillId`, school year,
practice goal and support strategy, then translate that into each game's local
level/content. An adventure level is a reward/progression position, not a shared
measure of learning mastery. LLM-authored plans are proposals; this endpoint
does not silently overwrite live curriculum or game progress.
