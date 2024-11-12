document.getElementById("export").addEventListener("click", () => {
    // Get the play name from the input field
    const headerTitle = document.getElementById("playNameInput").value || "Untitled Play"; // Default to "Untitled Play" if empty
  
    // Create a container to hold all elements to be captured
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
  
    // Clone the stage, and dropZone elements
    const stageClone = document.getElementById('stage').cloneNode(true);
    const dropZoneClone = document.getElementById('dropZone').cloneNode(true);
  
    // Append the cloned elements to the container
    container.appendChild(stageClone);
   /*  container.appendChild(dropZoneClone); *///NOT NECESSARY!?
  
    // Append the container to the body temporarily
    document.body.appendChild(container);
  
    // Capture the container as a canvas
    html2canvas(container, {
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        allowTaint: true, // Allow cross-origin images
        logging: true, // Enable logging for debugging
        backgroundColor: 'white', // Ensure the background is transparent
        scale: 2 // Increase the scale of the captured
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png'); //set high quality
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true,
            floatPrecision: 16
        });
  
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 10;
        const headerHeight = 50;
        const imgWidth = (2.1*pageWidth - 2 * margin) * 0.9; // 90% of the page width minus margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
        // Create a new Image object for the logo
        const logoUrl = "DNTlogo.png"; // Replace with your actual logo URL
        const logoImage = new Image();
        logoImage.src = logoUrl;
        logoImage.onload = () => {
            const logoWidth = 30;
            const logoHeight = 15;
            // Add the header title to the PDF
            pdf.setFontSize(24);
            const titleWidth = pdf.getTextWidth(headerTitle);
            const titleX = (pageWidth - titleWidth) / 2;
            pdf.text(headerTitle, titleX, margin + logoHeight / 2);
            
            // Add the logo to the PDF
            /*  pdf.addImage(logoImage, 'PNG', margin, margin, logoWidth, logoHeight);
   */
            // Add the captured image to the PDF
            pdf.addImage(imgData, 'PNG', margin, margin + headerHeight, imgWidth, imgHeight);
// Save the PDF with the name of the play and the current date
const currentDate = new Date();
const formattedDate = `${String(currentDate.getDate()).padStart(2, '0')}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getFullYear()).slice(-2)}`; // Format date as DDMMYY
const fileName = `${headerTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-sceneplan${formattedDate}.pdf`;
pdf.save(fileName);
            
            // Remove the container from the body
            document.body.removeChild(container);
        };
    });
});