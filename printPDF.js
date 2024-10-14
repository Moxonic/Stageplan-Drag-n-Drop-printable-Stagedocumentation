document.getElementById("export").addEventListener("click", () => {
  // Get the play name from the input field
  const headerTitle = document.getElementById("playNameInput").value || "Untitled Play"; // Default to "Untitled Play" if empty

  // Capture the current stage as a canvas
  html2canvas(document.getElementById('stage'), {
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      allowTaint: true, // Allow cross-origin images
      logging: true, // Enable logging for debugging
      backgroundColor: null // Ensure the background is transparent
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

          // Add logo in the upper right corner with margin
          pdf.addImage(logoImage, 'PNG', 210 - margin - logoWidth, margin, logoWidth, logoHeight);

          // Add title in the left upper corner with margin
          pdf.setFontSize(18);
          pdf.text(headerTitle, margin, margin + 10);

          // Add the captured stage layout image with margins
          pdf.addImage(imgData, 'PNG', margin, headerHeight + margin, imgWidth, imgHeight);

          // Save the PDF with the play name as the filename
          pdf.save(`${headerTitle}-stageplan.pdf`);

      };

      logoImage.onerror = (err) => {
          console.error("Error loading logo: ", err);

          // Proceed without the logo if it fails to load
          pdf.setFontSize(18);
          pdf.text(headerTitle, margin, margin + 10);

          // Add the captured stage layout image with margins
          pdf.addImage(imgData, 'PNG', margin, headerHeight + margin, imgWidth, imgHeight);

          // Save the PDF
          pdf.save("stage-layout.pdf");
      };

  }).catch(err => {
      console.error("Error generating PDF: ", err);
  });
});
