document.addEventListener('DOMContentLoaded', () => {
    console.log('HERE loaded');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
            isDrawing = true;
            startX = e.offsetX;
            startY = e.offsetY;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            const currentX = e.offsetX;
            const currentY = e.offsetY;
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
            drawRectangle(startX, startY, currentX - startX, currentY - startY);
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) { // Left mouse button
            isDrawing = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
    });

    function drawRectangle(x, y, width, height) {
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // Prevent context menu from appearing
    });
});