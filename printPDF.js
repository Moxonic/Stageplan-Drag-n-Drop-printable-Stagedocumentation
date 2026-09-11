/* printPDF.js — the "Export PDF" button.

   One page: the show title, the loads that were filled in, the plan itself and
   any comments. The plan is scaled to whatever room is left over, so a tall
   stage or a page full of loads shrinks the drawing instead of running off the
   sheet. */
(() => {
    'use strict';

    const byId = (id) => document.getElementById(id);

    const MARGIN = 10;        // mm, all four sides
    const TITLE_SIZE = 24;
    const BODY_SIZE = 14;
    const LINE = 7;           // mm between body lines

    // Printed above the plan, but only when someone filled them in. An empty
    // "Load QLab:" tells the crew nothing and costs the drawing space.
    const LOADS = [
        ['Load Mixer', 'playMixerInput'],
        ['Load QLab', 'playQLabInput'],
        ['Load PlugIns', 'playLiveprofessorInput']
    ];

    /* ---------------- the title is required ---------------- */

    // A plan that reaches the desk without a show name is not much use, so the
    // title gates the export rather than defaulting to "Untitled".
    function showTitle(event) {
        const input = byId('playNameInput');
        const error = byId('playNameError');
        const title = (input.value || '').trim();

        if (title) {
            input.classList.remove('is-invalid');
            if (error) error.hidden = true;
            return title;
        }

        // the click would otherwise reach the document handler that shuts
        // every menu, including the one being opened here
        if (event) event.stopPropagation();
        if (window.TopBar && window.TopBar.openMenu) window.TopBar.openMenu('showMenu');
        input.classList.add('is-invalid');
        if (error) error.hidden = false;
        input.focus();
        return null;
    }

    function wireTitleField() {
        const input = byId('playNameInput');
        const error = byId('playNameError');
        if (!input) return;
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            if (error) error.hidden = true;
        });
    }

    /* ---------------- capturing the stage ---------------- */

    // The stage as it stands: the plan geometry, the equipment on it and the
    // drawn lines, flattened into one image.
    async function captureStage() {
        if (window.Selection) window.Selection.clear();

        const stageEl = byId('stage');
        stageEl.classList.add('is-exporting');
        const stageClone = stageEl.cloneNode(true);
        stageEl.classList.remove('is-exporting');
        stageClone.querySelectorAll('.selLayer').forEach((n) => n.remove());

        // The canvas does not survive cloning, so its pixels go in as an image.
        const canvas = byId('canvas');
        const canvasImage = new Image();
        canvasImage.src = canvas.toDataURL('image/png');
        canvasImage.style.position = 'absolute';
        canvasImage.style.top = '0';
        canvasImage.style.left = '0';
        canvasImage.style.width = '100%';
        canvasImage.style.height = '100%';
        // html2canvas reads it straight away; an undecoded image lands blank.
        if (canvasImage.decode) await canvasImage.decode().catch(() => {});
        stageClone.appendChild(canvasImage);

        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.height = '100%';
        container.appendChild(stageClone);
        document.body.appendChild(container);

        try {
            return await html2canvas(container, {
                useCORS: true,
                scrollX: 0,
                scrollY: 0,
                allowTaint: true
            });
        } finally {
            document.body.removeChild(container);
        }
    }

    /* ---------------- the page ---------------- */

    async function exportPDF(event) {
        const headerTitle = showTitle(event);
        if (!headerTitle) return;

        const stageCanvas = await captureStage();

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const textWidth = pageWidth - 2 * MARGIN;

        // title, centred
        pdf.setFontSize(TITLE_SIZE);
        pdf.text(headerTitle, (pageWidth - pdf.getTextWidth(headerTitle)) / 2, MARGIN + 10);

        // date, upper right
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        pdf.setFontSize(12);
        const dateText = `${dd}/${mm}/${now.getFullYear()}`;
        pdf.text(dateText, pageWidth - MARGIN - pdf.getTextWidth(dateText), MARGIN + 5);

        // the loads that were filled in
        pdf.setFontSize(BODY_SIZE);
        let y = MARGIN + 20;
        LOADS.forEach(([label, inputId]) => {
            const value = (byId(inputId).value || '').trim();
            if (!value) return;
            y += LINE;
            pdf.text(`${label}: ${value}`, MARGIN, y);
        });

        // comments are measured now so the plan knows what room is left
        const comments = (byId('playComments').value || '').trim();
        const commentLines = comments ? pdf.splitTextToSize(comments, textWidth) : [];
        const commentsHeight = commentLines.length ? commentLines.length * LINE + LINE : 0;

        // the plan, scaled down to fit what is left and centred on the page
        const top = y + LINE;
        const availWidth = textWidth;
        const availHeight = pageHeight - MARGIN - commentsHeight - top;
        const ratio = stageCanvas.height / stageCanvas.width;
        let imgWidth = availWidth;
        let imgHeight = imgWidth * ratio;
        if (imgHeight > availHeight) {
            imgHeight = availHeight;
            imgWidth = imgHeight / ratio;
        }
        pdf.addImage(
            stageCanvas.toDataURL('image/png'), 'PNG',
            MARGIN + (availWidth - imgWidth) / 2, top, imgWidth, imgHeight
        );

        if (commentLines.length) pdf.text(commentLines, MARGIN, top + imgHeight + LINE);

        const stamp = `${dd}${mm}${String(now.getFullYear()).slice(-2)}`;
        const slug = headerTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        pdf.save(`${slug}-stageplan${stamp}.pdf`);
    }

    byId('export').addEventListener('click', exportPDF);
    wireTitleField();
})();
