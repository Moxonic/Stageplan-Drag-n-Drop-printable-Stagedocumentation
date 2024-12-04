document.getElementById("export").addEventListener("click", async () => {
    // Get the play name from the input field
    const headerTitle = document.getElementById("playNameInput").value || "Untitled Play"; // Default to "Untitled Play" if empty

    // Create a container to hold all elements to be captured
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';

    // Clone the stage element
    const stageClone = document.getElementById('stage').cloneNode(true);

    // Capture the current state of the canvas as an image
    const canvas = document.getElementById('canvas');
    const canvasImage = new Image();
    canvasImage.src = canvas.toDataURL('image/png');

    // Ensure the canvas image is correctly positioned and scaled within the stage
    canvasImage.style.position = 'absolute';
    canvasImage.style.top = '0';
    canvasImage.style.left = '0';
    canvasImage.style.width = '100%';
    canvasImage.style.height = '100%';

    // Append the canvas image to the cloned stage element
    stageClone.appendChild(canvasImage);

    // Append the cloned stage element to the container
    container.appendChild(stageClone);

    // Append the container to the body temporarily
    document.body.appendChild(container);

    // Capture the container as a canvas
    const containerCanvas = await html2canvas(container, {
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        allowTaint: true, // Allow cross-origin images
    });

    // Remove the temporary container from the body
    document.body.removeChild(container);

    // Convert the container canvas to an image
    const containerImgData = containerCanvas.toDataURL('image/png');

    // Create a new PDF document
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    // Define margins and dimensions
    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const headerHeight = 20; // Reduced header height

    // Add the header title to the PDF
    pdf.setFontSize(24);
    const titleWidth = pdf.getTextWidth(headerTitle);
    const titleX = (pageWidth - titleWidth) / 2;
    pdf.text(headerTitle, titleX, margin + headerHeight / 2);

    // Add the current date to the upper right corner
    const currentDate = new Date();
    const formattedDate = `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
    pdf.setFontSize(12);
    pdf.text(formattedDate, pageWidth - margin - pdf.getTextWidth(formattedDate), margin + 5); // Position the date absolutely

    // Add the play mixer input to the PDF
    const playMixer = `Load Mixer: ${document.getElementById("playMixerInput").value || "..."}`;
    pdf.setFontSize(14);
    const mixerX = margin;
    const mixerY = margin + headerHeight + 5; // Reduced space below the header
    pdf.text(playMixer, mixerX, mixerY);

    // Add the QLab input to the PDF
    const playQLab = `Load QLab: ${document.getElementById("playQLabInput").value || "..."}`;
    pdf.setFontSize(14);
    const qLabX = margin;
    const qLabY = mixerY + 10; // Adjust position below the mixer input
    pdf.text(playQLab, qLabX, qLabY);

    // Add the Liveprofessor input to the PDF
    const playLiveprofessor = `Load PlugIns: ${document.getElementById("playLiveprofessorInput").value || "..."}`;
    const liveprofessorY = qLabY + 10; // Adjust position below the QLab input
    pdf.text(playLiveprofessor, mixerX, liveprofessorY);

    // Add the container image to the PDF
    const imgWidth = pageWidth*1.9 - 2 * margin;
    const imgHeight = (containerCanvas.height * imgWidth) / containerCanvas.width;
    pdf.addImage(containerImgData, 'PNG', margin, liveprofessorY + 10, imgWidth, imgHeight);

    // Add the play comments to the PDF
    const playComments = document.getElementById("playComments").value || "...";
    const commentsY = liveprofessorY + imgHeight + 20; // Adjust position below the image
    pdf.text(playComments, mixerX, commentsY);

    // Save the PDF with the name of the play and the current date
    const formattedFileNameDate = `${String(currentDate.getDate()).padStart(2, '0')}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getFullYear()).slice(-2)}`; // Format date as DDMMYY
    const fileName = `${headerTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-sceneplan${formattedFileNameDate}.pdf`;
    pdf.save(fileName);
});