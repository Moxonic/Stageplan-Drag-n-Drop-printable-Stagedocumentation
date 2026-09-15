window.penEnabled = false;
let isDrawing = false;
let startX = 0;
let startY = 0;

let lineWidth = 2;
let strokeStyle = '#000000';
let holdTimer = null;
let holdDuration = 5000; // Duration in milliseconds to detect a long hold
let isStraightLine = false;   // true for the stroke being drawn right now
let straightOnly = false;     // the ruler button: every stroke is a line
let currentLine = [];
let lines = []; // Array to store all lines
let penColor = 'black';
let smoothness = 4; // Adjust this value to control the smoothness

window.eraserEnabled = false;
let isErasing = false;
let erasedSomething = false;
let eraserAt = null;    // where the rubber is on the canvas, for its ring
let eraserFrom = null;  // where it was on the move before this one

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const penButton = document.getElementById('penButton');
const thicknessButtons = document.querySelectorAll('.thickness');
const colorButtons = document.querySelectorAll('.color');
const penColourDot = document.getElementById('penColourDot');
const straightLineBtn = document.getElementById('straightLineBtn');
const eraserButton = document.getElementById('eraserButton');

// Choose marker color. The swatches sit in a dropdown hung off the pen, so a
// pick marks the swatch, repaints the bar under the pencil and shuts the menu.
function setPenColor(button) {
    penColor = button.dataset.color || button.id;
    colorButtons.forEach(b => b.classList.toggle('is-on', b === button));
    if (penColourDot) penColourDot.style.background = penColor;
}

colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (isDrawing) return;
        setPenColor(button);
        // Reaching for a colour means you want to draw, so the pen is the
        // colour picker: choosing one also picks the pen up.
        setPenEnabled(true);
        if (window.TopBar) window.TopBar.closeMenus();
    });
});

const startingColor = document.querySelector('.color.is-on') || colorButtons[0];
if (startingColor) setPenColor(startingColor);

// Pen on or off. Its own function because picking a colour or switching on
// straight lines both mean "I want to draw", and so pick the pen up too.
//
// Only the canvas and the things standing on the plan change. Everything
// outside the plan keeps its normal cursor and its normal clicks, so the rail,
// the menus and the scene strip still select while the pen is in hand; what
// lets a line cross gear is the is-drawing rule in style.css.
function setPenEnabled(on) {
    if (window.penEnabled === on) return;
    window.penEnabled = on;
    // One tool at a time: taking up the pen puts the rubber down.
    if (on) setEraserEnabled(false);

    penButton.classList.toggle('is-on', on);
    penButton.setAttribute('aria-pressed', String(on));
    penButton.title = on ? 'Pen on — click to stop drawing' : 'Pen — draw cable runs';

    syncDrawingSurface();
}

// The rubber rubs out what the pen drew and nothing else: gear and labels are
// deleted the way they always were, so a stray pass cannot cost you a speaker.
function setEraserEnabled(on) {
    if (window.eraserEnabled === on) return;
    window.eraserEnabled = on;
    if (on) setPenEnabled(false);

    if (eraserButton) {
        eraserButton.classList.toggle('is-on', on);
        eraserButton.setAttribute('aria-pressed', String(on));
        eraserButton.title = on
            ? 'Eraser on — click to put it down'
            : 'Eraser — rub out drawn lines';
    }

    if (!on) {
        finishErase();
        eraserAt = null;
    }
    syncDrawingSurface();
    redrawCanvas();
}

// Whichever tool is in hand, the stage becomes the live surface the same way.
function syncDrawingSurface() {
    const active = window.penEnabled || window.eraserEnabled;
    canvas.style.cursor = active ? 'crosshair' : 'default';

    const app = document.getElementById('app');
    if (active) {
        if (window.Selection) window.Selection.clear();
        app.classList.add('is-drawing');
    } else {
        app.classList.remove('is-drawing');
    }
}

penButton.addEventListener('click', () => setPenEnabled(!window.penEnabled));
if (eraserButton) {
    eraserButton.addEventListener('click', () => setEraserEnabled(!window.eraserEnabled));
}

