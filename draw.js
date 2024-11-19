let isDrawing = false;
let startX = 0;
let startY = 0;
let penEnabled = false;
let lineWidth = 2;
let strokeStyle = '#000000';
let holdTimer = null;
let holdDuration = 3000; // Duration in milliseconds to detect a long hold
let isStraightLine = false;
let currentLine = [];
let lines = []; // Array to store all lines
let history = []; // Array to store the history of canvas states

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const penButton = document.getElementById('penButton');
const thicknessButtons = document.querySelectorAll('.thickness');
const colorButtons = document.querySelectorAll('.color');

penButton.addEventListener('click', () => {
    penEnabled = !penEnabled;
    penButton.style.borderColor = penEnabled ? 'red' : 'black';
    penButton.style.outline = penEnabled ? '2px solid red' : 'none';
    canvas.style.cursor = penEnabled ? 'crosshair' : 'default';
});

thicknessButtons.forEach(button => {
    button.addEventListener('click', () => {
        lineWidth = parseInt(button.dataset.thickness, 10);
    });
});

colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        strokeStyle = button.dataset.color;
    });
});

canvas.addEventListener('mousedown', (e) => {
    if (penEnabled) {
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

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
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
        lines.push(currentLine); // Add the current line to the lines array
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

function deleteLastLine() {
    if (lines.length > 0) {
        lines.pop(); // Remove the last line from the lines array
        redrawCanvas(); // Redraw the canvas without the last line
    }
}

function redrawCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeStyle;
    context.lineCap = 'round';

    // Redraw all lines
    lines.forEach(line => {
        context.beginPath();
        context.moveTo(line[0].x, line[0].y);
        for (let i = 1; i < line.length; i++) {
            context.lineTo(line[i].x, line[i].y);
        }
        context.stroke();
    });

    // Redraw the current line
    if (currentLine.length > 0) {
        context.beginPath();
        context.moveTo(currentLine[0].x, currentLine[0].y);
        if (isStraightLine) {
            context.lineTo(currentLine[currentLine.length - 1].x, currentLine[currentLine.length - 1].y);
        } else {
            for (let i = 1; i < currentLine.length; i++) {
                context.lineTo(currentLine[i].x, currentLine[i].y);
            }
        }
        context.stroke();
    }
}

// Add event listener for undo (Ctrl + Z)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        undo();
    }
});

// Add event listener for delete last line (Ctrl + Y)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'y') {
        deleteLastLine();
    }
});