// ================= MAP =================
var map = L.map('map', { zoomControl: true }).setView([51.505, -0.09], 5);

var street = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap & Carto' });
var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri' });

street.addTo(map);
L.control.layers({ "Street": street, " Satellite": satellite }).addTo(map);

// ================= GLOBALS =================
let currencyCache = {};
const CACHE_DURATION = 10 * 60 * 1000;

function getRates(base = "USD") {
    let now = Date.now();
    if (currencyCache[base] && (now - currencyCache[base].time < CACHE_DURATION)) return Promise.resolve(currencyCache[base].data);
    return fetch(`https://v6.exchangerate-api.com/v6/d6e2d15eb6a36d807a21f119/latest/${base}`)
    .then(res => res.json()).then(data => { currencyCache[base] = { data, time: now }; return data; });
}
getRates("USD").then(data => { window.currencyList = Object.keys(data.conversion_rates); });

let currentLat = null, currentLng = null, currentCountryCode = null;
let clickMarker = null, currentBorder = null;

// ================= MARKER CLUSTERS =================
var airportMarkers = L.markerClusterGroup({
    iconCreateFunction: function(cluster) {
        return L.divIcon({
            html: `<div style="background:#f5a623;color:white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:2px solid #c47d00;">✈ ${cluster.getChildCount()}</div>`,
            className: '', iconSize: [38, 38]
        });
    }
});

var landmarkMarkers = L.markerClusterGroup({
    iconCreateFunction: function(cluster) {
        return L.divIcon({
            html: `<div style="background:#e8312a;color:white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:2px solid #a01f1a;">🏛 ${cluster.getChildCount()}</div>`,
            className: '', iconSize: [38, 38]
        });
    }
});

map.addLayer(airportMarkers);
map.addLayer(landmarkMarkers);

// ================= ICONS =================
var airportIcon = L.divIcon({
    className: '',
    html: `<div style="background:#f5a623;width:28px;height:28px;border-radius:50%;border:2px solid #c47d00;display:flex;align-items:center;justify-content:center;font-size:14px;">✈️</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16]
});

var landmarkIcon = L.divIcon({
    className: '',
    html: `<div style="background:#e8312a;width:28px;height:28px;border-radius:50%;border:2px solid #a01f1a;display:flex;align-items:center;justify-content:center;font-size:14px;">🏛</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16]
});

// ================= HELPERS =================
function setMarker(lat, lng) {
    if (clickMarker) map.removeLayer(clickMarker);
    clickMarker = L.marker([lat, lng]).addTo(map);
}

function loadBorder(code) {
    fetch('php/getBorders.php?code=' + code)
    .then(res => res.json())
    .then(feature => {
        if (currentBorder) map.removeLayer(currentBorder);
        if (!feature || !feature.geometry) { console.log("No border for", code); return; }
        currentBorder = L.geoJSON(feature, {
            style: { color: "#1a73e8", weight: 3, fillColor: "#1a73e8", fillOpacity: 0.15 }
        }).addTo(map);
        map.fitBounds(currentBorder.getBounds());
    })
    .catch(e => console.log("Border fetch error:", e));
}

function clearMarkers() {
    airportMarkers.clearLayers();
    landmarkMarkers.clearLayers();
}

// ================= LOAD AIRPORTS =================
function loadAirports() {
  fetch(`https://secure.geonames.org/searchJSON?lat=${currentLat}&lng=${currentLng}&radius=300&maxRows=25&featureCode=AIRP&username=janferenc`)
    .then(res => res.json())
    .then(data => {
        console.log("Airport data:", data);
        if (!data.geonames || data.geonames.length === 0) {
            console.log("No airports found");
            loadLandmarks();
            return;
        }
        data.geonames.forEach(place => {
            let m = L.marker([place.lat, place.lng], { icon: airportIcon })
                .bindPopup(`✈️ <b>${place.name}</b><br>${place.countryName}`);
            airportMarkers.addLayer(m);
        });
        loadLandmarks();
    })
    .catch(e => { console.log("Airport error:", e); loadLandmarks(); });
}

