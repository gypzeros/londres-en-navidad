const get = id => document.getElementById(id);
const filters = ["Todo", "Navidad", "Comer", "Clásicos"];
const storageKey = "londres-navidad-paradas-2026";
let checked = {};
try { checked = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
let selected = 0;
let filter = "Todo";
const anchor = (label, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
const mapURL = query => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query + ", London");
const route = (origin, destination, waypoints = []) => "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(origin + ", London") + "&destination=" + encodeURIComponent(destination + ", London") + "&travelmode=walking" + (waypoints.length ? "&waypoints=" + encodeURIComponent(waypoints.map(p => p + ", London").join("|")) : "");
const routes = [
  [["Ruta a pie de Chinatown a Regent Street","Chinatown","Regent Street",["Covent Garden","Seven Dials","Outernet London"]]],
  [["Metro de Mayfair a Sky Garden","https://tfl.gov.uk/plan-a-journey/"],["Sky Garden a Tower Pier por Borough Market","Sky Garden","Tower Pier",["Borough Market","Hay's Galleria","Tower Bridge"]],["Horario de Tower Pier a Canary Wharf","https://www.thamesclippers.com/plan-your-journey/timetable"]],
  [["Trayecto en metro a Camden Town","https://tfl.gov.uk/plan-a-journey/"],["Camden Market al Museo de Historia Natural","https://www.google.com/maps/dir/?api=1&origin=Camden+Market+London&destination=Natural+History+Museum+London&travelmode=transit"],["Harrods a Winter Wonderland por Chelsea","Harrods","Hyde Park Winter Wonderland",["Duke of York Square"]]],
  []
];
function progress() {
  const stops = days[selected].groups.flatMap(group => group[4]);
  get("progress").textContent = stops.length ? stops.filter(([name]) => checked[name]).length + " de " + stops.length + " visitadas" : "";
}
let streetMap;
let itineraryLayers;

function renderMap(day, filter) {
  const panel = get("map");
  const picker = get("mapZone");
  const {points, segments} = routeMaps[selected];
  if (!points.length || !window.L) return;

  if (!streetMap) {
    streetMap = L.map(panel, {scrollWheelZoom:false,maxZoom:20});
    const tiles = L.tileLayer("https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://www.hotosm.org/">HOT</a> · <a href="https://www.openstreetmap.fr/">OSM France</a>',
      maxNativeZoom:19,maxZoom:20,referrerPolicy:"strict-origin-when-cross-origin"
    }).addTo(streetMap);
    tiles.on("tileerror", () => { get("mapError").hidden = false; });
    itineraryLayers = L.layerGroup().addTo(streetMap);
  }
  itineraryLayers.clearLayers();

  const items = day.groups.flatMap(group => group[4]);
  const active = items.map((item,i) => filter === "Todo" || item[1] === filter ? i : -1).filter(i => i >= 0);
  if (!active.length) return;
  picker.replaceChildren(new Option("Todas las paradas visibles", ""));
  const styles = {
    walk:{color:"#9b263f",weight:5},
    metro:{color:"#224f98",weight:4,dashArray:"8 6"},
    boat:{color:"#0c756d",weight:5,dashArray:"10 5"},
    optional:{color:"#665976",weight:3,dashArray:"3 7"},
    approx:{color:"#665976",weight:3,dashArray:"3 7"}
  };
  for (const [mode,line] of segments) {
    L.polyline(line,{...styles[mode],opacity:0.88,interactive:false}).addTo(itineraryLayers);
  }

  const markers = new Map();
  active.forEach(i => {
    const [name,category] = items[i];
    const label = (i+1) + " · " + name;
    const marker = L.marker(points[i], {
      title:label,alt:label,
      icon:L.divIcon({className:"numbered-pin",html:String(i+1),iconSize:[27,27],iconAnchor:[13,13]})
    }).addTo(itineraryLayers);
    const popup = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = label;
    popup.append(heading);
    popup.insertAdjacentHTML("beforeend", "<p>"+category+"</p>"+anchor("Abrir parada en Google Maps",mapURL(name)));
    marker.bindPopup(popup);
    markers.set(i,marker);
    picker.add(new Option(label,String(i)));
  });

  function updateView() {
    if (picker.value === "") {
      streetMap.fitBounds(active.map(i => points[i]),{padding:[27,27],maxZoom:16});
      return;
    }
    const i = Number(picker.value);
    streetMap.setView(points[i],18);
    markers.get(i).openPopup();
  }
  picker.onchange = updateView;
  streetMap.invalidateSize({pan:false});
  updateView();
  const center = streetMap.getCenter();
  get("mapOutside").href = `https://www.openstreetmap.org/#map=${streetMap.getZoom()}/${center.lat}/${center.lng}`;
}
function render() {
  const day = days[selected];
  get("days").innerHTML = days.map((d, i) => `<button type="button" data-day="${i}" aria-pressed="${i===selected}"><strong>${d.date} nov.</strong><span>${d.day}</span></button>`).join("");
  get("dayHero").innerHTML = `<div><p class="eyebrow">${day.area}</p><h3>${day.title}</h3><p>${day.intro}</p></div><img src="${day.photo}" alt="${day.alt}" loading="lazy">`;
  get("mapa").hidden = !day.groups.length;
  get("filters").hidden = !day.groups.length;
  get("filters").innerHTML = filters.map(f => `<button type="button" data-filter="${f}" aria-pressed="${f===filter}">${f}</button>`).join("");
  const numbers = new Map(day.groups.flatMap(group => group[4]).map(([name],i) => [name,i+1]));
  const groups = day.groups.map(([time,title,lat,lng,items]) => [time,title,lat,lng,items.filter(([,category]) => filter==="Todo" || category===filter)]).filter(group => group[4].length);
  get("stops").innerHTML = groups.map(([time,title,,,items]) => `<section class="group"><div class="group-title"><span class="time">${time}</span><h3>${title}</h3></div>${items.map(([name,category,description,url]) => `<div class="stop"><input type="checkbox" data-stop="${name}" aria-label="Marcar ${name} como visitado" ${checked[name] ? "checked" : ""}><div><b><span class="stop-number">${numbers.get(name)}</span> ${name}</b><small>${category}</small><p>${description}</p>${anchor("Ver en Maps",mapURL(name))}${url ? anchor("Información y entradas",url) : ""}</div></div>`).join("")}</section>`).join("");
  get("mapLinks").innerHTML = `<div class="map-links">${routes[selected].map(([label,origin,destination,waypoints]) => anchor(label,destination ? route(origin,destination,waypoints) : origin)).join("")}</div>`;
  progress();
  renderMap(day, filter);
}
get("days").addEventListener("click",event => {
  const button = event.target.closest("[data-day]");
  if (!button) return;
  selected = Number(button.dataset.day);
  filter = "Todo";
  render();
  get("days").children[selected].focus({preventScroll:true});
});
get("filters").addEventListener("click",event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  filter = button.dataset.filter;
  render();
  get("filters").children[filters.indexOf(filter)].focus({preventScroll:true});
});
get("stops").addEventListener("change",event => {
  const input = event.target;
  checked[input.dataset.stop] = input.checked;
  try { localStorage.setItem(storageKey,JSON.stringify(checked)); } catch {}
  progress();
});
render();
