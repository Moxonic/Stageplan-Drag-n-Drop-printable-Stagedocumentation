document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');

    if (!dropZone) {
        console.error('Dropzone element not found');
        return;
    }

    dropZone.addEventListener('dblclick', (event) => {
//dontcreate Text if double clicked on equipmwnt
        const clickedElement = event.target;
        if (clickedElement.classList.contains('gear')) {
            return;
        }
       

        const textDiv = document.createElement('div');
        textDiv.contentEditable = true;
        textDiv.style.position = 'absolute';
        textDiv.classList.add('textAdded');
        //Delete Text on double click
        const existingTextDiv = document.elementFromPoint(event.clientX, event.clientY);
        if (existingTextDiv && existingTextDiv.classList.contains('textAdded')) {
            dropZone.removeChild(existingTextDiv);
            return;
        }
        // Calculate position relative to dropZone
        const dropZoneRect = dropZone.getBoundingClientRect();
        textDiv.style.left = `${event.clientX - dropZoneRect.left}px`;
        textDiv.style.top = `${event.clientY - dropZoneRect.top}px`;

        
        textDiv.style.padding = '5px';
        textDiv.style.backgroundColor = 'transparent'; // Correct background color

        textDiv.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textDiv.contentEditable = false;
            }
        });
        // Add styles for better visibility and interaction
        textDiv.style.backgroundColor = 'white';
        textDiv.style.cursor = 'move';
        // Make the text draggable
        let isDragging = false;
        let offsetX, offsetY;
        textDiv.addEventListener('keydown', (e) => {
            if (e.key === 'Delete') {
            dropZone.removeChild(textDiv);
            }
        });
        textDiv.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - textDiv.getBoundingClientRect().left;
            offsetY = e.clientY - textDiv.getBoundingClientRect().top;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                textDiv.style.left = `${e.clientX - dropZoneRect.left - offsetX}px`;
                textDiv.style.top = `${e.clientY - dropZoneRect.top - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Rotate the text on right-click
        let currentRotation = 0;
        textDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            currentRotation = (currentRotation + 45) % 360;
            textDiv.style.transform = `rotate(${currentRotation}deg)`;
        });

        dropZone.appendChild(textDiv);
        textDiv.focus();
        
    });
});