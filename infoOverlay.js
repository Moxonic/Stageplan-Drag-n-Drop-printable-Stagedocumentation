 document.addEventListener('DOMContentLoaded', () => {
    const infoButton = document.getElementById('infoButton');
    const infoOverlay = document.getElementById('infoOverlay');
    const closeButton = document.querySelector('.close-button');

    infoButton.addEventListener('click', () => {
        infoOverlay.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
        infoOverlay.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === infoOverlay) {
            infoOverlay.style.display = 'none';
        }
    });
});