// Straight lines only: a stroke runs from where the drag starts to where it
// ends, with nothing in between. Shift gets you one line without the button.
function setStraightOnly(on) {
    straightOnly = on;
    if (!straightLineBtn) return;
    straightLineBtn.classList.toggle('is-on', on);
    straightLineBtn.setAttribute('aria-pressed', String(on));
    straightLineBtn.title = on
        ? 'Straight lines only — click for freehand'
        : 'Straight lines only';
}

if (straightLineBtn) {
    straightLineBtn.addEventListener('click', () => {
        if (isDrawing) return;
        setStraightOnly(!straightOnly);
        if (straightOnly) setPenEnabled(true);
    });
}

// Ensure crosshair cursor when hovering over the canvas if drawing is active
canvas.addEventListener('mouseenter', () => {
    if (window.penEnabled || window.eraserEnabled) {
        canvas.style.cursor = 'crosshair';
    }
});

canvas.addEventListener('mouseleave', () => {
    if (window.penEnabled || window.eraserEnabled) {
        canvas.style.cursor = 'default';
    }
});

thicknessButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (!isDrawing) {
            lineWidth = parseInt(button.dataset.thickness, 10);
        }
    });
});

// The canvas is stretched to fill the stage, so a position on screen has to be
// scaled into the canvas's own units before it means anything here.
function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

canvas.addEventListener('mousedown', (e) => {
    if (window.eraserEnabled) {
        const p = canvasPoint(e);
        isErasing = true;
        erasedSomething = eraseAlong(p.x, p.y, p.x, p.y);
        eraserFrom = p;
        eraserAt = p;
        redrawCanvas();
        return;
    }
    if (window.penEnabled) {
        isDrawing = true;
        // The ruler button holds for every stroke; Shift is for just this one.
        isStraightLine = straightOnly || e.shiftKey;
        const p = canvasPoint(e);
        startX = p.x;
        startY = p.y;
        currentLine = [{ x: startX, y: startY }]; // Start a new line

        // Freehand only: holding still part-way snaps what is drawn straight.
        if (!isStraightLine) {
            holdTimer = setTimeout(() => {
                isStraightLine = true;
                redrawCanvas();
            }, holdDuration);
        }
    }
});

// Function to finish the current line
function finishCurrentLine(e) {
    if (isDrawing) {
        isDrawing = false;
        clearTimeout(holdTimer);
        if (isStraightLine && e) {
            const { x, y } = canvasPoint(e);
            currentLine = [{ x: currentLine[0].x, y: currentLine[0].y }, { x, y }];
            isStraightLine = false;
        }
        // A click without movement leaves a single point, and the tail curve
        // in redrawCanvas would then read points[-1]. Not a line; drop it. A
        // straight stroke that never left its start is the same non-event.
        if (currentLine.length > 1 && !isDot(currentLine)) {
            lines.push({ points: currentLine, color: penColor, width: lineWidth });
        }
        currentLine = [];
        redrawCanvas();
        if (window.PlotHistory) window.PlotHistory.record();
    }
}

// A stroke that begins and ends in the same place, within a pixel.
function isDot(points) {
    const a = points[0];
    const b = points[points.length - 1];
    return points.length === 2 && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
}

