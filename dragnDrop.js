let currentRotation = 0;

document.addEventListener('DOMContentLoaded', (event) => {
    const dropZone = document.getElementById('dropZone');
    const draggableItems = document.querySelectorAll('.equipment[draggable="true"]');

    draggableItems.forEach(item => {
        item.addEventListener('dragstart', dragStart);
    });

    dropZone.addEventListener('dragover', dragOver);
    dropZone.addEventListener('drop', drop);

    function dragStart(e) {
        if (e.target.classList.contains('existing')) {
            e.dataTransfer.setData('text/plain', e.target.id);
        } else {
            const clone = e.target.cloneNode(true);
            clone.classList.add('draggable', 'rotatable', 'existing');
            clone.id = `draggable-${Date.now()}`;
            document.body.appendChild(clone);
            e.dataTransfer.setData('text/plain', clone.id);
        }
    }

    function dragOver(e) {
        e.preventDefault();
    }

    function drop(e) {
        e.preventDefault();
        const data = e.dataTransfer.getData('text/plain');
        let draggableElement;

        if (document.getElementById(data)) {
            draggableElement = document.getElementById(data);
            draggableElement.style.display = 'block';
        } else {
            const newElement = document.createElement('div');
            newElement.innerHTML = data;
            draggableElement = newElement.firstChild;

            // Ensure the container and its contents are correctly referenced
            if (draggableElement.classList.contains('vuePicContainer')) {
                const imgElement = draggableElement.querySelector('img');
                imgElement.src = imgElement.src; // Ensure the src is correctly set
            }

            draggableElement.classList.add('draggable', 'rotatable', 'existing');
            draggableElement.id = `draggable-${Date.now()}`; // Assign a unique ID
            dropZone.appendChild(draggableElement);

            makeElementDraggable(draggableElement);
            makeElementRotatable(draggableElement);
        }

        draggableElement.style.position = 'absolute';
        const offsetX = e.clientX - dropZone.getBoundingClientRect().left;
        const offsetY = e.clientY - dropZone.getBoundingClientRect().top;
        draggableElement.style.left = `${offsetX}px`;
        draggableElement.style.top = `${offsetY}px`;
        draggableElement.classList.remove('dragging');
    }

    function makeElementDraggable(element) {
        element.addEventListener('dragstart', (e) => {
            e.target.classList.add('dragging');
            dragStart(e);
        });
        element.addEventListener('dragend', dragEnd);
    }

    function dragEnd(e) {
        e.preventDefault();
        e.target.style.display = 'block';
        e.target.classList.remove('dragging');
    }

    function makeElementRotatable(element) {
        let rotation = 0;
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent the context menu from appearing
            rotation = (rotation + 45) % 360;
            element.style.transform = `rotate(${rotation}deg)`;
        });
    }
});