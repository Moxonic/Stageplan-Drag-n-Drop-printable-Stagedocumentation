document.getElementById("export").addEventListener("click", () => {

    // Get the play name from the input field
    const headerTitle = document.getElementById("playNameInput").value || "Untitled Play"; // Default to "Untitled Play" if empty
  
    // Capture the current stage as a canvas
    html2canvas(stage, {
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      width: stage.offsetWidth,
      height: stage.offsetHeight,
      backgroundColor: null // Ensures the background is transparent
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
    
      const { jsPDF } = window.jspdf;
    
      const pdf = new jsPDF({
        orientation: 'portrait', // Portrait for header and layout
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        floatPrecision: 16
      });
  
      const imgWidth = 190; // A4 width in mm minus margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
      // Define logo properties
      const logoUrl = "DNTlogo.png"; // Replace with your logo URL
      const logoWidth = 40;
      const logoHeight = 20;
      const margin = 10;
      const headerHeight = 50;
  
      // Add logo in the upper right corner with margin
      pdf.addImage(logoUrl, 'PNG', 210 - margin - logoWidth, margin, logoWidth, logoHeight); // Logo in the right upper corner
  
      // Add title in the left upper corner with margin
      pdf.setFontSize(18);
      pdf.text(headerTitle, margin, margin + 10); // Title positioned in the left upper corner
  
      // Add the stage layout image with margins
      pdf.addImage(imgData, 'PNG', margin, headerHeight + margin, imgWidth, imgHeight);
    
      // Save the PDF
      pdf.save("stage-layout.pdf");
    }).catch(err => {
      console.error("Error generating PDF: ", err);
    });
  });
  