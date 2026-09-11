let draggedElement = null;
let dragKind = null;        // 'new' from the sidebar, 'move' for something already placed
let offsetX = 0;
let offsetY = 0;

const sidebar = document.querySelector('#sidebar');
const dropZone = document.querySelector('#dropZone');

/* Anything in the sidebar carrying data-eid is a catalogue item. The element
   that lands on the stage is built fresh from the catalogue rather than cloned,
   so it arrives at its real size instead of the tile's size. */
sidebar.addEventListener('dragstart', (e) => {
    const source = e.target.closest ? e.target.closest('[data-eid]') : null;

    if (source && window.StageScale && window.EquipmentCatalog) {
        // While the palette is in edit mode a drag means "reorder", not "place".
        if (window.EquipmentPanel && window.EquipmentPanel.isEditing()) {
            draggedElement = null;
            dragKind = null;
            return;
        }
        const item = window.EquipmentCatalog.get(source.dataset.eid);
        if (!item) return;

        draggedElement = window.StageScale.createStageElement(item);
        dragKind = 'new';
        const size = window.StageScale.sizeFor(item, 1);
        offsetX = size.w / 2;          // drop centred under the cursor
        offsetY = size.h / 2;
        return;
    }

    // Fallback for any plain hand-built .equipment tile.
    if (e.target.classList && e.target.classList.contains('equipment')) {
        draggedElement = e.target.cloneNode(true);
        draggedElement.classList.remove('equipment');
        draggedElement.classList.add('dropped-equipment');
        draggedElement.style.position = 'absolute';
        dragKind = 'legacy';
        offsetX = e.clientX - e.target.getBoundingClientRect().left;
        offsetY = e.clientY - e.target.getBoundingClientRect().top;
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedElement) return;

    const dropZoneRect = dropZone.getBoundingClientRect();
    draggedElement.style.left = `${e.clientX - dropZoneRect.left - offsetX}px`;
    draggedElement.style.top = `${e.clientY - dropZoneRect.top - offsetY}px`;

    if (dragKind === 'legacy') {
        // The old tiles carry no measurements, so keep the original badge look.
        draggedElement.style.display = 'flex';
        draggedElement.style.alignItems = 'center';
        draggedElement.style.justifyContent = 'center';
        draggedElement.style.width = '30px';
        draggedElement.style.height = '30px';
        draggedElement.style.textAlign = 'center';
        draggedElement.style.borderRadius = '50%';
    }

    if (dragKind === 'new' || dragKind === 'legacy') {
        draggedElement.style.zIndex = '20';
        dropZone.appendChild(draggedElement);
        addDragListeners(draggedElement);
    }

    if (window.StageScale) window.StageScale.rememberPosition(draggedElement);
    if (window.Selection && draggedElement.classList.contains('eqOnStage')) {
        window.Selection.select(draggedElement);
    }

    draggedElement = null;
    dragKind = null;
    if (window.PlotHistory) window.PlotHistory.record();
});

// Function to add drag listeners to elements on the dropzone
function addDragListeners(element) {
    element.setAttribute('draggable', true);

    element.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedElement = element;
        dragKind = 'move';
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
    });

    element.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    element.addEventListener('dragend', () => {
        if (window.StageScale) window.StageScale.rememberPosition(element);
        if (window.Selection) window.Selection.sync();
        draggedElement = null;
        dragKind = null;
        if (window.PlotHistory) window.PlotHistory.record();
    });
}

// RIGHTCLICK ROTATION
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const parentElement = e.target.closest('.dropped-equipment');
    if (parentElement) {
        let currentRotation = parseFloat(parentElement.getAttribute('data-rotation') || '0');
        currentRotation = (currentRotation + 22.5) % 360;
        parentElement.style.transform = `rotate(${currentRotation}deg)`;
        parentElement.setAttribute('data-rotation', currentRotation);
        if (window.StageScale) window.StageScale.syncLabel(parentElement);
        if (window.Selection) window.Selection.sync();
        if (window.PlotHistory) window.PlotHistory.record();
    }
});

// DELETE ITEM ON DOUBLE CLICK
dropZone.addEventListener('dblclick', (e) => {
    if (e.target.closest('.selLayer')) return;
    const element = e.target.closest('.dropped-equipment');
    if (element) {
        if (window.Selection) window.Selection.clear();
        element.remove();
        if (window.PlotHistory) window.PlotHistory.record();
    }
});
