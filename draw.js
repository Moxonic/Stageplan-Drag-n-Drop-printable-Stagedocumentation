window.window.penEnabled = false;
let isDrawing = false;
let startX = 0;
let startY = 0;

let lineWidth = 2;
let strokeStyle = '#000000';
let holdTimer = null;
let holdDuration = 5000; // Duration in milliseconds to detect a long hold
let isStraightLine = false;
let currentLine = [];
let lines = []; // Array to store all lines
let penColor = 'black';
let smoothness = 4; // Adjust this value to control the smoothness

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const penButton = document.getElementById('penButton');
const thicknessButtons = document.querySelectorAll('.thickness');
const colorButtons = document.querySelectorAll('.color');
const penColourDot = document.getElementById('penColourDot');

// Choose marker color. The swatches sit in a dropdown hung off the pen, so a
// pick marks the swatch, repaints the dot next to the pencil and shuts the menu.
function setPenColor(button) {
    penColor = button.dataset.color || button.id;
    colorButtons.forEach(b => b.classList.toggle('is-on', b === button));
    if (penColourDot) penColourDot.style.background = penColor;
}

colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (isDrawing) return;
        setPenColor(button);
        if (window.TopBar) window.TopBar.closeMenus();
    });
});

const startingColor = document.querySelector('.color.is-on') || colorButtons[0];
if (startingColor) setPenColor(startingColor);

// Pen on or off. The colour itself is picked from the dropdown beside it.
penButton.addEventListener('click', () => {
    const droppedItems = document.querySelectorAll('.dropped-equipment');
    const textDivs = document.querySelectorAll('.textAdded'); // Select all text divs

    // console.log("click")
    window.penEnabled = !window.penEnabled;

    canvas.style.cursor = window.penEnabled ? 'crosshair' : 'default';
    const app = document.getElementById('app');
    
    droppedItems.forEach(item => {
        item.style.pointerEvents = window.penEnabled ? 'none' : 'auto';
    });
    
    textDivs.forEach(textDiv => {
        textDiv.style.pointerEvents = window.penEnabled ? 'none' : 'auto';
    });

    
    penButton.classList.toggle('is-on', window.penEnabled);
    penButton.title = window.penEnabled ? 'Pen on — click to stop drawing' : 'Pen — draw cable runs';
    if (window.penEnabled) {
        if (window.Selection) window.Selection.clear();
        app.classList.add('is-drawing');
    } else {
        app.classList.remove('is-drawing');
    }
});

// Ensure crosshair cursor when hovering over the canvas if drawing is active
canvas.addEventListener('mouseenter', () => {
    if (window.penEnabled) {
        canvas.style.cursor = 'crosshair';
    }
});

canvas.addEventListener('mouseleave', () => {
    if (window.penEnabled) {
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

canvas.addEventListener('mousedown', (e) => {
    if (window.penEnabled) {
        isDrawing = true;
        isStraightLine = false;
        const rect = canvas.getBoundingClientRect();
        startX = (e.clientX - rect.left) * (canvas.width / rect.width);
        startY = (e.clientY - rect.top) * (canvas.height / rect.height);
        currentLine = [{ x: startX, y: startY }]; // Start a new line

        // Start the hold timer
        holdTimer = setTimeout(() => {
            isStraightLine = true;
            redrawCanvas();
        }, holdDuration);
    }
});

// Function to finish the current line
function finishCurrentLine(e) {
    if (isDrawing) {
        isDrawing = false;
        clearTimeout(holdTimer);
        if (isStraightLine && e) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            currentLine = [{ x: currentLine[0].x, y: currentLine[0].y }, { x, y }];
            isStraightLine = false;
        }
        // A click without movement leaves a single point, and the tail curve
        // in redrawCanvas would then read points[-1]. Not a line; drop it.
        if (currentLine.length > 1) {
            lines.push({ points: currentLine, color: penColor, width: lineWidth });
        }
        currentLine = [];
        redrawCanvas();
        if (window.PlotHistory) window.PlotHistory.record();
    }
}

// Add event listener for mousemove to finish the line if hovering over dropped equipment
canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
        if (elementUnderCursor && (elementUnderCursor.classList.contains('dropped-equipment') || elementUnderCursor.classList.contains('gear'))) {
            finishCurrentLine(e);
        } else {
            if (!isStraightLine) {
                currentLine.push({ x, y });
                redrawCanvas();
            } else {
                context.clearRect(0, 0, canvas.width, canvas.height);
                redrawCanvas();
                context.beginPath();
                context.moveTo(currentLine[0].x, currentLine[0].y);
                context.lineTo(x, y);
                context.stroke();
            }
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    finishCurrentLine(e);
});

// Leaving the canvas mid-stroke keeps what was drawn rather than losing it.
canvas.addEventListener('mouseleave', (e) => {
    finishCurrentLine(e);
    canvas.style.cursor = 'default';
});

function deleteLastLine() {
    if (lines.length > 0) {
        lines.pop(); // Remove the last line from the lines array
        redrawCanvas(); // Redraw the canvas without the last line
    }
}

// Function to redraw the canvas
function redrawCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    context.lineCap = 'round';

    // Redraw all lines
    lines.forEach(line => {
        if (!line.points || line.points.length < 2) return;
        context.lineWidth = line.width;
        context.strokeStyle = line.color;
        context.beginPath();
        context.moveTo(line.points[0].x, line.points[0].y);
        for (let i = 1; i < line.points.length - smoothness; i++) {
            const xc = (line.points[i].x + line.points[i + 1].x) / 2;
            const yc = (line.points[i].y + line.points[i + 1].y) / 2;
            context.quadraticCurveTo(line.points[i].x, line.points[i].y, xc, yc);
        }
        context.quadraticCurveTo(
            line.points[line.points.length - 2].x,
            line.points[line.points.length - 2].y,
            line.points[line.points.length - 1].x,
            line.points[line.points.length - 1].y
        );
        context.stroke();
    });

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
