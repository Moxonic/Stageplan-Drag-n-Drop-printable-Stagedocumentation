StagePlanner

A drag-and-drop tool for creating uniform stage plots and technical documentation for live sound and production, with export to PDF.

What it does

Instead of building stage plots from scratch in general-purpose design tools, StagePlanner gives you a working set of stage and audio elements you can place directly onto a stage layout:

Search the equipment catalogue — "Edit" above the storage strip opens a window where you search by brand, model or type ("sm58", "d&b v8", "wedge", "riser") or browse the whole catalogue by category. Press + on anything to put it in storage, then drag it from the rail onto the stage.
Everything lands at the right relative size — cabinets, risers, backline and people are drawn to scale from their real dimensions, against the meter grid of the stage you defined. Microphones and other pocket-sized gear are drawn as fixed-size symbols instead, since a 50 mm capsule would be invisible at true scale.
Keep your own equipment palette — the strip on the left is yours to edit: add what you use, drop what you don't, reorder it, and keep several named palettes for different rigs. The floppy disk at the top of the rail names the list you are working out of, and its menu holds both the other lists and everything you can do to this one: new, copy, rename, reset, export, import and delete. Palettes are saved in the browser and can be exported to a file and imported on another machine.
Add your own gear — anything not in the catalogue can be added with its own measurements.
Draw cable runs — connect elements visually to document signal and power paths. The eraser beside the pen rubs them out again, a whole run or only the stretch you drag across.
Keep every look of the show — a show is not one plot. Scenes hold each look of the stage, and between two scenes sits a shift: the change list the crew works from.
Export to PDF — save the finished show as a clean, shareable PDF for crew, venues, or advance planning.

The goal is uniform, professional-looking documentation with minimal effort, so stage plots stay consistent across shows and are easy for any tech team to read at a glance.

Background

Built from experience producing technical riders and stage plots for live sound and touring/installation work — a task that's normally slow and inconsistent when done by hand or in generic drawing software.

The interface

A top bar holds everything you set once and forget: show details that print on
the PDF, which stage you are drawing on, the pen and its colour, undo and redo,
and the export. The left rail is only equipment — the storage strip you drag
from, and Edit to change what is in it. The stage takes all the room that
leaves and scales to fill it.

Click anything on the plot to select it. A selected item shows its name, real
size and angle, with handles to turn and resize it and buttons to duplicate or
delete. Ctrl+Z undoes anything, including drawn lines. Press ? in the top bar
for the full list of shortcuts.

The moon in the top bar switches to dark mode, and the sun switches back.
Until you press it the app follows your system setting. The stage itself stays
white in both, because it is the page the PDF prints.

Defining a stage

"New stage" asks whether you want to build a new stage or open one you saved
earlier. A new stage is described in meters — main stage, optional side stages,
backstage and orchestra pit — and drawn to scale with a 1 m grid. The backstage
is drawn behind the back wall, so the crossover and the gear parked in it are
part of the same plan. Saved stages stay in the browser and can be exported to a
JSON file and imported again later, on this machine or another one.

A stage can also be saved with its equipment. "Save stage with equipment…" in
the Stage menu saves the stage that is drawn together with everything on it —
gear, labels and pen lines — under one name: the house rig, the fixed risers,
the positions that never change. It is listed under "Use an existing stage" as
"with equipment", and opening it draws the stage and puts everything back on it
(asking first if the stage is not empty; Ctrl+Z undoes it). Exported, the file
carries the equipment and any custom items it uses, so it opens complete on
another machine. Stage files without equipment still open as before.

Scenes and shifts

The strip under the stage holds the scenes of the show. "+ Scene" adds one that
starts as a copy of the scene you are on, so you build a change by taking the
last look and working it: drag off what goes, drop on what comes, move what
shifts across. Click a scene to open it, double-click its name to rename it,
and use the menu on a chip to duplicate, reorder or delete it.

Between two scenes is a shift. Click it and you get the change list, which is
never typed by hand — it is the difference between the two plots, so it cannot
say one thing while the drawings say another. Each step is marked OUT, IN or
MOVED, and a move states how far and which way. What the difference cannot work
out on its own is the order, so the order you did the work in is recorded as you
do it and the list follows it. Drag a row to put it somewhere else, and
"Recorded order" hands it back. Each shift takes a name, a time in whatever form
your team uses, a note, and a note per step.

