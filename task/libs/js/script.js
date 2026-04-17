function getWeather() {
    var lat = document.getElementById("lat").value;
    var lng = document.getElementById("lng").value;

    fetch("php/getWeather.php?lat=" + lat + "&lng=" + lng)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.data) {
                document.getElementById("weatherResult").innerHTML =
                    "Temp: " + data.data.temperature + "\u00B0C<br>" +
                    "Location: " + data.data.stationName;
            } else {
                document.getElementById("weatherResult").innerHTML = "No data found";
            }
        })
        .catch(function() {
            document.getElementById("weatherResult").innerHTML = "Error";
        });
}

function getEarthquakes() {
    var north = document.getElementById("north").value;
    var south = document.getElementById("south").value;
    var east  = document.getElementById("east").value;
    var west  = document.getElementById("west").value;

    fetch("php/getEarthquakes.php?north=" + north + "&south=" + south + "&east=" + east + "&west=" + west)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            var earthquakes = data.data || [];
            document.getElementById("earthquakeResult").innerHTML =
                earthquakes.length + " earthquakes found";
        })
        .catch(function() {
            document.getElementById("earthquakeResult").innerHTML = "Error";
        });
}

function getCountry() {
    var lat = document.getElementById("clat").value;
    var lng = document.getElementById("clng").value;

    fetch("php/getCountryCode.php?lat=" + lat + "&lng=" + lng)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.data && data.data.countryName) {
                document.getElementById("countryResult").innerHTML =
                    "Country: " + data.data.countryName + " (" + data.data.countryCode + ")";
            } else {
                document.getElementById("countryResult").innerHTML = "No data found";
            }
        })
        .catch(function() {
            document.getElementById("countryResult").innerHTML = "Error";
        });
}
document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("btnWeather").addEventListener("click", getWeather);
    document.getElementById("btnEarthquakes").addEventListener("click", getEarthquakes);
    document.getElementById("btnCountry").addEventListener("click", getCountry);

});