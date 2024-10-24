document.getElementById("export").addEventListener("click", () => {
  // Get the play name from the input field
  const headerTitle = document.getElementById("playNameInput").value || "Untitled Play"; // Default to "Untitled Play" if empty

  // Create a container to hold all elements to be captured
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.width = '100%';
  container.style.height = '100%';

  // Clone the stage, drawingLayer, and dropZone elements
  const stageClone = document.getElementById('stage').cloneNode(true);
  const drawingLayerClone = document.getElementById('drawingLayer').cloneNode(true);
  const dropZoneClone = document.getElementById('dropZone').cloneNode(true);

  // Append the cloned elements to the container
  container.appendChild(stageClone);
  container.appendChild(drawingLayerClone);
  container.appendChild(dropZoneClone);

  // Append the container to the body temporarily
  document.body.appendChild(container);

  // Capture the container as a canvas
  html2canvas(container, {
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      allowTaint: true, // Allow cross-origin images
      logging: true, // Enable logging for debugging
      backgroundColor: 'white' // Ensure the background is transparent
  }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          putOnlyUsedFonts: true,
          floatPrecision: 16
      });

      const imgWidth = 190; // A4 width in mm minus margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const margin = 10;
      const headerHeight = 50;

      // Create a new Image object for the logo
      const logoUrl = "DNTlogo.png"; // Replace with your actual logo URL
      const logoImage = new Image();
      logoImage.src = logoUrl;

      logoImage.onload = () => {
          const logoWidth = 40;
          const logoHeight = 20;

          // Add the logo to the PDF
          pdf.addImage(logoImage, 'PNG', margin, margin, logoWidth, logoHeight);

          // Add the header title to the PDF
          pdf.setFontSize(24);
          pdf.text(headerTitle, margin + logoWidth + 10, margin + logoHeight / 2);

          // Add the captured image to the PDF
          pdf.addImage(imgData, 'PNG', margin, margin + headerHeight, imgWidth, imgHeight);

          // Save the PDF
          pdf.save('scene.pdf');

          // Remove the container from the body
          document.body.removeChild(container);
      };
  });
});
