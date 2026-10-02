# Cloudkeepers

Play: **https://cloudkeepers.eztudy.space** · [Public source](https://github.com/jdorado/cloudkeepers)


A browser maths adventure with twelve numbered islands and creature rescues.
Each island is one learning level, rendered using three reusable procedural
backdrops. Create/edit a player nickname, choose UK Year 1, 2 or 3, and practise
at a starting difficulty. Each island adapts independently. Existing family
profiles remain in their private device saves; fresh installations have generic
players. No account or AI service is needed for local play.

Public MIT source: [jdorado/cloudkeepers](https://github.com/jdorado/cloudkeepers).
Optional parent login and online saves use Clerk, Vercel and MongoDB. See
[PLATFORM.md](PLATFORM.md) for the small cloud boundary and self-deployment steps.

## Run

```sh
yarn install --frozen-lockfile
yarn dev
```

Open `http://127.0.0.1:5191`. For an iPad on the same trusted local network,
`yarn dev:ipad` listens on the Mac's network address at port 5191. Use that address
in Safari. The default command listens only on this computer.

```sh
yarn test
yarn build
yarn preview
```

The static production game is in `dist/`. Vercel serves it alongside the `api/` functions.
Stop the development server before using `yarn preview` on the same port.

## Play and progress

- Pick or add a player, edit a nickname, and choose UK Year 1, 2, or 3, and With support, Practice, or Challenge.
  Each player has separate progress for each school year. Changing the starting
  difficulty affects new levels; started levels keep their adaptive difficulty.
- Walk using WASD, arrows, touch arrows, or tap/click the grass. Tap a landmark
  sign to walk to it, or press E when nearby. The **Island map** also opens
  unlocked practice directly.
- Island 1 is Level 1, Island 8 is Level 8, and so on. Completing the six-star
  rescue unlocks the next island. Three successful answers restore the local
  landmark, without unlocking a different maths level. Completed islands remain
  available for practice. Stops already played in older saves remain accessible.
- Rescue each creature with six independent first-attempt answers among the last
  eight questions attempted, including four at Challenge difficulty, two question
  styles, and six different question keys. This is a game practice milestone,
  rather than a school assessment or a claim of complete topic mastery.
- Each question shows one rescue checklist: two stars at any difficulty and four
  gold Challenge stars, with the remaining requirements stated directly. The
  Challenge stars are part of the six, not an extra set. Practice builds
  confidence; the selected difficulty explains the actual number range or skill.
  Landmark restoration is shown separately. A completed level shows all six stars
  and offers **Travel to next island** or extra practice.
- Missing-number arithmetic shows its equation once. The hidden operand is never
  drawn in a column or crossed-object diagram. Other column arithmetic uses a
  simple total/remaining-answer field rather than repeating the calculation.
- Two consecutive independent answers raise the next question's difficulty.
  Missing two consecutive questions lowers it. Repeated incorrect attempts on
  one question count once. Hints and correct retries restore landmarks but do
  not earn independent rescue stars. You can also change a level's difficulty
  manually at any time.
- The visual supports include countable crystals, place-value blocks, aligned
  columns, arrays, sharing baskets, fraction strips, coins, measures, clocks,
  shapes, and picture charts. Numeric questions accept typing or the number pad;
  other questions use answer choices. Hints are optional and unlimited.
- Rescue all twelve creatures to relight the Lighthouse and gather everyone at
  the final island. **Keep practising** returns to the level map with all progress
  retained. Every mastered level continues generating questions.
- Continue resumes the selected player's island and pending question, including
  typed input, hints and mistakes. Successful answers and rescues stay saved.
  After a solved question, Continue starts a fresh question on that island.
- Saves are local to this browser and exact site address. Other devices, browsers,
  ports or domains have separate storage. Clearing browser data removes saves.
  **Download save** keeps/transfers a JSON backup; **Restore save** replaces the
  device library with that file (all players and school years). A previous valid
  snapshot is retained locally and recovered if the current JSON is damaged.
  Storage failures are shown rather than claiming progress saved.
- The Island map has a collapsed **Parent: practice history** view. It stores the
  latest 500 answer/hint events per player/year: question identity, topic, band,
  representation, attempt, result, help and approximate active time. Hidden tabs,
  menus and idle time after 90 seconds are excluded; timing never decides stars
  or difficulty. The save download includes these events. Guest history stays local; signed-in saves include this bounded history.
- Existing learning-v2 saves migrate to version 3 with named profiles and earned
  progress intact. The anonymous adventure-v1 save is untouched and is not used
  to infer curriculum mastery. No past response timings are invented.
- The title button changes player/year. Sound starts muted; the music-note button
  enables gentle synthesized chimes. There is no timer or lost-rescue penalty.

## Curriculum and configuration

The topic reference is the [English National Curriculum mathematics programme](https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study).
The DfE page was last updated 28 September 2021; reviewed for this game on
1 October 2026. The game samples those topics and allows a parent to choose a
starting point. It does not reproduce a particular school's sequence or its
complete assessment/teaching repertoire.

| Level | Year 1 | Year 3 |
| --- | --- | --- |
| 1 | Counting, tens and ones | Hundreds, tens and ones |
| 2 | More, less and ordering | Comparing and ordering to 1,000 |
| 3 | Addition within 20 | Three-digit addition and exchanging |
| 4 | Subtraction within 20 | Three-digit subtraction and exchanging |
| 5 | Concrete groups of 2 | 3 times table and inverse division |
| 6 | Concrete groups of 5 | 4 times table and inverse division |
| 7 | Concrete groups of 10 | 8 times table and inverse division |
| 8 | Sharing and equal groups | Two-digit × one-digit and division |
| 9 | Halves and quarters | Fraction quantities, equivalence, tenths, same-denominator arithmetic |
| 10 | Coins and lengths | Change, unit conversions and perimeter |
| 11 | Hour/half-hour clocks and shapes | Exact-minute clocks and right angles |
| 12 | Counting and comparing picnic groups | Scaled picture charts, totals and differences |

Year 2 offers an intermediate track. Year 3 equal-group practice also revisits
2 and 5 facts, with earlier 2/5/10 grouping available at the support setting.
Questions vary their numbers and forms and avoid up to 100 recent question keys
per level. Small fact banks eventually revisit older facts.

- `src/curriculum.js`: topic/grade mapping, generated question repertoire,
  difficulty bands, route points, and mastery requirements.
- `src/journey.js`: island numbering, names, sequential unlocks and scene references.
- `src/learning.js`: deterministic adaptation, separate books and local telemetry.
- `src/save-store.js`: device snapshots and previous-valid backup recovery.
- `src/question-view.js`: visual maths supports.
- `src/game.config.js`: world landmarks, rescued friends, routes and discoveries.
- `src/main.js`: ordinary HTML controls and world integration.
- `src/world.js`: procedural Three.js models and effects.

Private learner history is excluded. Nicknames are editable local labels. The parent can tune the repertoire
and milestones in the curriculum configuration.

## Assets and checks

The fox, clouds, creatures, islands, plants, bridges, buildings, airships, and
celebration are procedural geometry. Maths diagrams are CSS and inline SVG.
Sound is synthesized locally. No downloaded images, external fonts, or network
asset requests are needed. Three.js uses its MIT license.

Twenty-two focused tests cover 21,600 generated questions across all topics,
years and bands, arithmetic/visual consistency, unique choices, recent-fact
avoidance, adaptation, assisted/retried answers, mastery, sequential island
unlocks, old-save migration, generic profile/year isolation, pending question IDs,
draft/time restoration, bounded telemetry and backup recovery. Cloud checks also cover account isolation, exact pending
question persistence, concurrent first writes, duplicate delivery, stale revisions,
lost acknowledgements and unauthenticated API rejection. All year/band
combinations can complete all twelve islands.

Browser proof includes migration of the previous named save without changing its
question, a fresh generic profile, Practice-to-Challenge progression, an assisted
retry across reload, six-star completion, travel from Island 1/Level 1 to Island
2/Level 2, saved draft input and exact question resume. The downloaded save was
restored through the file picker; a legacy save resumed
Island 8/Level 8 with its Lighthouse backdrop. The 390px phone HUD and playable
question were checked, including fixing a header/progress overlap. Imported
question representations and malformed save fields are validated. These are
viewport checks, rather than a
physical-device test. The existing full Year 3 question/finale playthrough predates
the journey update; generator and all-island domain checks cover the update.

Game source is licensed under [MIT](LICENSE). This repository has fresh history
and generic defaults. Operator credentials and player exports do not belong in source.

## Parent login and online saves

When cloud configuration is complete, **Sign in to save online** opens Clerk. Each parent
has a private game library with child nicknames and separate year tracks. The game
shows **Saved online** after acknowledgement; otherwise the account cache keeps
work on this device. Interrupted requests retry automatically. Sign-out and backup controls are in **Options**. Another device’s
newer save prompts a choice; download a backup before replacing either version.

Guest play retains the existing device save. Signing in starts/resumes the account
library and never uploads guest progress automatically. **Bring in progress from this device** in Options explicitly imports it. Existing localhost saves can be downloaded and
restored on the deployed site. Signing out returns to the guest library.

Cloud save verification covers 23 focused checks plus a real development-account
browser flow: a separate browser recovered the exact question and unfinished
answer, and concurrent edits prompted a save choice. Production DNS, HTTPS,
email configuration, live keys and the parent login screen are verified.
A parent completes their own email verification on first use.

Clerk handles adult identity; Mongo stores nicknames, selected tracks, practice
history and progress. Use aliases rather than full names. Cloudkeepers has one parent
per household and bounded history, with no AI processing or co-guardian invitations.
See [PLATFORM.md](PLATFORM.md) for operator setup and current limitations.
