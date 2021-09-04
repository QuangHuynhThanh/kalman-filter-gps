const config = {
    activityType: 1, //0-sitting,1 - walking, 2-hiking, 3-running, 4- biking, 
    timePeriod: 5000,
    timeOutGPS: 8000,
    maxAllowAccuracy: 20, //depends on device & GPS signal strength. High-end phone has low Accuracy value.
    apiKey: ggKey,//replace ggKey with "YOUR-API" string. If you want to use SnapToRoad feature, enable it in GG Console
    mapId: "map",
    showKalman: false,
    snappedToRoad:false,
    logOutput: function(outputs){ui.writeResult(outputs)},//you can change to your preferred function like console.log(outputs.toString())
    KalmanActivity: [0.1, 3, 2, 6, 11]
}

const runtime = {
    continueCollect: true,
    reCenter: true,
    workoutCoordinates: [],
    workoutKalManCoordinates: [],
    snappedCoordinates : [],
    snappedPlaceIdArray : [],
    snappedToRoad: false,
    timeSeries: [],
    map: null,
    polylines: null,
    KalManFilter: null,
    pointDistances: [],
    pointKalManDistances: [],
    sumDistance: 0,
    sumKMDistance: 0,
    run: function() {
        const head = document.getElementsByTagName('head')[0];
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = "https://maps.googleapis.com/maps/api/js?callback=initMap&key=" + config.apiKey;
        head.appendChild(script);
        runtime.KalManFilter = new GPSKalmanFilter( config.KalmanActivity[config.activityType]);
    }
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

    let moment = new Date();

    let newTime = moment.getTime();

    let newGmapPoint = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    const previousPoint = runtime.workoutCoordinates.length === 0 ? null : runtime.workoutCoordinates[runtime.workoutCoordinates.length - 1];
    let distance = previousPoint === null ? 0 : getDistance(previousPoint, newGmapPoint);

    let output = [moment, position.coords.latitude, position.coords.longitude, position.coords.accuracy, distance];

    if (runtime.reCenter) {
        runtime.reCenter = false;
        console.log('re-centered');
        runtime.map.setCenter(newGmapPoint);
    }

    if (position.coords.accuracy >= config.maxAllowAccuracy) {
        console.log('skipped');
    } else {
        if (makeDecisionAddPoint(config.activityType, distance, position.coords.accuracy, newTime)) {
            let kalManPoint = runtime.KalManFilter.filter(position.coords.latitude, position.coords.longitude, position.coords.accuracy, newTime);
            let newGmapKalManPoint = new google.maps.LatLng(kalManPoint[1], kalManPoint[0]);

            runtime.workoutCoordinates.push(newGmapPoint);
            runtime.workoutKalManCoordinates.push(newGmapKalManPoint);
            runtime.timeSeries.push(newTime);
            
            let pointArrayLen = runtime.workoutCoordinates.length;
            if (pointArrayLen > 1) {
                let rawDistance = getDistance(runtime.workoutCoordinates[pointArrayLen - 1], runtime.workoutCoordinates[pointArrayLen - 2]);
                let kmDistance = getDistance(runtime.workoutKalManCoordinates[pointArrayLen - 1], runtime.workoutKalManCoordinates[pointArrayLen - 2])
                runtime.pointDistances.push(rawDistance);
                runtime.pointKalManDistances.push(kmDistance);
                runtime.sumDistance += rawDistance;
                runtime.sumKMDistance += kmDistance;
            }

            output.push(kalManPoint, kalManPoint[0], runtime.sumDistance, runtime.sumKMDistance);
            drawPolyLines();
        }
    }
    config.logOutput(output);
}

function geoError(e) {
    console.log(e.code + " " + e.message);
}

function initMap() {
    runtime.map = new google.maps.Map(document.getElementById(config.mapId), {
        zoom: 17,
        center: {
            lat: 10,
            lng: 10
        },
        mapTypeId: "terrain",
    });

    runtime.polylines = new google.maps.Polyline({
        path: runtime.workoutCoordinates,
        geodesic: true,
        strokeColor: "#40ee6f",
        strokeOpacity: 0.9,
        strokeWeight: 4,
    });
    runtime.polylines.setMap(runtime.map);
    getLocation();
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

function makeDecisionAddPoint(activityType, distance, accuracy, newTime) {
    if (runtime.workoutCoordinates.length < 2) //init first 2 points
        return true;

    if (accuracy < config.maxAllowAccuracy * 0.5) // high accuracy, should take it no matter what.
        return true;

    let timeDiff = newTime - runtime.timeSeries[runtime.timeSeries.length - 1];
    let mOversDistance = config.KalmanActivity[config.activityType];
    let maxAllowDistance = mOversDistance / 2 * timeDiff / 1000;
    let minAllowDistance = mOversDistance / 2 * config.timePeriod / 1000;
    console.log('Distance: ', distance, 'Time s: ', timeDiff / 1000, 'Allow Range: ', minAllowDistance, maxAllowDistance);
    return distance < maxAllowDistance && distance > minAllowDistance;
}
function drawPolyLines(){
    let points = config.showKalman ? runtime.workoutKalManCoordinates: runtime.workoutCoordinates;
    if(config.snappedToRoad) {
        runSnapToRoad(points);
    }
    else drawPolyline(points);
}

// Snap a user-created polyline to roads and draw the snapped path
function runSnapToRoad(points) {
    runtime.polylines.setPath(points);
    
    let path = runtime.polylines.getPath();
    let pathValues = [];
    for (let i = 0; i < path.getLength(); i++) {
        pathValues.push(path.getAt(i).toUrlValue());
    }

    $.get('https://roads.googleapis.com/v1/snapToRoads', {
        interpolate: true,
        key: config.apiKey,
        path: pathValues.join('|')
    }, function(data) {
        processSnapToRoadResponse(data);
        drawPolyline(runtime.snappedCoordinates);
    });
}

function processSnapToRoadResponse(data) {
    runtime.snappedCoordinates = [];
    runtime.snappedPlaceIdArray = [];
    for (let i = 0; i < data.snappedPoints.length; i++) {
        const latlng = new google.maps.LatLng(
            data.snappedPoints[i].location.latitude,
            data.snappedPoints[i].location.longitude);
        runtime.snappedCoordinates.push(latlng);
        runtime.snappedPlaceIdArray.push(data.snappedPoints[i].placeId);
    }
}

function drawPolyline(coordinates) {
    runtime.polylines.setPath(coordinates);
    runtime.polylines.setMap(runtime.map);
}

window.addEventListener('load', function() {
    runtime.run();
});