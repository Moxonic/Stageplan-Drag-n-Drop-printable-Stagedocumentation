    let currentAngle = 0;
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');

    if (!dropZone) {
        console.error('Dropzone element not found');
        return;
    }

    dropZone.addEventListener('dblclick', (event) => {
        // Don't create text if double-clicked on equipment
        const clickedElement = event.target;
        if (clickedElement.classList.contains('gear')) {
            return;
        }

        const textDiv = document.createElement('div');
        textDiv.contentEditable = true;
        textDiv.style.position = 'absolute';
        textDiv.style.border = '2px solid black';
        textDiv.style.whiteSpace = 'pre-wrap'; // Ensure text wraps to the next line
        textDiv.style.padding = '4px'; // Add some padding for better text visibility
        textDiv.classList.add('textAdded');

        // Delete text on double-click
        const existingTextDiv = document.elementFromPoint(event.clientX, event.clientY);
        if (existingTextDiv && existingTextDiv.classList.contains('textAdded')) {
            dropZone.removeChild(existingTextDiv);
            return;
        }

        // Calculate position relative to dropZone
        const dropZoneRect = dropZone.getBoundingClientRect();
        textDiv.style.left = `${event.clientX - dropZoneRect.left}px`;
        textDiv.style.top = `${event.clientY - dropZoneRect.top}px`;

        dropZone.appendChild(textDiv);
        textDiv.focus(); // Focus on the new text div for immediate editing

        // Add event listener to handle blur event
        textDiv.addEventListener('blur', () => {
            textDiv.contentEditable = false;
            textDiv.style.border = '2px solid black'; // Change border to indicate non-editable state

            // Make the div draggable
            textDiv.draggable = true;

            // Add event listeners for drag and drop functionality
            textDiv.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', null); // Required for Firefox
                const rect = textDiv.getBoundingClientRect();
                e.dataTransfer.setDragImage(textDiv, rect.width / 2, rect.height / 2);
                textDiv.style.opacity = '0.5'; // Make the div semi-transparent while dragging
            });

            textDiv.addEventListener('dragend', (e) => {
                const dropZoneRect = dropZone.getBoundingClientRect();
                const rect = textDiv.getBoundingClientRect();
                textDiv.style.left = `${e.clientX - dropZoneRect.left - rect.width / 2}px`;
                textDiv.style.top = `${e.clientY - dropZoneRect.top - rect.height / 2}px`;
                textDiv.style.opacity = '1'; // Reset the opacity after dragging
                textDiv.style.backgroundColor = 'white'; // Reset the background color after dragging
                textDiv.style.zIndex = '10'; // Reset the z-index after dragging
            });

            // Add event listener for rotation on right-click
            textDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent the default context menu from appearing
                currentAngle = (currentAngle + 22.5) % 360;
                textDiv.style.transform = `rotate(${currentAngle}deg)`;
            });    });
    });
});