The PDF gives every scene a page. Every page after the first opens with the
shift that leads into it — its name, its time and its numbered steps — and then
shows the plot that shift ends on.

Page one opens with the checklist: the files the show needs loaded, then
whatever you typed into Checklist under Show details, one item per line. Each
gets an empty square against the right margin to tick off on the printed sheet.
Comments sit just under it, with the loads rather than at the back of the
document.

The plot is photographed at roughly 300 dots per inch of its printed width, not
at the size it happens to be on screen, so the plan, the symbols and the labels
stay sharp on paper. Pen strokes are drawn again at that size rather than blown
up from the screen canvas, since a stroke is the one thing on the plot that
cannot be redrawn from the page itself.

A plot is printed as wide as the paper allows, wider than the text around it,
and takes a page of its own rather than being shrunk to fill a gap. Its heading
travels with it. Only a plot taller than the paper is scaled down, because by
then there is nothing left to give.

The show, its scenes and its shifts are kept in this browser as you work. Under
Show you can also save the whole thing to a file and open it again later, or on
another machine.

"New show" empties it again: one scene, a bare stage and no show details. Your
equipment storage and the stage keep what they have, since the rail is the kit
you work from and the stage is the room you are in. Save the show to a file
first if you want it back, as undo does not reach past a new show.

Players and instruments

People are drawn as a stage plot sees them, from above: the crown of the head,
shoulders, arms reaching to the instrument, and a chair where they sit. Every
player faces the front of the stage, so a violin rests on the right of the
drawing and its bow crosses from the left.

Two sections of the catalogue hold them. Orchestra has the strings, woodwinds,
brass, percussion, keyboards, harp and the conductor on the podium; seated
section players come with their chair and a music stand, so a section laid out
from them has room to bow. Musicians under Stage has the band: acoustic,
classical, electric and bass guitar, ukulele, mandolin, banjo, fiddle,
accordion, keyboard player, pianist, drummer, congas, cajón, bongos, a singer at
a mic stand, saxophone, trumpet and a DJ. The drum kit, pianos and keyboards in
Backline use the same drawings without a player.

The drawings live in equipment/musicians.js. Each one is drawn in millimetres at
its real size and fitted into the footprint the catalogue gives it without being
stretched, so a violin is the same 595 mm in every symbol that holds one.

Scale

Equipment is sized from one number: how many pixels equal a meter. Every stage
is drawn from the measurements you give it, so the stage states its own scale
and everything on it follows. The rail keeps only what it sets itself: how big
the fixed-size symbols are drawn, and whether names show.

On a phone

The rail becomes a drawer: the button at the top left slides it over the stage,
and a tap on the dimmed stage or on a piece of gear sends it back. Tap a row in
the rail to put that gear in the middle of the stage, since dragging out of a
drawer is a poor way to spend a thumb; a run of taps steps along a short
diagonal so the pieces land apart. Drag gear with a finger to move it, and use
the round handles on a selected piece to turn or resize it. The pen, the ruler
and the rubber all work by finger.

The top bar wraps onto two rows: the menus and the export button above, the
drawing tools below. responsive.js measures how tall it ended up, because the
popovers and the drawer hang from that height and CSS cannot ask. The keyboard
shortcut list is hidden, having nothing to say to a touch screen.

Signing in

Switched off for now. index.html no longer loads the sign-in window or the
account, cloud show, billing and team scripts, so the app opens straight onto
the stage and everything stays in the browser. The code is still in the folder
(account.js, cloud.js, showSync.js, billing.js, teams.js, account.css and
supabase/); the comment at the bottom of index.html says what to load again.
The sections below describe how it works once it is back on.

The app opens on a sign-in window and cannot be used until someone is signed
in. There are two ways in, and neither has a password: Continue with Google, or
type an email address and then the six-digit code sent to it. The first code for
a new address is what makes the account.

The Account button at the top right shows who is signed in, their plan and
their team, and holds Sign out and Delete account. Deleting cancels any
subscription, deletes the shows in the account and the teams the person
created, and asks PostHog to forget them. It cannot be undone.

The gate is in the browser, so it decides who gets the interface. Everything
worth protecting on the server — shows, teams, plans — is guarded by row level
security in supabase/schema.sql, not by the gate.

Shows in the account

The show is still kept in this browser as you work, and that copy is what
carries on offline. A couple of seconds after each change it is also saved to
the account, so the show built at home opens at the venue. The Show menu says
where it stands, and "Open from account…" lists every show saved there.