// Add event listener for mousemove to finish the line if hovering over dropped equipment
canvas.addEventListener('mousemove', (e) => {
    if (window.eraserEnabled) {
        const p = canvasPoint(e);
        eraserAt = p;
        if (isErasing) {
            // Rub along the path since the last move rather than at this point
            // alone, so a quick drag cannot step over a line between events.
            if (eraseAlong(eraserFrom.x, eraserFrom.y, p.x, p.y)) erasedSomething = true;
            eraserFrom = p;
        }
        redrawCanvas();  // the ring follows the pointer
        return;
    }
    if (isDrawing) {
        const { x, y } = canvasPoint(e);
        const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
        if (elementUnderCursor && (elementUnderCursor.classList.contains('dropped-equipment') || elementUnderCursor.classList.contains('gear'))) {
            finishCurrentLine(e);
        } else if (isStraightLine) {
            // Only the two ends matter, and redrawCanvas draws the rubber band
            // in the pen's own colour and weight.
            currentLine = [currentLine[0], { x: x, y: y }];
            redrawCanvas();
        } else {
            currentLine.push({ x, y });
            redrawCanvas();
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    finishErase();
    finishCurrentLine(e);
});

// Leaving the canvas mid-stroke keeps what was drawn rather than losing it.
canvas.addEventListener('mouseleave', (e) => {
    finishErase();
    eraserAt = null;
    if (window.eraserEnabled) redrawCanvas();
    finishCurrentLine(e);
    canvas.style.cursor = 'default';
});

/* ------------------------------- the rubber -------------------------------
 *
 * It works on the strokes themselves rather than on pixels: a pass cuts every
 * stroke it crosses, and what is left of one stays a stroke of its own. So a
 * rubbed-out line is one undo away, and what survives still goes into the
 * scene, the saved show and the PDF as a line rather than as a hole.
 */

const ERASER_SCREEN_PX = 14;  // how big the rubber looks, whatever the stage
const ERASE_STEP = 2;         // how closely a stroke is walked, canvas units

// Sized on screen and converted, so it feels the same whether the stage is
// drawn small or large.
function eraserRadius() {
    const rect = canvas.getBoundingClientRect();
    return ERASER_SCREEN_PX * (rect.width ? canvas.width / rect.width : 1);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// A straight stroke is only its two ends, so walk the stroke at a fixed step
// to find where along it the rubber went. The step is what a cut end lands on.
function densify(points, step) {
    const out = [points[0]];
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
        for (let s = 1; s <= steps; s++) {
            out.push({
                x: a.x + (b.x - a.x) * (s / steps),
                y: a.y + (b.y - a.y) * (s / steps)
            });
        }
    }
    return out;
}

// Drop the points that sit on the line between their neighbours, so a cut
// straight line goes back to two points instead of the hundred the walk made.
function simplify(points) {
    if (points.length < 3) return points;
    const out = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
        const a = out[out.length - 1];
        const b = points[i];
        const c = points[i + 1];
        if (distanceToSegment(b.x, b.y, a.x, a.y, c.x, c.y) > 0.3) out.push(b);
    }
    out.push(points[points.length - 1]);
    return out;
}

// What is left of one stroke after a pass. null means the rubber missed it,
// so the caller keeps that stroke exactly as it was.
function cutStroke(line, x0, y0, x1, y1, radius) {
    if (!line.points || line.points.length < 2) return null;
    const reach = radius + (line.width || 1) / 2;

    // cheap reject: the box the rubber swept against the stroke's own
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    line.points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });
    if (Math.max(x0, x1) + reach < minX || Math.min(x0, x1) - reach > maxX) return null;
    if (Math.max(y0, y1) + reach < minY || Math.min(y0, y1) - reach > maxY) return null;

    const pieces = [];
    let run = [];
    let touched = false;

    densify(line.points, ERASE_STEP).forEach((p) => {
        if (distanceToSegment(p.x, p.y, x0, y0, x1, y1) <= reach) {
            touched = true;
            // A run of one point is not a line; it goes with the rubbing.
            if (run.length > 1) pieces.push(run);
            run = [];
        } else {
            run.push(p);
        }
    });
    if (run.length > 1) pieces.push(run);

    return touched ? pieces : null;
}

// Rub from where the rubber was to where it is now. Says whether anything went.
function eraseAlong(x0, y0, x1, y1) {
    const radius = eraserRadius();
    const kept = [];
    let changed = false;

    lines.forEach((line) => {
        const pieces = cutStroke(line, x0, y0, x1, y1, radius);
        if (pieces === null) {
            kept.push(line);
            return;
        }
        changed = true;
        pieces.forEach((points) => {
            kept.push({ points: simplify(points), color: line.color, width: line.width });
        });
    });

    if (changed) {
        lines.length = 0;
        kept.forEach((line) => lines.push(line));
    }
    return changed;
}

