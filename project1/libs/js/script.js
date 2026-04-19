// FIX MARKER ICON
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'libs/images/marker-icon-2x.png',
    iconUrl: 'libs/images/marker-icon.png',
    shadowUrl: 'libs/images/marker-shadow.png'
});

// MAP
var map = L.map('map', { zoomControl: true }).setView([51.505, -0.09], 5);
map.zoomControl.setPosition('bottomright');

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & Carto'
}).addTo(map);

var currentLayer = null;
var currentMarker = null;

// MARKER
function setMarker(lat, lng, text) {
    if (currentMarker) map.removeLayer(currentMarker);

    currentMarker = L.marker([lat, lng]).addTo(map);

    setTimeout(() => {
        currentMarker.bindPopup(text).openPopup();
    }, 100);
}

// LOCATION BUTTON
var locateBtn = L.control({ position: 'bottomright' });

locateBtn.onAdd = function () {
    var btn = L.DomUtil.create('button', 'locate-btn');
    btn.innerHTML = "📍";

    L.DomEvent.disableClickPropagation(btn);

    btn.onclick = function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (pos) {

                var lat = pos.coords.latitude;
                var lng = pos.coords.longitude;

                map.flyTo([lat, lng], 7);
                setMarker(lat, lng, "You are here");
                updateData(lat, lng);
            });
        }
    };

    return btn;
};

locateBtn.addTo(map);

// CACHE
let countryCache = {};

// LOAD COUNTRIES 
document.addEventListener("DOMContentLoaded", function () {

    let select = document.getElementById("countrySelect");
    if (!select) return;

    fetch('https://restcountries.com/v3.1/all?fields=name,cca2,latlng,currencies,capital,population')
        .then(res => {
            if (!res.ok) throw new Error("API failed");
            return res.json();
        })
        .then(data => {

            if (!Array.isArray(data)) throw new Error("Invalid data");

            data.sort((a, b) => a.name.common.localeCompare(b.name.common));

            data.forEach(country => {

                if (!country.cca2 || !country.latlng) return;

                countryCache[country.cca2] = country;

                let option = document.createElement("option");
                option.value = country.cca2;
                option.textContent = country.name.common;

                select.appendChild(option);
            });
        })
        .catch(err => {

            console.error("Country load failed:", err);

            // 🔥 FALLBACK (never empty again)
            select.innerHTML += `
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
                <option value="FR">France</option>
                <option value="DE">Germany</option>
            `;
        });

});

// DROPDOWN
document.getElementById("countrySelect")?.addEventListener("change", function () {

    let code = this.value;
    let country = countryCache[code];

    if (!country) return;

    let lat = country.latlng[0];
    let lng = country.latlng[1];

    map.flyTo([lat, lng], 6);
    setMarker(lat, lng, country.name.common);
    updateData(lat, lng);
});

// RENDER DETAILS
function renderDetails(c, cleanName) {

    let capital = c.capital ? c.capital[0] : "N/A";
    let population = c.population ? c.population.toLocaleString() : "N/A";

    let currency = "N/A";
    if (c.currencies) {
        currency = Object.keys(c.currencies)[0];
    }

    let wikiName = cleanName.replace(/ /g, "_");

    document.getElementById("details").innerHTML =
        "<strong>Capital:</strong> " + capital + "<br>" +
        "<strong>Population:</strong> " + population + "<br>" +
        "<strong>Currency:</strong> " + currency + "<br><br>" +
        "<a href='https://en.wikipedia.org/wiki/" + wikiName + "' target='_blank'>Wikipedia</a>";
}

// MAIN DATA
function updateData(lat, lng) {

    let infoBox = document.getElementById("infoBox");

    infoBox.classList.remove("show");
    infoBox.classList.add("loading");

    document.getElementById("country").innerHTML = "Loading...";
    document.getElementById("details").innerHTML =
        "<div class='skeleton'></div><div class='skeleton'></div><div class='skeleton'></div>";
    document.getElementById("weather").innerHTML =
        "<div class='skeleton'></div>";

    fetch('php/getCountryCode.php?lat=' + lat + '&lng=' + lng)
        .then(res => res.json())
        .then(data => {

            if (!data || !data.countryName || !data.countryCode) {
                document.getElementById("country").innerHTML = "Unknown location";
                return;
            }

            let cleanName = data.countryName
                .replace(/\(.*?\)/g, "")
                .replace(/Republic of/gi, "")
                .replace(/Islamic/gi, "")
                .replace(/State of/gi, "")
                .replace(/Kingdom of/gi, "")
                .replace("United Great Britain and Northern Ireland", "United Kingdom")
                .trim();

            let flag = "https://flagcdn.com/w40/" + data.countryCode.toLowerCase() + ".png";

            document.getElementById("country").innerHTML =
                "<img src='" + flag + "'> " +
                cleanName + " (" + data.countryCode + ")";

            let c = countryCache[data.countryCode];

            if (c) {
                renderDetails(c, cleanName);
            } else {
                fetch('https://restcountries.com/v3.1/alpha/' + data.countryCode)
                    .then(res => res.json())
                    .then(country => {
                        if (country && country[0]) {
                            renderDetails(country[0], cleanName);
                        }
                    });
            }

            // BORDER
            fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
                .then(res => res.json())
                .then(geoData => {

                    if (currentLayer) map.removeLayer(currentLayer);

                    geoData.features.forEach(function (feature) {
                        if (feature.properties.iso_a2 === data.countryCode) {

                            currentLayer = L.geoJSON(feature, {
                                style: {
                                    color: "#007bff",
                                    weight: 2,
                                    fillOpacity: 0.15
                                }
                            }).addTo(map);

                            map.fitBounds(currentLayer.getBounds());
                        }
                    });
                });

        });

    // WEATHER
    fetch('php/getWeather.php?lat=' + lat + '&lng=' + lng)
        .then(res => res.json())
        .then(weather => {

            if (!weather || !weather.weatherObservation) {
                document.getElementById("weather").innerHTML = "Weather unavailable";
                return;
            }

            var w = weather.weatherObservation;

            document.getElementById("weather").innerHTML =
                "<strong>Temperature:</strong> " + (w.temperature || "N/A") + "°C<br>" +
                "<strong>Humidity:</strong> " + (w.humidity || "N/A") + "%";
        });

    setTimeout(() => {
        infoBox.classList.remove("loading");
        infoBox.classList.add("show");
    }, 200);
}

// INIT LOCATION
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (pos) {

        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;

        map.flyTo([lat, lng], 7);
        setMarker(lat, lng, "You are here");
        updateData(lat, lng);
    });
}

// CLICK
map.on('click', function (e) {

    var lat = e.latlng.lat;
    var lng = e.latlng.lng;

    map.flyTo([lat, lng], 7);
    setMarker(lat, lng, "Selected location");
    updateData(lat, lng);
});

// SEARCH
function searchLocation() {

    var place = document.getElementById("search").value;
    if (!place) return;

    document.getElementById("search").blur();

    fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + place)
        .then(res => res.json())
        .then(data => {

            if (data.length === 0) {
                document.getElementById("country").innerHTML = "Location not found";
                return;
            }

            var lat = data[0].lat;
            var lng = data[0].lon;

            map.flyTo([lat, lng], 7);
            setMarker(lat, lng, place);
            updateData(lat, lng);
        });
}

// ENTER KEY
document.getElementById("search").addEventListener("keypress", function (e) {
    if (e.key === "Enter") searchLocation();
});

setTimeout(() => {
    map.invalidateSize();
}, 300);
