# Cloudkeepers

Canonical local checkout: `/Users/juancamilo/dev/other/cloudkeepers`.
New browser games belong under `/Users/juancamilo/dev/other/<repository-name>`.

Standalone public maths game. Work on main; preserve unrelated changes.
Vite/Three.js owns play; Vercel Node API owns verified identity and Mongo saves.
Clerk is parent authentication; child nicknames are data, never credentials.
This is the working shared-provider reference: Learning Games Clerk production
application/Google connection and Atlas `learning-games`, database `learning_games`,
collection `game_saves`. Other workspace games reuse these private bindings and
scope every server read/write by fixed game ID and verified parent ID. Do not
provision another database/password per game. Follow the workspace canonical
`/Users/juancamilo/dev/specs/_game_browser-spec.md`; external self-deployers own
their own provider setup.
Keep family data, exports, operator secrets and private Git history out of source.
Use pnpm. Run focused domain checks and browser smoke before pushing/deploying.
Local guest play must remain available without cloud credentials.