// ================= LOAD LANDMARKS =================
function loadLandmarks() {
   fetch(`https://secure.geonames.org/searchJSON?lat=${currentLat}&lng=${currentLng}&radius=200&maxRows=25&featureCode=MNMT&featureCode=MUS&featureCode=CSTL&featureCode=HSTS&featureCode=CHRCH&username=janferenc`)
    .then(res => res.json())
    .then(data => {
        console.log("Landmark data:", data);
        if (!data.geonames || data.geonames.length === 0) {
            console.log("No landmarks found, trying Wikipedia...");
            loadLandmarksWiki();
            return;
        }
        data.geonames.forEach(place => {
            let m = L.marker([place.lat, place.lng], { icon: landmarkIcon })
                .bindPopup(`🏛 <b>${place.name}</b><br>${place.fcodeName}`);
            landmarkMarkers.addLayer(m);
        });
    })
    .catch(e => console.log("Landmark error:", e));
}

function loadLandmarksWiki() {
    fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=50000&gscoord=${currentLat}|${currentLng}&gslimit=20&format=json&origin=*`)
    .then(res => res.json())
    .then(data => {
        if (!data.query?.geosearch) return;
        data.query.geosearch.forEach(place => {
            let m = L.marker([place.lat, place.lon], { icon: landmarkIcon })
                .bindPopup(`🏛 <b>${place.title}</b>`);
            landmarkMarkers.addLayer(m);
        });
    })
    .catch(e => console.log("Wiki landmark error:", e));
}

// ================= MODAL =================
function showCard(title, content) {
    document.getElementById("modalBox").innerHTML = `<div class="modalInner"><div class="popupCard"><div class="popupHeader">${title}<button onclick="closeCard()">✕</button></div><div class="popupBody">${content}</div></div></div>`;
}
function closeCard() { document.getElementById("modalBox").innerHTML = ""; }

// ================= INFO =================
L.easyButton('fa-info', function () {
    if (!currentCountryCode) return alert("Select a country first");
    fetch(`https://restcountries.com/v3.1/alpha/${currentCountryCode}`).then(res => res.json()).then(data => {
        let c = data[0];
        let currencyName = Object.values(c.currencies || {})[0]?.name || "N/A";
        let currencyCode = Object.keys(c.currencies || {})[0] || "N/A";
        showCard("Country Info", `
            <img src="${c.flags.png}" style="width:100%;height:180px;object-fit:cover;border-radius:6px;margin-bottom:12px;">
            <div style="font-size:20px;font-weight:600;margin-bottom:10px;">${c.name.common}</div>
            <div style="margin-bottom:6px;"><b>Continent:</b> ${c.region}</div>
            <div style="margin-bottom:6px;"><b>Capital:</b> ${c.capital?.[0] || "N/A"}</div>
            <div style="margin-bottom:6px;"><b>Population:</b> ${c.population.toLocaleString()}</div>
            <div style="margin-bottom:6px;"><b>Area:</b> ${c.area.toLocaleString()} km²</div>
            <div style="margin-bottom:6px;"><b>Currency:</b> ${currencyName} (${currencyCode})</div>
        `);
    });
}).addTo(map);

