let trackGPS;
const ui = {
    mapId: "map",
    map:null,
    polylines:[],
    setup: function() {
        let outputHeader = "DateTime|Lat|Long|Accuracy|Distance|KMLat|KMLong|Sum|KMSum|<br/>\n";
        ui.content = document.getElementById("clipboardContent");
        ui.content.innerHTML += outputHeader;
        trackGPS = new TrackGPS();
        
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
        this.accuracy.value = trackGPS.config.maxAllowAccuracy;
        this.accuracy.addEventListener("change", ui.changeAccuracy);

        this.interval = document.getElementById("interval");
        this.interval.value = trackGPS.config.timePeriod;
        this.interval.addEventListener("change", ui.changeInterval);

        const head = document.getElementsByTagName('head')[0];
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = "https://maps.googleapis.com/maps/api/js?callback=initMap&key=" + trackGPS.config.apiKey;
        head.appendChild(script);
    },
    reCenter: true,
    pressStop: function() {
        trackGPS.runtime.continueCollect = !trackGPS.runtime.continueCollect;
        ui.controlButton.innerText = trackGPS.runtime.continueCollect ? "Stop" : "Resume";
    },
    toggleKalman: function() {
        trackGPS.config.showKalman = ui.kalmanCheckbox.checked;
    },
    copyText: function(){
        navigator.clipboard.writeText(ui.content.textContent);

    },
    changeAccuracy: function(){
        trackGPS.config.maxAllowAccuracy = ui.accuracy.value;
    },
    changeInterval: function(){
        trackGPS.config.timePeriod = ui.interval.value;
    },
    toggleSnappedToRoad: function(){
        trackGPS.config.snappedToRoad = ui.snappedToRoad.checked;
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

function drawPolyLines(){
    let points = trackGPS.config.showKalman ? trackGPS.runtime.workoutKalManCoordinates: trackGPS.runtime.workoutCoordinates;
    if(trackGPS.config.snappedToRoad) {
        runSnapToRoad(points);
    }
    else drawPolyline(points);
}

// Snap a user-created polyline to roads and draw the snapped path
function runSnapToRoad(points) {
    ui.polylines.setPath(points);

    let path = ui.polylines.getPath();
    let pathValues = [];
    for (let i = 0; i < path.getLength(); i++) {
        pathValues.push(path.getAt(i).toUrlValue());
    }

    $.get('https://roads.googleapis.com/v1/snapToRoads', {
        interpolate: false,
        key: trackGPS.config.apiKey,
        path: pathValues.join('|')
    }, function(data) {
        processSnapToRoadResponse(data);
        drawPolyline(trackGPS.runtime.snappedCoordinates);
    });
}
function getLocation() {
    const options = {
        enableHighAccuracy: true,
        timeout: trackGPS.config.timeOutGPS,
        maximumAge: 0
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geoSuccess, geoError, options);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function geoSuccess(position) {
    
    setTimeout(getLocation, trackGPS.config.timePeriod);
    if (ui.reCenter) {
        ui.reCenter = false;
        console.log('re-centered');
        ui.map.setCenter(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
    }

    if (!trackGPS.runtime.continueCollect)
        return;
    trackGPS.processPosition(position);
    drawPolyLines();
}

function processSnapToRoadResponse(data) {
    trackGPS.snappedCoordinates = [];
    trackGPS.snappedPlaceIdArray = [];
    for (let i = 0; i < data.snappedPoints.length; i++) {
        const latlng = new google.maps.LatLng(
            data.snappedPoints[i].location.latitude,
            data.snappedPoints[i].location.longitude);
        trackGPS.runtime.snappedCoordinates.push(latlng);
        trackGPS.runtime.snappedPlaceIdArray.push(data.snappedPoints[i].placeId);
    }
}

function drawPolyline(coordinates) {
    ui.polylines.setPath(coordinates);
    ui.polylines.setMap(ui.map);
}

function geoError(e) {
    console.log(e.code + " " + e.message);
}

function initMap() {
    ui.map = new google.maps.Map(document.getElementById(ui.mapId), {
        zoom: 17,
        center: {
            lat: 10,
            lng: 10
        },
        mapTypeId: "terrain",
    });

    ui.polylines = new google.maps.Polyline({
        path: trackGPS.runtime.workoutCoordinates,
        geodesic: true,
        strokeColor: "#40ee6f",
        strokeOpacity: 0.9,
        strokeWeight: 4,
    });
    ui.polylines.setMap(ui.map);
    getLocation();
}

window.addEventListener('load', function() {
    ui.setup();
});