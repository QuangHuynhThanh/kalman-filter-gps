class TrackGPS {
    constructor() {
        this.config = {
            activityType: 1, //0-sitting,1 - walking, 2-hiking, 3-running, 4- biking, 
            timePeriod: 3000,
            timeOutGPS: 8000,
            maxAllowAccuracy: 20, //depends on device & GPS signal strength. High-end phone has low Accuracy value.
            logOutput: function (outputs) {
                console.log(outputs.toString()) //you can hook your preferred function like ui.writeResult(outputs);
            },
            KalmanActivity: [0.1, 3, 2, 6, 11]
        };

        this.runtime = {
            continueCollect: true,
            reCenter: true,
            workoutCoordinates: [],
            workoutKalManCoordinates: [],
            snappedCoordinates: [],
            snappedPlaceIdArray: [],
            snappedToRoad: false,
            timeSeries: [],
            pointDistances: [],
            pointKalManDistances: [],
            sumDistance: 0,
            sumKMDistance: 0,
            KalManFilter: new GPSKalmanFilter(this.config.KalmanActivity[this.config.activityType])
        };
    }


    rad(x) {
        return x * Math.PI / 180;
    }

    processPosition(lat, long, accuracy) {
        let moment = new Date();

        let newTime = moment.getTime();
        
        let newGmapPoint = {lat: lat, long:long};
        const previousPoint = this.runtime.workoutCoordinates.length === 0 ? null : this.runtime.workoutCoordinates[this.runtime.workoutCoordinates.length - 1];
        let distance = previousPoint === null ? 0 : this.getDistance(previousPoint, newGmapPoint);

        let output = [moment, lat, long, accuracy, distance];

        if (accuracy >= this.config.maxAllowAccuracy) {
            console.log('skipped');
        } else {
            if (this.makeDecisionAddPoint(this.config.activityType, distance, accuracy, newTime)) {
                let kalManPoint = this.runtime.KalManFilter.filter(lat, long, accuracy, newTime);
                let newGmapKalManPoint = {lat: kalManPoint[1], long: kalManPoint[0]};

                this.runtime.workoutCoordinates.push(newGmapPoint);
                this.runtime.workoutKalManCoordinates.push(newGmapKalManPoint);
                this.runtime.timeSeries.push(newTime);

                let pointArrayLen = this.runtime.workoutCoordinates.length;
                if (pointArrayLen > 1) {
                    let rawDistance = this.getDistance(this.runtime.workoutCoordinates[pointArrayLen - 1], this.runtime.workoutCoordinates[pointArrayLen - 2]);
                    let kmDistance = this.getDistance(this.runtime.workoutKalManCoordinates[pointArrayLen - 1], this.runtime.workoutKalManCoordinates[pointArrayLen - 2])
                    this.runtime.pointDistances.push(rawDistance);
                    this.runtime.pointKalManDistances.push(kmDistance);
                    this.runtime.sumDistance += rawDistance;
                    this.runtime.sumKMDistance += kmDistance;
                }

                output.push(kalManPoint, kalManPoint[0], this.runtime.sumDistance, this.runtime.sumKMDistance);
            }
        }
        this.config.logOutput(output);
    }

    getDistance = function (p1, p2) {
        const R = 6378137; // Earth’s mean radius in meter
        const dLat = this.rad(p2.lat - p1.lat);
        const dLong = this.rad(p2.long - p1.long);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.rad(p1.lat)) * Math.cos(this.rad(p2.lat)) *
            Math.sin(dLong / 2) * Math.sin(dLong / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // returns the distance in meter
    };

    makeDecisionAddPoint(activityType, distance, accuracy, newTime) {
        if (this.runtime.workoutCoordinates.length < 2) //init first 2 points
            return true;

        if (accuracy < this.config.maxAllowAccuracy * 0.5) // high accuracy, should take it no matter what.
            return true;

        let timeDiff = newTime - this.runtime.timeSeries[this.runtime.timeSeries.length - 1];
        let mOversDistance = this.config.KalmanActivity[this.config.activityType];
        let maxAllowDistance = mOversDistance / 2 * timeDiff / 1000;
        let minAllowDistance = mOversDistance / 2 * this.config.timePeriod / 1000;
        //console.log('Distance: ', distance, 'Time s: ', timeDiff / 1000, 'Allow Range: ', minAllowDistance, maxAllowDistance);
        return distance < maxAllowDistance && distance > minAllowDistance;
    }
    
    getLastOutput(kalman = 1)
    {
        let arrLength = this.runtime.workoutCoordinates.length;
        return {
            totalDistance: kalman ? this.runtime.sumKMDistance : this.runtime.sumDistance,
            moveDistance: kalman ? this.runtime.pointKalManDistances [arrLength -1] :this.runtime.pointDistances[arrLength -1],
            lat: kalman ? this.runtime.workoutKalManCoordinates[arrLength -1].lat : this.runtime.workoutCoordinates[arrLength.length -1].lat,
            long: kalman ? this.runtime.workoutKalManCoordinates [arrLength -1].long : this.runtime.workoutCoordinates[arrLength -1].long,
            numberOfPoint: arrLength
        }
    }
    
    getfullOutput()
    {
        return this.runtime;
    }
}
//export default GPSKalmanFilter;