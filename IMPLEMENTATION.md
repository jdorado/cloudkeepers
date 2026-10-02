# Cloudkeepers sign-in and saving

Objective: Google sign-in without email typing; automatic saves without account clutter.
Constraints: preserve existing progress and account isolation; keep offline guest play; keep credentials private.
Owner: Clerk owns identity; Cloudkeepers owns automatic saving and the play UI.
Simplest path: configure the existing Google provider; hide backup/account actions in Options; retry transient save failures automatically.
Proof: real Google redirect, signed-in simple screen, automatic retry with the same request ID, cloud readback.
Stop: owner-only Google credential creation or approval; finish independent UI work first.
