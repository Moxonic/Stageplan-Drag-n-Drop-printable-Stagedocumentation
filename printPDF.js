/* printPDF.js — the show as a PDF.
 *
 * The show runs on as one document. Every scene after the first is introduced
 * by the shift that leads into it: its name, its time, and what went out, came
 * in and moved, numbered in the order the work happens. Then the plot the shift
 * ends on. A short shift and its plot sit under the scene above rather than
 * starting a sheet of their own; the page turns when the next piece of the
 * document no longer fits.
 *
 * Each scene is photographed by putting it back on the stage and capturing it,
 * so the picture in the PDF is the same drawing you were just looking at. The
 * scene you were working on is put back when the export is done.
 */
(() => {
    'use strict';

    const M = 12;                 // page margin for text, mm
    const PLOT_M = 6;             // the plot gets more of the paper than text does
    const BOX = 4;                // a square small enough to sit in a line of type

    /* How sharp the plot has to be. It is printed PLOT_W_MM across, so that
       many dots per inch decides how many pixels the photograph needs; a stage
       that is already large on screen needs less enlarging to get there. The cap
       bounds the memory, since every scene is held as one of these. */
    const PLOT_W_MM = 210 - 2 * PLOT_M;   // A4 portrait, which is what jsPDF gives us
    const PRINT_DPI = 300;
    const MAX_SCALE = 4;
    const TAGS = { out: 'OUT', in: 'IN', moved: 'MOVED' };
    const TAG_COLOUR = { out: [176, 57, 43], in: [31, 122, 69], moved: [138, 90, 0] };

    const byId = (id) => document.getElementById(id);
    /* Waiting for the stage to settle after a scene is put back on it. A frame
       is the right moment, but a browser that has stopped painting — a tab in
       the background, mostly — never gives one, and the export must not hang
       there waiting. Whichever comes first wins. */
    const settle = () => new Promise((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        requestAnimationFrame(() => requestAnimationFrame(finish));
        setTimeout(finish, 80);
    });

    /* ---------------- the show needs a name ---------------- */

    /* A plot that reaches the crew as "Untitled show" is a plot nobody can file,
       so the title gates the export instead of being filled in for them. */
    function requireTitle(event) {
        const input = byId('playNameInput');
        const error = byId('playNameError');
        const title = (input.value || '').trim();

        if (title) {
            input.classList.remove('is-invalid');
            if (error) error.hidden = true;
            return title;
        }

        // the click would otherwise reach the document handler that shuts every
        // menu, including the one being opened here
        if (event) event.stopPropagation();
        if (window.TopBar && window.TopBar.openMenu) window.TopBar.openMenu('showMenu');
        input.classList.add('is-invalid');
        if (error) error.hidden = false;
        input.focus();
        return null;
    }

    /* ---------------- photographing the stage ---------------- */

    /* The pen strokes live on a canvas that html2canvas will not read, so they
       are flattened into an image and laid over the clone at the same size. */
    /* 1 means photograph it at screen size, which is about 80 dpi once it is
       spread across the paper: enough to read, not enough to look drawn. */
    function captureScale(widthPx) {
        if (!widthPx) return 2;
        const want = (PLOT_W_MM / 25.4) * PRINT_DPI;
        return Math.max(1, Math.min(MAX_SCALE, want / widthPx));
    }

    async function captureStage() {
        const stageEl = byId('stage');
        const scale = captureScale(stageEl.offsetWidth);

        /* The photograph is of the stage and nothing else. This container is
           only here to hold the stroke image over the clone, so it is cut to
           the stage's own size. Sized to the page instead, it wrapped the stage
           in empty paper, and the plot then printed at a fraction of the width
           however much of the page the picture was given.

           offsetWidth rather than a bounding rect: it is in layout pixels, the
           same ones the clone's inline width is in, so a page the browser has
           been asked to zoom still measures true. Borders are included, which
           is what the clone carries too. */
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.style.width = stageEl.offsetWidth + 'px';
        container.style.height = stageEl.offsetHeight + 'px';

        stageEl.classList.add('is-exporting');
        const stageClone = stageEl.cloneNode(true);
        stageEl.classList.remove('is-exporting');
        stageClone.querySelectorAll('.selLayer').forEach((n) => n.remove());

        /* html2canvas only ever copies a canvas at the size it finds it, so
           the strokes would be the one soft thing on an otherwise sharp page.
           Drawn again at the capture scale, they match everything else. The
           eraser's ring is left behind here, which is where it belongs. */
        const canvas = byId('canvas');
        const sharp = document.createElement('canvas');
        sharp.width = Math.round(canvas.width * scale);
        sharp.height = Math.round(canvas.height * scale);
        if (window.PenStrokes) {
            window.PenStrokes.paint(sharp.getContext('2d'), scale);
        } else {
            sharp.getContext('2d').drawImage(canvas, 0, 0, sharp.width, sharp.height);
        }

        const strokes = new Image();
        strokes.src = sharp.toDataURL('image/png');
        strokes.style.position = 'absolute';
        strokes.style.top = '0';
        strokes.style.left = '0';
        strokes.style.width = '100%';
        strokes.style.height = '100%';
        stageClone.appendChild(strokes);

        container.appendChild(stageClone);
        document.body.appendChild(container);

        const shot = await html2canvas(container, {
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            backgroundColor: '#ffffff',
            // The text, the symbols and the plan geometry are all redrawn at
            // this size rather than blown up, so they stay sharp on paper.
            scale: scale
        });

        document.body.removeChild(container);
        return { data: shot.toDataURL('image/png'), w: shot.width, h: shot.height };
    }

    // Every scene in turn, then back to the one that was open.
    async function captureScenes() {
        if (!window.Scenes) return [await captureStage()];

        const shots = [];
        window.Scenes.beginPreview();
        try {
            for (let i = 0; i < window.Scenes.count(); i += 1) {
                window.Scenes.preview(i);
                await settle();
                shots.push(await captureStage());
            }
        } finally {
            window.Scenes.endPreview();
        }
        return shots;
    }

    /* ---------------- laying out the document ---------------- */

    function build(shots, showTitle) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const contentW = pageW - 2 * M;
        const plotW = pageW - 2 * PLOT_M;

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dateText = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

        let y = M;

        /* --- small helpers over the cursor --- */

        const baseline = (size) => size * 0.28;   // points of type, millimetres of page

        function rule() {
            pdf.setDrawColor(214, 218, 224);
            pdf.setLineWidth(0.2);
            pdf.line(M, y, pageW - M, y);
        }

        function runningHead() {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(130, 138, 148);
            pdf.text(showTitle, M, y + baseline(9));
            pdf.text(dateText, pageW - M - pdf.getTextWidth(dateText), y + baseline(9));
            y += 6;
            rule();
            y += 5;
            pdf.setTextColor(29, 35, 41);
        }

        function newPage() {
            pdf.addPage();
            y = M;
            runningHead();
        }

        // Makes room for the next h millimetres, saying whether it had to turn
        // the page to find it.
        function ensure(h) {
            if (y + h <= pageH - M) return false;
            newPage();
            return true;
        }

        function write(text, x, size, gap, style) {
            pdf.setFont('helvetica', style || 'normal');
            pdf.setFontSize(size);
            const lines = pdf.splitTextToSize(String(text), pageW - M - x);
            lines.forEach((line) => {
                ensure(gap);
                pdf.text(line, x, y + baseline(size));
                y += gap;
            });
        }

        function label(text) {
            ensure(8);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(130, 138, 148);
            pdf.text(text, M, y + baseline(9));
            y += 6;
        }

        /* A line led by an empty square at the left margin, to tick off on the
           printed sheet. The text is indented past the square, and wrapped
           lines stay on that indent so the column of boxes reads on its own.
           The row is measured before anything is drawn so it cannot be split
           from its square. */
        function checkRow(text, size, gap) {
            const textX = M + BOX + 3;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(size);
            const lines = pdf.splitTextToSize(String(text), pageW - M - textX);

            ensure(lines.length * gap);
            const top = y;
            lines.forEach((line) => {
                pdf.text(line, textX, y + baseline(size));
                y += gap;
            });

            pdf.setDrawColor(150, 158, 168);
            pdf.setLineWidth(0.35);
            pdf.rect(M, top + 1, BOX, BOX);
        }

        /* --- the cover of page one --- */

        function titleBlock() {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(130, 138, 148);
            pdf.text(dateText, pageW - M - pdf.getTextWidth(dateText), y + baseline(10));

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(22);
            pdf.setTextColor(20, 26, 32);
            pdf.text(showTitle, (pageW - pdf.getTextWidth(showTitle)) / 2, y + 9);
            y += 14;

            const scenes = window.Scenes ? window.Scenes.count() : 1;
            if (scenes > 1) {
                const sub = scenes + ' scenes · ' + (scenes - 1) + (scenes === 2 ? ' shift' : ' shifts');
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(10);
                pdf.setTextColor(130, 138, 148);
                pdf.text(sub, (pageW - pdf.getTextWidth(sub)) / 2, y);
                y += 7;
            }

            checklistBlock();
            commentsBlock();

            rule();
            y += 5;
            pdf.setTextColor(29, 35, 41);
        }

        /* Everything to do before the curtain, in one list with a square
           each: the files the show needs loaded, then whatever else was typed
           into the checklist under Show details. A load nobody filled in is not
           worth a line of its own. */
        function checklistBlock() {
            const loads = [
                ['Load Mixer', byId('playMixerInput').value],
                ['Load QLab', byId('playQLabInput').value],
                ['Load PlugIns', byId('playLiveprofessorInput').value]
            ].map((pair) => [pair[0], (pair[1] || '').trim()])
             .filter((pair) => pair[1])
             .map((pair) => pair[0] + ': ' + pair[1]);

            const own = byId('playChecklist');
            const mine = (own && own.value ? own.value : '')
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);

            const rows = loads.concat(mine);
            if (!rows.length) return;

            label('CHECKLIST');
            pdf.setTextColor(60, 70, 80);
            rows.forEach((text) => checkRow(text, 11, 6));
            y += 2;
        }

        /* Comments sit with the loads rather than at the back of the document,
           where the one person who needed them had already stopped reading. */
        function commentsBlock() {
            const comments = (byId('playComments').value || '').trim();
            if (!comments) return;

            label('COMMENTS');
            pdf.setTextColor(45, 53, 62);
            write(comments, M, 10, 5);
            y += 2;
        }

        /* --- the shift that leads into a scene --- */

        function shiftBand(index) {
            const shift = window.Scenes.shift(index);
            const rows = window.Scenes.shiftRows(index);

            ensure(30);

            pdf.setFillColor(235, 238, 242);
            pdf.rect(M, y, contentW, 9, 'F');
            pdf.setFillColor(47, 109, 189);
            pdf.rect(M, y, 1.8, 9, 'F');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(47, 109, 189);
            pdf.text('SHIFT', M + 5, y + 5.9);

            pdf.setTextColor(29, 35, 41);
            pdf.setFontSize(11);
            if (shift.name) pdf.text(shift.name, M + 22, y + 6.1);

            if (shift.time) {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(10);
                pdf.setTextColor(90, 100, 112);
                pdf.text(shift.time, pageW - M - 3 - pdf.getTextWidth(shift.time), y + 6.1);
            }
            y += 13;

            if (!rows.length) {
                pdf.setTextColor(130, 138, 148);
                write('Nothing changes on stage.', M + 5, 10, 5, 'italic');
            }

            ['out', 'in', 'moved'].forEach((action) => {
                const group = rows.filter((r) => r.action === action);
                if (!group.length) return;

                ensure(11);
                const colour = TAG_COLOUR[action];
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(9);
                pdf.setTextColor(colour[0], colour[1], colour[2]);
                pdf.text(TAGS[action], M + 5, y + baseline(9));
                y += 5;

                group.forEach((row) => {
                    const head = row.num + '.  ' + (row.count > 1 ? row.count + '× ' : '') + row.label;
                    const tail = [row.detail, row.note].filter(Boolean).join(' · ');
                    pdf.setTextColor(45, 53, 62);
                    if (ensure(5.2)) {
                        pdf.setTextColor(130, 138, 148);
                        write((shift.name || 'Shift') + ', continued', M, 8, 5, 'italic');
                        pdf.setTextColor(45, 53, 62);
                    }
                    write(tail ? head + ' — ' + tail : head, M + 14, 10, 5);
                });
                y += 1.5;
            });

            if (shift.note) {
                y += 1;
                pdf.setTextColor(90, 100, 112);
                write(shift.note, M + 5, 9.5, 4.6, 'italic');
            }

            y += 2;
            rule();
            y += 5;
            pdf.setTextColor(29, 35, 41);
        }

        /* --- a scene, and the picture of it --- */

        function sceneHeading(index) {
            ensure(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(130, 138, 148);
            pdf.text('SCENE ' + (index + 1), M, y + baseline(9));

            const name = window.Scenes ? window.Scenes.label(index) : '';
            const isDefault = name === 'Scene ' + (index + 1);
            if (name && !isDefault) {
                const at = M + pdf.getTextWidth('SCENE ' + (index + 1)) + 4;
                pdf.setFontSize(12);
                pdf.setTextColor(20, 26, 32);
                pdf.text(name, at, y + baseline(12));
            }
            y += 8;
        }

        /* The plot is what the document is for, so it takes the width of the
           paper rather than the width of the text column, and waits for the next
           page rather than being shrunk into whatever gap was left. Its heading
           is drawn through here, once there is room for the pair of them, so it
           cannot be stranded at the foot of the page before it. */
        function plot(shot, headingH, heading) {
            if (!shot) {
                if (heading) heading();
                return;
            }

            const full = (shot.h * plotW) / shot.w;
            if (y + (headingH || 0) + full > pageH - M) newPage();
            if (heading) heading();

            // A page of its own has nothing left to give, so a plot taller than
            // the paper is the one case that still has to scale down.
            let h = full;
            let w = plotW;
            const room = pageH - M - y;
            if (h > room) {
                h = room;
                w = (shot.w * h) / shot.h;
            }

            pdf.addImage(shot.data, 'PNG', PLOT_M + (plotW - w) / 2, y, w, h);
            y += h + 4;
        }

        /* --- put it together --- */

        /* Nothing here turns the page. Each shift and the plot it ends on are
           laid under the scene above with a gap to separate them, and the parts
           that measure themselves — the band, the rows, the plot — move to the
           next page only when they run out of paper. */
        const count = window.Scenes ? window.Scenes.count() : 1;
        for (let i = 0; i < count; i += 1) {
            if (i === 0) {
                titleBlock();
            } else if (window.Scenes) {
                y += 6;
                shiftBand(i);
            }
            plot(shots[i], count > 1 ? 8 : 0, count > 1 ? () => sceneHeading(i) : null);
        }

        const stamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}`;
        pdf.save(`${showTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-stageplan${stamp}.pdf`);

        if (window.Track) {
            window.Track.event('pdf_exported', {
                scenes: count,
                pages: pdf.internal.getNumberOfPages ? pdf.internal.getNumberOfPages() : null,
                items: document.querySelectorAll('#dropZone .eqOnStage').length,
                checklist: !!(((byId('playChecklist') || {}).value) || '').trim()
            });
        }
    }

    /* ---------------- the button ---------------- */

    const button = byId('export');

    // typing clears the complaint, so the field stops shouting once it is fixed
    byId('playNameInput').addEventListener('input', () => {
        byId('playNameInput').classList.remove('is-invalid');
        const error = byId('playNameError');
        if (error) error.hidden = true;
    });

    button.addEventListener('click', async (event) => {
        if (button.disabled) return;

        const showTitle = requireTitle(event);
        if (!showTitle) return;

        const label = button.textContent;
        button.disabled = true;
        button.textContent = 'Exporting…';

        // Selection handles belong to editing, not to the document.
        if (window.Selection) window.Selection.clear();

        try {
            build(await captureScenes(), showTitle);
        } catch (err) {
            console.error(err);
            alert('The PDF could not be built. ' + (err && err.message ? err.message : ''));
        } finally {
            button.disabled = false;
            button.textContent = label;
        }
    });
})();