// ================= WEATHER =================
L.easyButton('fa-cloud', function () {
    if (!currentLat) return alert("Select a country first");
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLng}&current_weather=true&daily=temperature_2m_max,weathercode&timezone=auto`)
    .then(res => res.json()).then(data => {
        let cur = data.current_weather, daily = data.daily;
        let ic = c => c < 3 ? "☀️" : c < 50 ? "☁️" : c < 70 ? "🌧️" : "⛈️";
        showCard("Weather", `
            <div style="background:linear-gradient(135deg,#1ecbe1,#14a9c9);color:white;border-radius:16px;padding:20px;">
                <div style="margin-bottom:15px;opacity:0.9;">📍 Today's Weather</div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-size:18px;">${ic(daily.weathercode[0])} Weather</div>
                        <div style="font-size:48px;font-weight:bold;">${cur.temperature}°C</div>
                    </div>
                    <div style="text-align:right;font-size:14px;">
                        <div>↑ ${daily.temperature_2m_max[0]}°</div>
                        <div>💨 ${cur.windspeed} km/h</div>
                        <div>🧭 ${cur.winddirection}°</div>
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:20px;text-align:center;">
                    ${[0,1,2].map(i=>`<div style="flex:1;"><div>${new Date(daily.time[i]).toLocaleDateString('en-GB',{weekday:'short'})}</div><div style="font-size:22px;margin:6px 0;">${ic(daily.weathercode[i])}</div><div>${daily.temperature_2m_max[i]}°</div></div>`).join("")}
                </div>
                <div style="text-align:right;margin-top:20px;">
                    <button onclick="closeCard()" style="background:white;color:#14a9c9;border:none;padding:6px 14px;border-radius:6px;font-weight:bold;cursor:pointer;">Close</button>
                </div>
            </div>
        `);
    }).catch(() => showCard("Weather", "<p>Failed to load weather.</p>"));
}).addTo(map);

// ================= CURRENCY =================
L.easyButton('fa-dollar-sign', function () {
    showCard("Currency Converter", `
        <div style="font-family:Arial;">
            <div style="display:flex;gap:10px;margin-bottom:15px;">
                <input id="amount" type="number" value="1" style="flex:1;padding:10px;border-radius:6px;border:1px solid #ddd;font-size:16px;">
                <button id="swap" style="padding:10px;border:none;border-radius:6px;background:#eee;cursor:pointer;">⇅</button>
            </div>
            <div><label style="font-size:13px;">From</label><select id="from" style="width:100%;padding:10px;border-radius:6px;border:1px solid #ddd;margin-top:5px;"></select></div>
            <div style="margin-top:12px;"><label style="font-size:13px;">To</label><select id="to" style="width:100%;padding:10px;border-radius:6px;border:1px solid #ddd;margin-top:5px;"></select></div>
            <div id="result" style="background:#f5f5f5;margin-top:15px;padding:15px;border-radius:8px;text-align:center;font-size:24px;font-weight:bold;">0</div>
            <div id="updated" style="text-align:center;font-size:12px;color:#777;margin-top:10px;">Last Updated: -</div>
            <div id="cacheNote" style="text-align:center;font-size:11px;color:#aaa;margin-top:4px;"></div>
            <div style="text-align:right;margin-top:15px;"><button onclick="closeCard()" style="background:#20c4e6;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">Close</button></div>
        </div>
    `);
    let fromEl = document.getElementById("from"), toEl = document.getElementById("to");
    (window.currencyList || []).forEach(c => {
        let o1 = document.createElement("option"), o2 = document.createElement("option");
        o1.value = o1.textContent = c; o2.value = o2.textContent = c;
        fromEl.appendChild(o1); toEl.appendChild(o2);
    });
    fromEl.value = "USD"; toEl.value = "EUR";
    function convert() {
        let amount = document.getElementById("amount")?.value;
        let from = document.getElementById("from")?.value;
        let to = document.getElementById("to")?.value;
        if (!amount || !from || !to) return;
        getRates(from).then(data => {
            let result = (amount * data.conversion_rates[to]).toFixed(2);
            let minsLeft = Math.ceil((CACHE_DURATION - (Date.now() - currencyCache[from].time)) / 60000);
            document.getElementById("result").innerText = result + " " + to;
            document.getElementById("updated").innerText = "Last Updated: " + new Date(currencyCache[from].time).toLocaleString();
            document.getElementById("cacheNote").innerText = `Rates refresh in ~${minsLeft} min`;
        });
    }
    convert();
    setTimeout(() => {
        document.getElementById("amount")?.addEventListener("input", convert);
        document.getElementById("from")?.addEventListener("change", convert);
        document.getElementById("to")?.addEventListener("change", convert);
        document.getElementById("swap").onclick = () => { let f=document.getElementById("from"),t=document.getElementById("to"); [f.value,t.value]=[t.value,f.value]; convert(); };
    }, 100);
}).addTo(map);

// ================= WIKIPEDIA =================
L.easyButton('fa-wikipedia-w', function () {
    if (!currentCountryCode) return alert("Select a country first");
    fetch(`https://restcountries.com/v3.1/alpha/${currentCountryCode}`).then(res=>res.json()).then(data => {
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(data[0].name.common)}`)
        .then(res=>res.json()).then(wiki => {
            showCard("Wikipedia", `<div style="font-family:Arial;"><p style="line-height:1.5;">${wiki.extract}</p><div style="margin-top:15px;text-align:right;"><a href="${wiki.content_urls.desktop.page}" target="_blank" style="background:#20c4e6;color:white;padding:8px 14px;border-radius:6px;text-decoration:none;">Read Full Article →</a></div></div>`);
        });
    });
}).addTo(map);

// ================= NEWS =================
L.easyButton('fa-newspaper', function () {
    if (!currentCountryCode) return alert("Select a country first");
    let code = currentCountryCode.toLowerCase();
   fetch(`php/getNews.php?code=${code}`)
.then(res => res.json()).then(data => {
    if (data.articles && data.articles.length > 0) return render(data.articles);
    showCard("News", "<p>No news found.</p>");
}).catch(() => showCard("News", "<p>Failed to load news.</p>"));

    function render(articles) {
        let html = `<div style="font-family:Arial;max-height:400px;overflow-y:auto;">`;
        articles.slice(0,5).forEach(a => {
            let time = a.publishedAt ? new Date(a.publishedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : "";
            html += `<div style="display:flex;gap:10px;padding:10px;border-bottom:1px solid #eee;align-items:center;">
                <img src="${a.urlToImage||'https://via.placeholder.com/80'}" onerror="this.src='https://via.placeholder.com/80'" style="width:90px;height:70px;object-fit:cover;border-radius:6px;">
                <div style="flex:1;"><a href="${a.url}" target="_blank" style="text-decoration:none;font-weight:600;color:#111;font-size:14px;">${a.title}</a>
                <div style="font-size:11px;color:#777;margin-top:5px;">${a.source?.name||"News"} • ${time}</div></div></div>`;
        });
        html += `<div style="text-align:right;margin-top:10px;padding:0 10px 10px;"><button onclick="closeCard()" style="background:#20c4e6;color:white;border:none;padding:6px 12px;border-radius:5px;cursor:pointer;">Close</button></div></div>`;
        showCard("Latest News", html);
    }
}).addTo(map);

// ================= MAP CLICK =================
map.on('click', function(e) {
    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${e.latlng.lat}&longitude=${e.latlng.lng}&localityLanguage=en`)
    .then(res => res.json())
    .then(data => {
        if (!data.countryCode) { console.log("No country code returned"); return; }
        currentCountryCode = data.countryCode;
        fetch(`https://restcountries.com/v3.1/alpha/${currentCountryCode}`)
        .then(res => res.json())
        .then(countryData => {
            let c = countryData[0];
            currentLat = c.capitalInfo?.latlng?.[0] || c.latlng[0];
            currentLng = c.capitalInfo?.latlng?.[1] || c.latlng[1];
            clearMarkers();
            setMarker(currentLat, currentLng);
            loadBorder(currentCountryCode);
            loadAirports();
        });
    })
    .catch(e => console.log("Reverse geocode error:", e));
});

// ================= DROPDOWN =================
document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("countrySelect");
    fetch("https://restcountries.com/v3.1/all?fields=name,cca2,latlng").then(res=>res.json()).then(data => {
        data.sort((a,b)=>a.name.common.localeCompare(b.name.common));
        data.forEach(c => { let o=document.createElement("option"); o.value=c.cca2; o.textContent=c.name.common; select.appendChild(o); });
    });

    select.addEventListener("change", function() {
        let code = this.value;
        if (!code) return;
        currentCountryCode = code;
        fetch(`https://restcountries.com/v3.1/alpha/${code}`).then(res=>res.json()).then(data => {
            let c = data[0];
            currentLat = c.latlng[0]; currentLng = c.latlng[1];
            clearMarkers();
            setMarker(currentLat, currentLng);
            map.setView([currentLat, currentLng], 5);
            loadBorder(currentCountryCode);
            loadAirports();
        });
    });
});