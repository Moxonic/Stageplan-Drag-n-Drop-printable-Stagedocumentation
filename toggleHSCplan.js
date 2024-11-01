document.getElementById('toggleHSCPlan').addEventListener('change', function() {
    const stage = document.getElementById('stage');
    if (this.checked) {
        stage.style.backgroundImage = '';
    } else {
        stage.style.backgroundImage = 'url("path/to/your/background.jpg")';
    }
});