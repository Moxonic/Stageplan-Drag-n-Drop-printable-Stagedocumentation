document.addEventListener('DOMContentLoaded', () => {
    const stage = document.getElementById('stage');
    const drawingLayer = document.getElementById('drawingLayer');
    let isDrawing = false;
    let startX, startY;
    let selectedColor = 'black';
    let drawingActive = false;
    let currentRect = null;
    const rectangles = [];

    // Get color selection from radio buttons
    const colorInputs = document.querySelectorAll('input[name="color"]');
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

    // Start drawing rectangles
    drawingLayer.addEventListener('mousedown', (e) => {
        if (!drawingActive || isMouseOverDiv(e)) return; // Prevent drawing if not active or over a div
        isDrawing = true;

        startX = e.offsetX;
        startY = e.offsetY;

        // Create a new rectangle div
        currentRect = document.createElement('div');
        currentRect.classList.add('rectangle');
        currentRect.style.border = `2px solid ${selectedColor}`;
        currentRect.style.position = 'absolute';
        currentRect.style.left = `${startX}px`;
        currentRect.style.top = `${startY}px`;
        drawingLayer.appendChild(currentRect);
    });

    // Update the size of the rectangle while drawing
    drawingLayer.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;

        const width = e.offsetX - startX;
        const height = e.offsetY - startY;

        currentRect.style.width = `${Math.abs(width)}px`;
        currentRect.style.height = `${Math.abs(height)}px`;

        // Adjust position if drawing to the left or upwards
        if (width < 0) {
            currentRect.style.left = `${e.offsetX}px`;
        }
        if (height < 0) {
            currentRect.style.top = `${e.offsetY}px`;
        }
    });

    // Stop drawing when mouse is released
    drawingLayer.addEventListener('mouseup', () => {
        if (isDrawing) {
            rectangles.push(currentRect); // Save the rectangle
            isDrawing = false;
            currentRect = null;
        }
    });

    // Function to check if the mouse is over a div
    function isMouseOverDiv(e) {
        const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        return elementUnderMouse && elementUnderMouse.tagName === 'DIV' && elementUnderMouse !== stage;
    }

    // Undo last rectangle with Ctrl + Z
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault(); // Prevent default action (like browser undo)
            undoLastRectangle();
        }
    });

    function undoLastRectangle() {
        if (rectangles.length > 0) {
            const lastRect = rectangles.pop(); // Remove the last rectangle from the array
            lastRect.remove(); // Remove the rectangle from the drawing layer
        }
    }
});
