## kalman-filter-gps

Real-time GPS route display with Kalman filter and Google Snap To Road service.

Support workout activity with various modes:
- Standing
- Walking
- Trekking
- Running
- Biking

Filter out duplicated values.

Filter out low accuracy data. 

Draw poly line with Google Map. All in js

## Release
### v.0.2.1 [4 Sep 21]
- Add Google Snap To Road Service.

### Demo
#### Raw Data
<img src="./images/RawData.jpg" alt="Raw Data" class="inline"/>

#### Kalman Filter - Walking mode
<img src="./images/KalmanFilter.jpg" alt="Kalman Filter" class="inline"/>

#### Google Road API: Snap To Road - Interpolation = True
<img src="./images/GoogleSnapToRoad.jpg" alt="Kalman Filter" class="inline"/>

#### Live Sample
<https://qrco.de/gps-loc>

<img src="./images/gps-km-qr.png" style="width:20%" alt="QR code" class="inline"/>


## Usage
1. Create your Google API key with
2. If you want to use Snap To Road, configure your key to work with Google Road Service. 
3. Add and config kalMan.js, and trackGPS.js to your page. Configure it
```
activityType: 1, //0-sitting,1 - walking, 2-hiking, 3-running, 4- biking, 
timePeriod: 5000, //ms
timeOutGPS: 8000, //ms
maxAllowAccuracy: 20, //depends on device & GPS signal strength.
apiKey: ggKey, //replace ggKey with "YOUR-API" string.  USe SnapToRoad feature? enable it in GG Console
mapId: "map", //HTML mapId
showKalman: false,
snappedToRoad:false,
outputLog: function(outputs){ui.writeResult(outputs)},//You can change to your preferred function like console.log(outputs.toString())
KalmanActivity: [0.1, 3, 2, 6, 11] // Kalman decay for each activity type. Change if you know what you're doing.
```
4. DONE!

*Notes: Console has useful logs, too.
<div>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-WKJ3KCZFJV"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-WKJ3KCZFJV');
</script>
</div>