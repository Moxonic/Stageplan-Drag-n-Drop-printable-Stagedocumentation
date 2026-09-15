let draggedElement = null;
let dragKind = null;        // 'new' from the sidebar, 'legacy' for a plain tile
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
        // While storage is in edit mode a drag means "reorder", not "place".
        if (window.EquipmentPanel && window.EquipmentPanel.isEditing()) {
            draggedElement = null;
            dragKind = null;
            return;
        }
        const item = window.EquipmentCatalog.get(source.dataset.eid);
        if (!item) return;
        // Firefox drops a drag that carries nothing at all.
        try { e.dataTransfer.setData('text/plain', item.id); } catch (err) { /* older browsers */ }

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

/* Moving something already on the stage is done with plain mouse events, not
   with HTML5 drag and drop. Drag and drop never moves the element, only a ghost
   of it, and it only delivers the new position through a drop event, which the
   browser withholds unless the release lands on something the page marked as a
   drop target. Release anywhere else and the item stays where it was while the
   cursor is left in drag mode. Following the pointer ourselves always ends, and
   shows the item where it will land instead of a ghost.

   Coming in by finger goes through touch.js, which does the same thing from
   touch events. */

const MOVE_SLOP = 3;      // px of travel before a press counts as a move
let move = null;

function startMove(element, e) {
    move = {
        node: element,
        fromX: e.clientX,
        fromY: e.clientY,
        left: parseFloat(element.style.left) || 0,
        top: parseFloat(element.style.top) || 0,
        moved: false
    };
    document.addEventListener('mousemove', onMoveMouse);
    document.addEventListener('mouseup', endMove);
}

function onMoveMouse(e) {
    if (!move) return;
    // an undo, or a new stage, can take the item out from under the pointer
    if (!move.node.isConnected) { endMove(); return; }

    const dx = e.clientX - move.fromX;
    const dy = e.clientY - move.fromY;
    if (!move.moved && Math.hypot(dx, dy) < MOVE_SLOP) return;

    move.moved = true;
    move.node.style.left = Math.round(move.left + dx) + 'px';
    move.node.style.top = Math.round(move.top + dy) + 'px';
    if (window.Selection) window.Selection.sync();
}

function endMove() {
    document.removeEventListener('mousemove', onMoveMouse);
    document.removeEventListener('mouseup', endMove);
    if (!move) return;

    const done = move;
    move = null;
    if (!done.moved) return;          // a click, and selecting it was the job
    if (window.StageScale) window.StageScale.rememberPosition(done.node);
    if (window.Selection) window.Selection.sync();
    if (window.PlotHistory) window.PlotHistory.record();
}

// Make something on the stage movable. Named for its callers, which have been
// asking for this since the drag-and-drop days.
function addDragListeners(element) {
    // The browser's own drag would start on top of the move below and leave
    // the cursor stuck in drag mode when it ended nowhere.
    element.setAttribute('draggable', 'false');

    element.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;                         // the right button rotates
        if (window.penEnabled || window.eraserEnabled) return;
        if (e.target.closest('.selLayer')) return;          // the handles run themselves
        if (element.isContentEditable) return;              // a label being typed into

        // A label left in edit mode has to be let go of here: preventDefault
        // below keeps the caret where it is, and its blur would never fire.
        const typing = document.activeElement;
        if (typing && typing.isContentEditable && typing !== element) typing.blur();

        e.preventDefault();        // no text selection dragged along with it
        startMove(element, e);
    });
}

window.StageMove = { makeMovable: addDragListeners };

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
