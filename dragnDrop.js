let currentRotation = 0;

document.addEventListener('DOMContentLoaded', (event) => {
    let draggedElement = null;
    let offsetX = 0;
    let offsetY = 0;

    document.addEventListener('dragstart', (e) => {
        draggedElement = e.target;
        offsetX = e.clientX - draggedElement.getBoundingClientRect().left;
        offsetY = e.clientY - draggedElement.getBoundingClientRect().top;
    });

    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedElement) {
            draggedElement.style.position = 'absolute';
            draggedElement.style.left = `${e.clientX - offsetX}px`;
            draggedElement.style.top = `${e.clientY - offsetY}px`;
            draggedElement = null;
        }
    });

    const dropZone = document.getElementById('dropZone');
    if (!dropZone) {
        console.error('Drop zone element not found');
        return;
    }

    const draggableItems = document.querySelectorAll('.equipment[draggable="true"]');

    draggableItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedElement = e.target;
            offsetX = e.clientX - draggedElement.getBoundingClientRect().left;
            offsetY = e.clientY - draggedElement.getBoundingClientRect().top;
        });
    });
});