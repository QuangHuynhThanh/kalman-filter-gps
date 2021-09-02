const config = {
    activityType: 0, //0 - walking, 1-hiking, 2-running, 3- biking, 4-sitting
    timePeriod: 5000,
    timeOutGPS: 8000,
    maxAllowAccuracy: 20, //depends on device & GPS signal strength. High-end phone has low Accuracy value.
    apiKey: "API-KEY"
}
const runtime = {
    continueCollect: true,
    reCenter: true,
    flightPlanCoordinates: [],
    flightPlanKalManCoordinates: [],
    timeSeries: [],
    map: null,
    flightPath: null,
    KalMan: null,
    showKalman: false,
    skipPeriod: 0,
    pointDistances: [],
    pointKalManDistances: [],
    sumDistance: 0,
    sumKMDistance: 0,
    contentL: null,
    apiKey: "AIzaSyB1PrX0QkgnIbudVmZXSSIC-nqsNGjpf0M",
    run: function run() {
        const head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = "https://maps.googleapis.com/maps/api/js?callback=initMap&key=" + config.apiKey;
        head.appendChild(script);
    }()
}
const ui = {
    setup: function setupUI() {
        this.controlButton = document.getElementById("control");
        this.controlButton.addEventListener("click", ui.pressStop);
        
        this.content = document.getElementById("clipboardContent");
        this.table = document.getElementById("resultTable");
        
        this.kalmanCheckbox = document.getElementById("displayKalman");
        this.kalmanCheckbox.addEventListener("click", ui.toggleKalman);

        this.copyButton = document.getElementById("copy");
        this.copyButton.addEventListener("click", ui.copyText);

        this.accuracy = document.getElementById("accuracy");
        this.accuracy.value = config.maxAllowAccuracy;
        this.accuracy.addEventListener("change", ui.changeAccuracy);

        this.interval = document.getElementById("interval");
        this.interval.value = config.timePeriod;
        this.interval.addEventListener("change", ui.changeInterval);
        
    },
    pressStop: function pressStop() {
        runtime.continueCollect = !runtime.continueCollect;
        ui.controlButton.innerText = runtime.continueCollect ? "Stop" : "Resume";
    },
    toggleKalman: function toggleKalman() {
        runtime.showKalman = this.kalmanCheckbox.checked;
    },
    copyText: function copyText(){
        navigator.clipboard.writeText(ui.content.textContent);
    },
    changeAccuracy: function changeAccuracy(){
        config.maxAllowAccuracy = ui.accuracy.value;
    },
    changeInterval: function changeInterval(){
        config.timePeriod = ui.interval.value;
    }
};

function writeResult(strs) {
    let html = "";
    let clipboardString = "";
    strs.forEach(e => {
        html += "<td>" + e + "</td>";
        clipboardString += e + "|";
    });
    ui.table.insertRow(1).innerHTML = html;
    ui.content.innerHTML += clipboardString + "\n";
}

