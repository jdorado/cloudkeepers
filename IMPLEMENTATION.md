# Cloudkeepers cloud pilot

Objective: publish a generic open-source game with parent login and cross-device resume.
Constraints: preserve local saves; publish no private history; one small Vercel app/API; Clerk + Mongo; no agent runtime.
Owner: Cloudkeepers source owns deterministic play and saves; Clerk owns identity.
Simplest path: clean standalone repository, current Vite game, one revision-guarded account save API, local guest mode.
Proof: focused auth/isolation/conflict tests, live login and save/reload readback, public repository and Vercel receipts.
Stop: provider login or credential access requiring the owner; continue source and deployment preparation.
