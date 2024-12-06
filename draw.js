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
let history = []; // Array to store the history of canvas states
let penColor = 'black';
let smoothness = 4; // Adjust this value to control the smoothness

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const penButton = document.getElementById('penButton');
const thicknessButtons = document.querySelectorAll('.thickness');
const colorButtons = document.querySelectorAll('.color');

// Choose marker color
colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (!isDrawing) {
            penColor = button.id;
            penButton.style.outline = window.penEnabled ? `2px solid ${penColor}` : 'none';
            penButton.style.backgroundColor = penColor;
        }
    });
});

// Visual active pen color
penButton.addEventListener('click', () => {
    const droppedItems = document.querySelectorAll('.dropped-equipment');

    // console.log("click")
    window.penEnabled = !window.penEnabled;
    penButton.style.outline = window.penEnabled ? `2px solid ${penColor}` : 'none';
    penButton.style.backgroundColor = window.penEnabled ? penColor : 'transparent';

    canvas.style.cursor = window.penEnabled ? 'crosshair' : 'default';
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementsByClassName('overlay')[0];
    
    droppedItems.forEach(item => {
        item.style.pointerEvents = window.penEnabled ? 'none' : 'auto';
    });

    if (window.penEnabled === true) {
        console.log('penEnabled');
    }else{
        console.log('penDisabled');
    };
    const textDiv = document.getElementById('textAdded');
    textDiv.style.pointerEvents = window.penEnabled ? 'none' : 'auto'; 
    

    if (window.penEnabled) {
        overlay.style.display = 'block'; // Show the overlay
    } else {
        overlay.style.display = 'none'; // Hide the overlay 
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

        // Save the current state to history
        saveState();

        // Start the hold timer
        holdTimer = setTimeout(() => {
            isStraightLine = true;
            redrawCanvas();
        }, holdDuration);
    }
});

// Function to finish the current line
function finishCurrentLine() {
    if (isDrawing) {
        isDrawing = false;
        clearTimeout(holdTimer);
        if (isStraightLine) {
            const rect = canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left) * (canvas.width / rect.width);
            const y = (event.clientY - rect.top) * (canvas.height / rect.height);
            currentLine = [{ x: currentLine[0].x, y: currentLine[0].y }, { x, y }];
            isStraightLine = false;
        }
        lines.push({ points: currentLine, color: penColor, width: lineWidth });
        currentLine = [];
        redrawCanvas();
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
            finishCurrentLine();
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
    if (isDrawing) {
        isDrawing = false;
        clearTimeout(holdTimer); // Clear the hold timer
        if (isStraightLine) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            currentLine = [{ x: currentLine[0].x, y: currentLine[0].y }, { x, y }];
            isStraightLine = false;
        }
        lines.push({ points: currentLine, color: penColor, width: lineWidth });
        currentLine = [];
        redrawCanvas();
    }
});

canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
    clearTimeout(holdTimer); // Clear the hold timer
    canvas.style.cursor = 'default';
});

function saveState() {
    history.push(canvas.toDataURL());
}

function undo() {
    if (history.length > 0) {
        const previousState = history.pop();
        const img = new Image();
        img.src = previousState;
        img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0);
        };
    }
}

// Function to undo the last drawn line
function undoLastLine() {
    if (lines.length > 0) {
        lines.pop(); // Remove the last line from the lines array
        redrawCanvas(); // Redraw the canvas without the last line
    }
}

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
    if (currentLine.length > 0) {
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

// Add event listener for undo (Ctrl + Z)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        undoLastLine();
    }
});

// Add event listener for delete last line (Ctrl + Y)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'y') {
        deleteLastLine();
    }
});
