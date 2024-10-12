// Elements for canvas and color picker
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');

// Variables to manage the drawing
let lines = [];
let isDrawing = false;
let currentLine = null;
let selectedColor = "#000000";  // Default color

// Update the selected color when user picks a new color
colorPicker.addEventListener("input", (event) => {
  selectedColor = event.target.value;
});

// Start drawing a line
canvas.addEventListener('mousedown', (event) => {
  const { offsetX, offsetY } = event;

  // Start a new line
  isDrawing = true;
  currentLine = {
    x1: offsetX,
    y1: offsetY,
    x2: offsetX,
    y2: offsetY,
    color: selectedColor
  };
  lines.push(currentLine);
});

// Update the line as the mouse moves
canvas.addEventListener('mousemove', (event) => {
  if (!isDrawing) return;

  const { offsetX, offsetY } = event;

  // Update the end of the current line
  currentLine.x2 = offsetX;
  currentLine.y2 = offsetY;

  // Redraw all lines to show updates
  drawAllLines();
});

// Finish drawing the line
canvas.addEventListener('mouseup', () => {
  isDrawing = false;
});

// Function to draw all lines
function drawAllLines() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

  lines.forEach(line => {
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.strokeStyle = line.color; // Use the color of each line
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

// Deleting lines when clicking near them
canvas.addEventListener('click', (event) => {
  const { offsetX, offsetY } = event;

  // Check if a line is clicked
  const lineIndex = lines.findIndex(line => isNearLine(line, offsetX, offsetY));

  // If clicked near a line, remove it
  if (lineIndex !== -1) {
    lines.splice(lineIndex, 1); // Remove the line
    drawAllLines(); // Redraw remaining lines
  }
});

// Helper function to determine if a click is near a line
function isNearLine(line, x, y) {
  const buffer = 5;  // Allowable click distance from line
  const distance = distanceFromLine(line, x, y);
  return distance <= buffer;
}

// Helper function to calculate distance between a point and a line
function distanceFromLine(line, x, y) {
  const A = x - line.x1;
  const B = y - line.y1;
  const C = line.x2 - line.x1;
  const D = line.y2 - line.y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  const param = lenSq !== 0 ? dot / lenSq : -1;

  let xx, yy;

  if (param < 0) {
    xx = line.x1;
    yy = line.y1;
  } else if (param > 1) {
    xx = line.x2;
    yy = line.y2;
  } else {
    xx = line.x1 + param * C;
    yy = line.y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Reset all lines and clear the canvas
document.getElementById("resetButton").addEventListener("click", () => {
  lines = [];  // Clear all lines
  drawAllLines();  // Redraw (empty canvas)
});
