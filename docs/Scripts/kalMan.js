// Basic implementation of Kalman filtering for interpolation of varying accuracy GPS points
// Info: https://www.wouterbulten.nl/blog/tech/lightweight-javascript-library-for-noise-filtering/
// Info: https://stackoverflow.com/questions/1134579/smooth-gps-data 
//
// Usage:
// Initialise as new GPSKalmanFilter();
// Then loop through your stored GPS data and apply the filter to each point
// This class stores values as it goes through the noisy XY locations
// And uses that to apply the filter.. this is some seriously cool shi-
// 
// Ported by John Stowell (nzjs)
//
class GPSKalmanFilter {
    // Decay in m/s - 3 is a good number for walking pace, 
    // ideally change decay to 11 m/s for travel at 40kmh
    // or change to 25 m/s for travel at 100kmh
    constructor (decay = 0.5) {
        this.decay = decay
        this.variance = -1
        this.minAccuracy = 5
    }

    // Kalman filter processing for latitude and longitude
    //
    // lat = new measurement of latitude
    // lon = new measurement of longitude
    // accuracy = measurement of 1 standard deviation error in metres
    // timestampInMs = time of measurement from geolocation service
    // 
    // This returns a new filtered X Y geolocation
    //
    filter(lat, lon, accuracy, timestampInMs) {
        if (accuracy < this.minAccuracy) accuracy = this.minAccuracy
        //console.log('accuracy is',accuracy)

        // if variance < 0, object is unitialised, so initialise with current values
        if (this.variance < 0) {
            //console.log('initialised values')
            this.timestampInMs = timestampInMs
            this.lat = lat
            this.lon = lon
            this.variance = accuracy * accuracy
        }

        // else apply Kalman filter methodology
        else {
            //console.log('applying kalman filtering now')
            const timeIncMs = timestampInMs - this.timestampInMs

            // time has moved on, so the uncertainty in the current position increases
            if (timeIncMs > 0) {
                this.variance += (timeIncMs * this.decay * this.decay) / 1000
                this.timestampInMs = timestampInMs
            }
            // TODO: USE VELOCITY INFORMATION HERE TO GET A BETTER ESTIMATE OF CURRENT POSITION ?


            // Kalman gain matrix K = Covarariance * Inverse(Covariance + MeasurementVariance)
            // NB: because K is dimensionless, it doesn't matter that variance has different units to lat and lon
            const _k = this.variance / (this.variance + (accuracy * accuracy))
            this.lat += _k * (lat - this.lat)
            this.lon += _k * (lon - this.lon)

            // new Covarariance  matrix is (IdentityMatrix - K) * Covarariance 
            this.variance = (1 - _k) * this.variance
        }

        return [this.lon, this.lat]
    }
}

//export default GPSKalmanFilter;