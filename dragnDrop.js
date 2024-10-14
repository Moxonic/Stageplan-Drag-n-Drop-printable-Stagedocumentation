let currentRotation = 0;

document.addEventListener('DOMContentLoaded', () => {
    const stage = document.getElementById('stage');
    const equipments = document.querySelectorAll('.equipment');

    equipments.forEach(equipment => {
        equipment.addEventListener('dragstart', dragStart);
    });

    stage.addEventListener('dragover', dragOver);
    stage.addEventListener('drop', dropElement);
});

function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.type);
}

function dragOver(e) {
    e.preventDefault(); // Allow dropping
}

function dropElement(e) {
  e.preventDefault();
  
  const type = e.dataTransfer.getData('text/plain'); // Get the type of element being dragged
  const element = createDroppedElement(type); // Create a new element based on the type

  // Position the dropped element
  const offsetX = e.offsetX;
  const offsetY = e.offsetY;
  element.style.left = `${offsetX}px`;
  element.style.top = `${offsetY}px`;

  // Append to stage
  const stage = document.getElementById('stage');
  stage.appendChild(element);
}

function createDroppedElement(type) {
  const container = document.createElement('div');
  container.classList.add('dropped');
  container.style.position = 'absolute';
  container.style.width = 'fit-content';
  container.style.height = 'auto';

  const element = document.createElement('div');

  // Adjusted to differentiate between CQ and Vue based on the data-type
  if (type === 'custom-speaker-cq') {
      element.classList.add('cq'); // Assign CQ class
  } else if (type === 'custom-speaker-vue') {
      element.classList.add('vue'); // Assign Vue class
  } else if (type === 'custom-speaker-vueXL') {
    element.classList.add('vueXL'); // Assign Vue class
  } else {
      element.classList.add('element');
      element.textContent = getIcon(type);
  }

  // Right-click rotation
  element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      currentRotation += 45;
      element.style.transform = `rotate(${currentRotation}deg)`;
  });

  // Drag and drop functionality
  element.setAttribute('draggable', 'true');
  element.addEventListener('dragstart', dragStart);
  element.addEventListener('dragend', dragEnd);

  // Double-click to add editable text
  element.addEventListener('dblclick', () => {
      if (!container.querySelector('.editable-text')) {
          const text = document.createElement('div');
          text.classList.add('editable-text');
          text.contentEditable = 'true';
          text.textContent = 'Type here';
          container.appendChild(text);
      }
  });

  container.appendChild(element); // Append the new element to the container
  return container;
}


function dragEnd(e) {
    const stage = document.getElementById('stage');
    const offsetX = e.clientX - stage.getBoundingClientRect().left;
    const offsetY = e.clientY - stage.getBoundingClientRect().top;

    e.target.parentElement.style.left = `${offsetX}px`;
    e.target.parentElement.style.top = `${offsetY}px`;
}

// Utility function to return icon based on type
function getIcon(type) {
    switch (type) {
        case 'speaker': return '🔊';
        case 'microphone': return '🎤';
        case 'tv': return '📺';
        default: return '';
    }
}