function getLocation() {
    const options = {
        enableHighAccuracy: true,
        timeout: config.timeOutGPS,
        maximumAge: 0
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geoSuccess, geoError, options);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function geoSuccess(position) {
    setTimeout(getLocation, config.timePeriod);
    
    if (!runtime.continueCollect)
        return;

    let m = new Date();
    const dateString = m.getUTCFullYear() + "/" + (m.getUTCMonth() + 1) + "/" + m.getUTCDate() + " " + m.getUTCHours() + ":" + m.getUTCMinutes() + ":" + m.getUTCSeconds();

    let newTime = m.getTime();

    let newGmapPoint = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    const previousPoint = runtime.flightPlanCoordinates.length === 0 ? null : runtime.flightPlanCoordinates[runtime.flightPlanCoordinates.length - 1];
    let distance = previousPoint === null ? 0 : getDistance(previousPoint, newGmapPoint);

    let output = [dateString, position.coords.latitude, position.coords.longitude, position.coords.accuracy, distance];

    if (runtime.reCenter) {
        runtime.reCenter = false;
        console.log('re-centered');
        runtime.map.setCenter(newGmapPoint);
    }

    if (position.coords.accuracy >= config.maxAllowAccuracy) {
        runtime.skipPeriod++;
        console.log('skipped');
    } else {
        if (makeDecisionAddPoint(config.activityType, distance, position.coords.accuracy, newTime, runtime.skipPeriod)) {
            runtime.skipPeriod = 0;
            let kalManPoint = runtime.KalMan.filter(position.coords.latitude, position.coords.longitude, position.coords.accuracy, newTime);
            let newGmapKalManPoint = new google.maps.LatLng(kalManPoint[1], kalManPoint[0]);

            runtime.flightPlanCoordinates.push(newGmapPoint);
            runtime.flightPlanKalManCoordinates.push(newGmapKalManPoint);
            runtime.timeSeries.push(newTime);

            //Distances
            let pointArrayLen = runtime.flightPlanCoordinates.length;
            if (pointArrayLen > 1) {
                let rawDistance = getDistance(runtime.flightPlanCoordinates[pointArrayLen - 1], runtime.flightPlanCoordinates[pointArrayLen - 2]);
                let kmDistance = getDistance(runtime.flightPlanKalManCoordinates[pointArrayLen - 1], runtime.flightPlanKalManCoordinates[pointArrayLen - 2])
                runtime.pointDistances.push(rawDistance);
                runtime.pointKalManDistances.push(kmDistance);
                runtime.sumDistance += rawDistance;
                runtime.sumKMDistance += kmDistance;
            }

            output.push(kalManPoint, kalManPoint[0], runtime.sumDistance, runtime.sumKMDistance);

            if (runtime.showKalman) runtime.flightPath.setPath(runtime.flightPlanKalManCoordinates)
            else runtime.flightPath.setPath(runtime.flightPlanCoordinates);
        }
    }
    writeResult(output);
}

function geoError(e) {
    console.log(e.code + " " + e.message);
}

function initMap() {
    runtime.map = new google.maps.Map(document.getElementById("map"), {
        zoom: 17,
        center: {
            lat: 10,
            lng: 109
        },
        mapTypeId: "terrain",
    });

    runtime.flightPath = new google.maps.Polyline({
        path: runtime.flightPlanCoordinates,
        geodesic: true,
        strokeColor: "#d70707",
        strokeOpacity: 0.9,
        strokeWeight: 8,
    });
    runtime.flightPath.setMap(runtime.map);
}

const rad = function(x) {
    return x * Math.PI / 180;
};

const getDistance = function(p1, p2) {
    const R = 6378137; // Earth’s mean radius in meter
    const dLat = rad(p2.lat() - p1.lat());
    const dLong = rad(p2.lng() - p1.lng());
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
        Math.sin(dLong / 2) * Math.sin(dLong / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // returns the distance in meter
};

function toggleKalman() {
    runtime.showKalman = !runtime.showKalman;
}

function decideKalmanDecay(activity) {
    switch (activity) {
        case 0:
            return 3;
        case 1:
            return 2;
        case 2:
            return 6;
        case 3:
            return 11;
        case 4:
            return 0.1;
        default:
            return 2;
    }
}

function makeDecisionAddPoint(activityType, distance, accuracy, newTime, skipPeriod) {
    if (runtime.flightPlanCoordinates.length < 2) //init first 2 points
        return true;

    if (accuracy < config.maxAllowAccuracy * 0.5) // high accuracy, should get no matter what.
        return true;

    let timeDiff = newTime - runtime.timeSeries[runtime.timeSeries.length - 1];
    let mOversDistance = decideKalmanDecay(config.activityType);
    let maxAllowDistance = mOversDistance / 2 * timeDiff / 1000;
    let minAllowDistance = mOversDistance / 2 * config.timePeriod / 1000;
    console.log('Distance: ', distance, 'Time s: ', timeDiff / 1000, 'Allow Range: ', minAllowDistance, maxAllowDistance);
    return distance < maxAllowDistance && distance > minAllowDistance;
}

window.addEventListener('load', function() {
    let outputHeader = "DateTime|Lat|Long|Accuracy|Distance|KMLat|KMLong|Sum|KMSum|<br/>\n";
    runtime.content = document.getElementById("clipboardContent");
    runtime.content.innerHTML += outputHeader;

    runtime.KalMan = new GPSKalmanFilter(decideKalmanDecay(config.activityType));
    ui.setup();
    initMap();
    getLocation();
});