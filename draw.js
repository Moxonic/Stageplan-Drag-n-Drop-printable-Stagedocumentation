let isDrawing = false;
let startX = 0;
let startY = 0;
let penEnabled = false;
let lineWidth = 1;
let strokeStyle = '#000000';

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
        const rect = canvas.getBoundingClientRect();
        startX = (e.clientX - rect.left) * (canvas.width / rect.width);
        startY = (e.clientY - rect.top) * (canvas.height / rect.height);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        context.lineWidth = lineWidth;
        context.strokeStyle = strokeStyle;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(x, y);
        context.stroke();
        startX = x;
        startY = y;
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
    canvas.style.cursor = 'default';
});