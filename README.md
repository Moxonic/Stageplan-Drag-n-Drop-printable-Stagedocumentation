StagePlanner

A drag-and-drop tool for creating uniform stage plots and technical documentation for live sound and production, with export to PDF.

What it does

Instead of building stage plots from scratch in general-purpose design tools, StagePlanner gives you a working set of stage and audio elements you can place directly onto a stage layout:

Search the equipment catalogue — find a specific model by brand, model or type ("sm58", "d&b v8", "wedge", "riser") and drag it straight onto the stage.
Everything lands at the right relative size — cabinets, risers, backline and people are drawn to scale from their real dimensions, against the meter grid of the stage you defined. Microphones and other pocket-sized gear are drawn as fixed-size symbols instead, since a 50 mm capsule would be invisible at true scale.
Keep your own equipment palette — the strip on the left is yours to edit: add what you use, drop what you don't, reorder it, and keep several named palettes for different rigs. Palettes are saved in the browser and can be exported to a file and imported on another machine.
Add your own gear — anything not in the catalogue can be added with its own measurements.
Draw cable runs — connect elements visually to document signal and power paths.
Export to PDF — save the finished plot as a clean, shareable PDF for crew, venues, or advance planning.

The goal is uniform, professional-looking documentation with minimal effort, so stage plots stay consistent across shows and are easy for any tech team to read at a glance.

Background

Built from experience producing technical riders and stage plots for live sound and touring/installation work — a task that's normally slow and inconsistent when done by hand or in generic drawing software.

The interface

A top bar holds everything you set once and forget: show details that print on
the PDF, which stage you are drawing on, the pen and its colour, undo and redo,
and the export. The left rail is only equipment — search and your palette. The
stage takes all the room that leaves and scales to fill it.

Click anything on the plot to select it. A selected item shows its name, real
size and angle, with handles to turn and resize it and buttons to duplicate or
delete. Ctrl+Z undoes anything, including drawn lines. Press ? in the top bar
for the full list of shortcuts.

Defining a stage

"New stage" asks whether you want to build a new stage or open one you saved
earlier. A new stage is described in meters — main stage, optional side stages
and orchestra pit — and drawn to scale with a 1 m grid. Saved stages stay in
the browser and can be exported to a JSON file and imported again later, on
this machine or another one.

Scale

Equipment is sized from one number: how many pixels equal a meter. A stage you
defined states its own scale and always wins. The built-in house plan is only a
picture, so there you set "Stage width" to how wide that drawing is in reality
and everything follows it.

Getting started

Open index.html in Chrome. There is no build step — it is plain HTML, CSS and
JavaScript.

The house plan drawing is inlined into housePlan.css as a data URI rather than
linked from pics/. Opening the app from disk makes a linked image a foreign
origin, which taints the canvas the PDF is rendered through and breaks export.
If the plan drawing ever changes, regenerate that file from pics/HSCmini.PNG.
