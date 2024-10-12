stage.addEventListener("contextmenu", (e) => {
    e.preventDefault(); // Prevent the default right-click menu
  
    if (e.target.classList.contains("draggable")) {
      rotateElement(e.target);
    }
  });
  
  // Rotate the element by 15 degrees each time it's right-clicked
  function rotateElement(element) {
    const currentRotation = getRotationDegrees(element);
    const newRotation = currentRotation + 15;
    element.style.transform = `rotate(${newRotation}deg)`;
  }
  
  // Helper function to get the current rotation in degrees
  function getRotationDegrees(element) {
    const style = window.getComputedStyle(element);
    const transform = style.getPropertyValue('transform');
    
    if (transform === 'none') return 0;
  
    const matrix = transform.match(/^matrix\((.+)\)$/);
    if (matrix) {
      const values = matrix[1].split(', ');
      const a = values[0];
      const b = values[1];
      const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
      return angle < 0 ? angle + 360 : angle;
    }
  
    return 0;
  }
  