// One trip of the rubber is one undo, however many strokes it cut.
function finishErase() {
    if (!isErasing) return;
    isErasing = false;
    eraserFrom = null;
    if (erasedSomething && window.PlotHistory) window.PlotHistory.record();
    erasedSomething = false;
}

// The rubber's own outline, so its size is something you can see before you
// press. Drawn dark over light so it reads on the plan and on a black line.
function drawEraserRing() {
    if (!window.eraserEnabled || !eraserAt) return;
    context.save();
    context.beginPath();
    context.arc(eraserAt.x, eraserAt.y, eraserRadius(), 0, Math.PI * 2);
    context.lineWidth = 3;
    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.stroke();
    context.lineWidth = 1;
    context.setLineDash([4, 3]);
    context.strokeStyle = 'rgba(29, 35, 41, 0.8)';
    context.stroke();
    context.restore();
}

function deleteLastLine() {
    if (lines.length > 0) {
        lines.pop(); // Remove the last line from the lines array
        redrawCanvas(); // Redraw the canvas without the last line
    }
}

/* Paint the drawn lines into any context, at any size. The screen calls this
   with the canvas as it is; the PDF export calls it with a bigger canvas and a
   scale to match, because a stroke is the one thing on the plot that cannot be
   drawn again sharper from the DOM. One painter, so the smoothing cannot drift
   between what you see and what you print. */
function paintLines(ctx, scale) {
    const k = scale || 1;
    ctx.lineCap = 'round';

    lines.forEach(line => {
        if (!line.points || line.points.length < 2) return;
        const p = line.points;
        ctx.lineWidth = line.width * k;
        ctx.strokeStyle = line.color;
        ctx.beginPath();
        ctx.moveTo(p[0].x * k, p[0].y * k);
        for (let i = 1; i < p.length - smoothness; i++) {
            const xc = ((p[i].x + p[i + 1].x) / 2) * k;
            const yc = ((p[i].y + p[i + 1].y) / 2) * k;
            ctx.quadraticCurveTo(p[i].x * k, p[i].y * k, xc, yc);
        }
        ctx.quadraticCurveTo(
            p[p.length - 2].x * k,
            p[p.length - 2].y * k,
            p[p.length - 1].x * k,
            p[p.length - 1].y * k
        );
        ctx.stroke();
    });
}

window.PenStrokes = { paint: paintLines };

// Function to redraw the canvas
function redrawCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    paintLines(context, 1);

    // Redraw the current line if it exists
    if (currentLine.length > 1) {
        context.lineWidth = lineWidth;
        context.strokeStyle = penColor;
        context.beginPath();
        context.moveTo(currentLine[0].x, currentLine[0].y);
        if (isStraightLine) {
            context.lineTo(currentLine[currentLine.length - 1].x, currentLine[currentLine.length - 1].y);
        } else {
            for (let i = 1; i < currentLine.length - smoothness; i++) {
                const xc = (currentLine[i].x + currentLine[i + 1].x) / 2;
                const yc = (currentLine[i].y + currentLine[i + 1].y) / 2;
                context.quadraticCurveTo(currentLine[i].x, currentLine[i].y, xc, yc);
            }
            context.quadraticCurveTo(
                currentLine[currentLine.length - 2].x,
                currentLine[currentLine.length - 2].y,
                currentLine[currentLine.length - 1].x,
                currentLine[currentLine.length - 1].y
            );
        }
        context.stroke();
    }

    drawEraserRing();
}

// Function to undo the last drawn line
function undoLastLine() {
    if (lines.length > 0) {
        lines.pop(); // Remove the last line from the lines array
        redrawCanvas(); // Redraw the canvas without the last line
    }
}

// Ctrl+Z and Ctrl+Y are handled by history.js, which undoes lines, equipment
// and text together. undoLastLine and deleteLastLine are kept for callers.
