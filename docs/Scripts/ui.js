const ui = {
    setup: function() {
        this.controlButton = document.getElementById("control");
        this.controlButton.addEventListener("click", ui.pressStop);

        this.content = document.getElementById("clipboardContent");
        this.table = document.getElementById("resultTable");

        this.kalmanCheckbox = document.getElementById("displayKalman");
        this.kalmanCheckbox.addEventListener("click", ui.toggleKalman);

        this.snappedToRoad = document.getElementById("snappedToRoad");
        this.snappedToRoad.addEventListener("click", ui.toggleSnappedToRoad);

        this.copyButton = document.getElementById("copy");
        this.copyButton.addEventListener("click", ui.copyText);

        this.accuracy = document.getElementById("accuracy");
        this.accuracy.value = config.maxAllowAccuracy;
        this.accuracy.addEventListener("change", ui.changeAccuracy);

        this.interval = document.getElementById("interval");
        this.interval.value = config.timePeriod;
        this.interval.addEventListener("change", ui.changeInterval);

    },
    pressStop: function() {
        runtime.continueCollect = !runtime.continueCollect;
        ui.controlButton.innerText = runtime.continueCollect ? "Stop" : "Resume";
    },
    toggleKalman: function() {
        config.showKalman = ui.kalmanCheckbox.checked;
    },
    copyText: function(){
        navigator.clipboard.writeText(ui.content.textContent);

    },
    changeAccuracy: function(){
        config.maxAllowAccuracy = ui.accuracy.value;
    },
    changeInterval: function(){
        config.timePeriod = ui.interval.value;
    },
    toggleSnappedToRoad: function(){
        config.snappedToRoad = ui.snappedToRoad.checked;
    },
    writeResult: function(strs) {
        let html = "";
        let clipboardString = "";
        strs.forEach((e,i) => {
            let text = i === 0 ?
                //e.getUTCFullYear() + "/" + (e.getUTCMonth() + 1) + "/" + e.getUTCDate() + " " +
                e.getUTCHours() + ":" + e.getUTCMinutes() + ":" + e.getUTCSeconds()
                : e;

            html += "<td>" + text + "</td>";
            clipboardString += text + "|";
        });
        ui.table.insertRow(1).innerHTML = html;
        ui.content.innerHTML += clipboardString + "\n";
    }
};
window.addEventListener('load', function() {
    let outputHeader = "DateTime|Lat|Long|Accuracy|Distance|KMLat|KMLong|Sum|KMSum|<br/>\n";
    ui.content = document.getElementById("clipboardContent");
    ui.content.innerHTML += outputHeader;

    runtime.KalManFilter = new GPSKalmanFilter( config.KalmanActivity[config.activityType]);
    ui.setup();
});