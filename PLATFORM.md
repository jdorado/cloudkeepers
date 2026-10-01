# Cloudkeepers cloud pilot

The pilot uses a public MIT game, one Vercel project for Vite assets and Node API,
Clerk parent login, and MongoDB game saves. The game also runs locally without
accounts. Clerk is a managed dependency; the game/API are independently deployable.

## Boundaries

- Clerk verifies the adult. Children choose editable nicknames; no child email.
- The API derives the account from a verified session. A request cannot select
  another family. One parent account is one household in this pilot; no invitations.
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
backup first. No silent last-write-wins overwrite. The pilot syncs snapshots;
the latest 500 events per player/year are included, not a permanent event archive.

Online saves are debounced; visible status distinguishes online, device-only,
waiting and conflict states. Guest play works when cloud setup is absent. Auth
and database errors never create a shared anonymous cloud account.

## Deploy your own

1. Fork this repository. Run `yarn install --frozen-lockfile`, `yarn test`, `yarn build`.
2. Import the repository into Vercel with the Vite preset. The root `api/` directory
   deploys alongside `dist/`; main is the production branch.
3. Create your own Clerk application and configure parent sign-in. Use a production
   instance on a custom domain for sharing. Development keys are for pilot testing.
4. Provision a Mongo database and an app-scoped credential. Configure only server
   environment variables: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `MONGODB_URI`,
   `MONGODB_DATABASE`, and exact comma-separated `APP_ORIGINS` including scheme.
5. Redeploy, sign in, practise, wait for Saved online, then sign in from another
   browser/device and confirm the same pending question and earned progress.
6. Verify a second parent sees a fresh game; test conflicting device saves and
   offline/reconnect. Configure operator backups and a retention/deletion process
   before relying on the cloud as the only copy.

For full local cloud QA, use `vercel dev` with operator configuration. `yarn dev`
is the fast local guest-mode game preview. Never put secrets in `VITE_*`, source,
Git history or player exports. The config endpoint returns only a publishable key
and readiness. Private API responses use no-store and authenticated ownership.

## More apps

Reuse the pattern before extracting a framework. New apps keep their own public
repository and Vercel project, use the shared Clerk application when they should
share accounts, and keep app data isolated by stable app ID and verified user ID.
Subdomains on one parent domain simplify shared sessions. Unrelated domains need
Clerk satellite configuration and a paid production plan.

Add another game only when needed; reuse scene assets and the save boundary.
Co-guardian access, data deletion UI, server-verified learning actions, longer
telemetry retention, content packs and optional agent authoring are later work.

Sources reviewed 1 October 2026:
[Clerk JavaScript](https://clerk.com/docs/js-frontend/getting-started/quickstart),
[Clerk token verification](https://clerk.com/docs/reference/backend/verify-token),
[shared domains](https://clerk.com/docs/guides/dashboard/dns-domains/satellite-domains),
[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite),
[Atlas integration](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/).