Each saved show carries a revision number. If the same show was changed on two
machines, the second one to save is told, and chooses which version wins.

"Copy crew link" copies a link to the show. Anyone signed in who opens it gets
the latest version; what they change is saved as their own copy, never over
yours.

Teams

A team is a venue or company and the crew who share its stage library and
storage lists. Create one under Account, then add people by email (they need to
have signed in once). The team's stages appear under your own in "Use an
existing stage", with "Share with team" to put one of yours there. The team's
storage lists appear in the floppy-disk menu, with "Share with team" to share
the list you are in. A shared list is the same list on every account: two people
editing it at the same moment, the last to save wins.

Plans and billing

The plan is a field on the account's profile, and only the server writes it,
from Stripe's webhook. The app reads it to decide what to show; the database
checks it again before creating a team or writing to a team's library.

There is one paid tier, priced per person per month. Upgrading opens Stripe
Checkout in a new tab and the app notices the change without being reloaded;
Manage billing opens Stripe's Customer Portal. No card number passes through
the app — Stripe holds it, and the profile holds only Stripe's customer id.

Until billing is switched on, everyone has everything. Everyone who signed up
before that day keeps the paid features for good, and the Account panel tells
them so.

What is counted

Nine events, sent to PostHog through Track.event() in track.js, and nothing
else: app_opened, work_minute (a minute with the tab in front and in use),
show_saved, show_opened, scene_added, stage_drawn, shift_written,
storage_exported and pdf_exported. They carry counts and sizes only — how many
scenes, how many items, how wide the stage — never the plot. PostHog's own
autocapture, page views and session recording are switched off. Once someone
signs in, the browser is identified by their account id, so counts from before
and after join up into one person. With no PostHog key in app.config.js,
nothing is sent. Changing where events go means changing track.js only.

If people in the EU use the app, check whether you need a consent notice and a
privacy page for the analytics before launch.

Setting it up

1. Supabase. Create a project and run supabase/schema.sql in its SQL editor.
   Under Authentication:
   - Providers: turn on Email, and turn on Google with a client id and secret
     from Google Cloud (OAuth client, redirect URI
     https://YOUR-PROJECT.supabase.co/auth/v1/callback).
   - Email templates: in "Magic Link" and "Confirm signup", show the code with
     {{ .Token }} so the email carries a code rather than only a link.
   - URL configuration: set the Site URL to where the app is hosted, and add it
     under Redirect URLs, so Google sends people back to it.
2. PostHog. Create a project and copy its project API key.
3. Configure the app. Copy app.config.example.js to app.config.js and fill in
   the Supabase URL and anon key, and the PostHog key and host. Everything in
   that file is public, so commit it; the host deploys it with the rest.
4. Host the files. Push the folder to Cloudflare Pages or Netlify as a static
   site: no build command, output directory the folder itself.
5. Stripe. Create a product with one monthly recurring price. Then, with the
   Supabase CLI linked to the project:

       supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_PRICE_ID=price_... \
           APP_ORIGIN=https://your-site.pages.dev
       supabase functions deploy checkout
       supabase functions deploy portal
       supabase functions deploy delete-account
       supabase functions deploy stripe-webhook --no-verify-jwt

   In Stripe, add a webhook endpoint at
   https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook for
   checkout.session.completed and customer.subscription.created, .updated and
   .deleted, and set its signing secret with
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... . Turn on the Customer
   Portal in Stripe's settings.
6. Optional: to have Delete account remove the person from PostHog too, set
   POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID and POSTHOG_HOST (for example
   https://eu.posthog.com) as Supabase secrets.
7. Launch day for billing: run
   update public.app_settings set billing_launched_at = now();
   in the SQL editor. The upgrade button appears for accounts made after that.

Getting started

There is no build step — it is plain HTML, CSS and JavaScript. Sign-in needs
the app served from a web address with app.config.js filled in; opened straight
from disk it shows the sign-in window with a note that sign-in is not set up.
For local work, serve the folder (for example python -m http.server) and add
http://localhost:8000 to Supabase's redirect URLs.

The first run draws a default 12 x 10 m stage. Define your own under Stage
Setup, and note that drawing a stage clears the plot, since gear placed for one
room does not belong in another. Ctrl+Z brings it back.

Any image the app needs must be inlined as a data URI rather than linked from
pics/. Opening the app from disk makes a linked image a foreign origin, which
taints the canvas the PDF is rendered through and breaks export.
