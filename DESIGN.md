# Cloudkeepers: adaptive maths adventure

## Game design brief

A scarf-wearing fox travels between twelve floating islands and rescues one
creature on each. **Island number equals level number.** Each stop contains a
maths topic, adapting to the selected UK Year 1, 2 or 3 track. Practice and
Challenge describe question difficulty within that island, rather than separate
journeys. A completed island unlocks the next; earlier islands remain open for
practice. The world renders one stop at a time using the existing Garden,
Workshop and Lighthouse scene templates, varying its objective, creature and
colour. Rescued friends come along. All twelve gather for the final beacon.

The loop is: choose an open island, solve varied maths, earn rescue stars, restore
a landmark, rescue its friend, and travel onward. Three successful answers restore
the local scenery; they no longer open a different maths level. The six-star
rescue is the one completion/travel milestone. Optional discoveries, changing
scenery and creature celebrations reward exploration. There is no timer, lost
rescue or failure screen.

## Practice milestone

A rescue needs six independent first-attempt answers among the most recent eight
questions attempted, with at least two representations and six distinct question
keys. Every adaptive difficulty can earn rescue stars. Four independent Challenge
answers earn an optional persistent Gold achievement, but never block travel.
Explicit remaining text and the completed-level screen show when travel unlocks;
six displayed rescue stars therefore always means complete. The game alternates
question forms when possible and avoids recent keys. Small fluency banks eventually
revisit old facts.

Two independent answers raise the next question's band; two distinct misses lower
it. Each island adapts independently. Hints and corrected retries restore the
landmark but do not earn independent rescue stars. A miss is counted once per
question for adaptation; every submitted attempt is separately logged. Saved
hints/mistakes cannot become independent answers through reload. Rescues remain
earned during later practice. This is a game milestone, not a school assessment
or evidence of complete curriculum mastery.

## State and ownership

`journey.js` owns logical stop numbering and availability. `curriculum.js` owns
topic mappings and question repertoire. `learning.js` owns deterministic practice
state, separate player/year books and bounded local events. `save-store.js` owns
primary/previous-valid device snapshots. `world.js` renders scene templates and
rewards, while `main.js` presents ordinary HTML controls and measures active time.
No login service, account database, agent runtime or external AI is currently
needed to play. The Clerk/Mongo cloud boundary is described in `PLATFORM.md`.

Version 3 books retain current/resume island, the pending question's stable ID,
draft input, approximate active time, hints and first-attempt mistakes. Continue
opens the saved question. A solved question resumes with a fresh question on the
same island; a rescued friend stays rescued. Exiting the question intentionally
resumes exploration. The previous valid save is kept as a backup. A failed storage
write is visibly identified. Download/restore transfers all local player/year
books, including the latest 500 local practice events per book.

Existing version 2 names and progress migrate without resetting rescues. Stops
already played in the older free-roaming format stay accessible; new stops use
sequential rescue unlocks. The untouched anonymous adventure-v1 save is not
curriculum mastery. New installations use editable generic nicknames. Nicknames
are local labels, not authenticated accounts. Different browsers/devices/origins
currently have separate saves, and clearing browser storage removes local data.

Parent history records question identity, pack version, topic/form/band, attempt,
correctness, independence, hint use and cumulative approximate active milliseconds.
Time accrues only while a pending question is open, visible and focused, excluding
menus, hidden tabs and inactivity after 90 seconds. Timing never affects stars or
the current adaptive band. Historical timing is not reconstructed.

Private learner observations stay out of game source and published content.
Parent account isolation, revision checks and offline retry are implemented for the cloud saves. Co-guardian sharing, an event archive and optional agent-authored packs remain future work.
