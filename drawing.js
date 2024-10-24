document.addEventListener('DOMContentLoaded', (event) => {
    const drawingLayer = document.getElementById('drawingLayer');
    const colorInputs = document.querySelectorAll('input[name="color"]');
    let selectedColor = 'black';
    let drawingActive = false;
    let drawCurves = false; // Flag to toggle between straight lines and curves

    colorInputs.forEach(input => {
        input.addEventListener('click', (e) => {
            if (e.target.checked) {
                selectedColor = e.target.value;
            }
        });
    });

    // Toggle drawing tool activation
    document.getElementById('toggleDrawing').addEventListener('click', () => {
        drawingActive = !drawingActive; // Toggle the drawing state
        document.getElementById('toggleDrawing').textContent = drawingActive ? 'Disable Drawing' : 'Enable Drawing';
    });

    // Toggle between straight lines and curves
    document.getElementById('toggleCurves').addEventListener('click', () => {
        drawCurves = !drawCurves; // Toggle the curve drawing state
        document.getElementById('toggleCurves').textContent = drawCurves ? 'Draw Straight Lines' : 'Draw Curves';
    });

    // Function to check if the mouse is over a div
    function isMouseOverDiv(e) {
        const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        return elementUnderMouse && elementUnderMouse.tagName === 'DIV' && elementUnderMouse !== stage;
    }

    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let controlX = 0;
    let controlY = 0;

    // Start drawing lines or curves
    drawingLayer.addEventListener('mousedown', (e) => {
        if (!drawingActive || isMouseOverDiv(e)) return; // Prevent drawing if over a div or tool not active
        isDrawing = true;
        startX = e.offsetX;
        startY = e.offsetY;
        controlX = e.offsetX;
        controlY = e.offsetY;
    });

    drawingLayer.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const ctx = drawingLayer.getContext('2d');
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        if (drawCurves) {
            controlX = (startX + e.offsetX) / 2;
            controlY = (startY + e.offsetY) / 2;
            ctx.quadraticCurveTo(controlX, controlY, e.offsetX, e.offsetY);
        } else {
            ctx.lineTo(e.offsetX, e.offsetY);
        }
        ctx.stroke();
        startX = e.offsetX;
        startY = e.offsetY;
    });

    drawingLayer.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    drawingLayer.addEventListener('mouseout', () => {
        isDrawing = false;
    });
});