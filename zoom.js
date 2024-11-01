let zoomLevel = 1;

document.addEventListener('keydown', (e) => {
    if (e.key === '+') {
        zoomLevel += 0.1;
        document.body.style.transform = `scale(${zoomLevel})`;
        document.body.style.transformOrigin = '0 0';
    } else if (e.key === '-') {
        if (zoomLevel > 0.1) {
            zoomLevel -= 0.1;
            document.body.style.transform = `scale(${zoomLevel})`;
            document.body.style.transformOrigin = '0 0';
        }
    }
});