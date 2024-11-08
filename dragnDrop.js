let draggedElement = null;
let offsetX = 0;
let offsetY = 0;
let currentRotation = 0;

const sidebar = document.querySelector('#sidebar');
const dropZone = document.querySelector('#dropZone');

sidebar.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('equipment')) {
        draggedElement = e.target.cloneNode(true);
        draggedElement.classList.remove('equipment');
        draggedElement.classList.add('dropped-equipment');
        draggedElement.style.position = 'absolute';
        offsetX = e.clientX - e.target.getBoundingClientRect().left;
        offsetY = e.clientY - e.target.getBoundingClientRect().top;
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (draggedElement) {
        const dropZoneRect = dropZone.getBoundingClientRect();
        draggedElement.style.left = `${e.clientX - dropZoneRect.left - offsetX}px`;
        draggedElement.style.top = `${e.clientY - dropZoneRect.top - offsetY}px`;
        draggedElement.style.display = 'block'; // Ensure the element is visible
        dropZone.appendChild(draggedElement); // Append the clone to the drop zone
        addDragListeners(draggedElement); // Add drag listeners to the new element
        draggedElement = null;
    }
});

// Function to add drag listeners to elements on the dropzone
function addDragListeners(element) {
    element.setAttribute('draggable', true);

    element.addEventListener('dragstart', (e) => {
        draggedElement = e.target;
        const rect = draggedElement.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
    });

    element.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    element.addEventListener('drop', (e) => {
        e.preventDefault();
        /* draggedElement.style.border = '5px solid red';
        draggedElement.style.borderRadius = '50%'; */
        const dropZoneRect = dropZone.getBoundingClientRect();
        draggedElement.style.left = `${e.clientX - dropZoneRect.left - offsetX}px`;
        draggedElement.style.top = `${e.clientY - dropZoneRect.top - offsetY}px`;
        draggedElement = null;
    });
}

// RIGHTCLICK ROTATION
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const parentElement = e.target.closest('.dropped-equipment');
    if (parentElement) {
        let currentRotation = parseInt(parentElement.getAttribute('data-rotation') || '0', 10);
        currentRotation = (currentRotation + 45) % 360;
        parentElement.style.transform = `rotate(${currentRotation}deg)`;
        parentElement.setAttribute('data-rotation', currentRotation);
    }
});

// DELETE ITEM ON DOUBLE CLICK
dropZone.addEventListener('dblclick', (e) => {
    const element = e.target.closest('.dropped-equipment');
    if (element) {
        dropZone.removeChild(element);
    }
});