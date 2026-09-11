/* "House plan" switches between the built-in house drawing and the stage
   defined in the "New stage" dialog. Unticking it with no stage defined yet
   opens that dialog rather than leaving an empty stage behind. */
document.getElementById('toggleHSCPlan').addEventListener('change', function () {
    if (!window.StageBuilder) return;
    if (this.checked) {
        window.StageBuilder.useHouseStage();
    } else {
        window.StageBuilder.applyFromForm();
    }
});
