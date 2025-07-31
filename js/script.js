const villes = {
  lyon: {
    nom: "lyon",
    region: "auvergne-rhône-alpes",
    coord: [45.75, 4.85]
  },
  paris: {
    nom: "paris",
    region: "paris",
    coord: [48.8566, 2.3522]
  },
  toulouse: {
    nom: "toulouse",
    region: "occitanie",
    coord: [43.6045, 1.444]
  },
  bordeaux: {
    nom: "bordeaux",
    region: "nouvelle aquitaine",
    coord: [44.8378, -0.5792]
  },
  grenoble: {
    nom: "grenoble",
    region: "auvergne-rhône-alpes",
    coord: [45.1885, 5.7245]
  },
  rennes: {
    nom: "rennes",
    region: "bretagne",
    coord: [48.1147, -1.6794]
  }
};

const queryString = window.location.search; // Ex: "?lyon"
let ville = queryString && queryString !== "?" ? queryString.substring(1) : "";

// Vérifie si la ville est connue, sinon remplace par "paris"
if (!villes.hasOwnProperty(ville)) {
  ville = "paris";
}
const root = "https://urbanivore.fr/data/"+ville+".geojson";


if (window !== window.parent) {
  console.log("La page est affichée dans une iframe.");
  document.querySelector('header').style.display = 'none';
  document.querySelector('#search-container').style.top = '10px';
  document.querySelector('main').style.height = '100vh';
}



// Génère une couleur unique et stable à partir d'une chaîne (nom d'espèce)
function getColorFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

const recettesRestantesParEspece = {};
const derniereRecetteParEspece = {};

function getRecetteNonRepetitiveGlobal(espece) {
  const pool = recettes[espece];
  if (!pool || pool.length === 0) return null;

  if (!recettesRestantesParEspece[espece] || recettesRestantesParEspece[espece].length === 0) {
    const derniere = derniereRecetteParEspece[espece];
    recettesRestantesParEspece[espece] = pool.filter(r => r !== derniere);
    if (recettesRestantesParEspece[espece].length === 0) {
      recettesRestantesParEspece[espece] = [...pool];
    }
  }

  const index = Math.floor(Math.random() * recettesRestantesParEspece[espece].length);
  const recette = recettesRestantesParEspece[espece].splice(index, 1)[0];
  derniereRecetteParEspece[espece] = recette;
  return recette;
}

function debounce(func, wait = 150) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const coords = villes[ville].coord || [48.8566, 2.3522]; // fallback : Paris

const map = L.map("map", {
  zoomControl: false
}).setView(coords, 13);

if (window.innerWidth >= 768) {
  L.control.zoom({ position: 'topright' }).addTo(map);
}

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19
}).addTo(map);

let enableClustering = window.innerWidth < 768 ? true : true;

const allMarkers = [];
let geoJsonData = null;
const markers = enableClustering
  ? L.markerClusterGroup({ disableClusteringAtZoom: 15, maxClusterRadius: 50 })
  : L.layerGroup();

fetch(root)
  .then(response => response.json())
  .then(data => {
    geoJsonData = data;

    data.features.forEach(f => {
      if (f.properties.libellefrancais === "Aubepine") {
        f.properties.libellefrancais = "Aubépine";
      }
    });

    // Compter les occurrences d'espèces
    const especeCounts = {};
    data.features.forEach(f => {
      const esp = f.properties.libellefrancais;
      if (esp) {
        especeCounts[esp] = (especeCounts[esp] || 0) + 1;
      }
    });

    const espList = Object.keys(especeCounts).sort();

    // Générer les filtres d'espèces
    const filterEsp = document.getElementById("espece-filters");
    espList.forEach(esp => {
      const count = especeCounts[esp];
      const id = "esp_" + esp.replace(/\s+/g, "_");
      const color = getColorFromString(esp);

      const label = document.createElement("label");
      label.className = "arr-filter";
      label.innerHTML = `
        <span class="color-indicator" style="background-color: ${color};"></span>
        <input type="checkbox" id="${id}" data-esp="${esp}" checked> ${esp} (${count})
      `;
      filterEsp.appendChild(label);
    });

    // Ajouter les listeners uniquement pour les espèces
    document.querySelectorAll("#espece-filters input")
      .forEach(input => {
        input.addEventListener("change", updateMap);
      });




    updateMap(); // Premier affichage
  })
  .catch(error => console.error("Erreur lors du chargement du GeoJSON :", error));

const updateMap = debounce(() => {
  markers.clearLayers();

  const selectedEsp = new Set(
    Array.from(document.querySelectorAll("#espece-filters input:checked")).map(i => i.dataset.esp)
  );

  const filteredFeatures = geoJsonData.features.filter(f =>
    selectedEsp.has(f.properties.libellefrancais)
  );

  const geoJsonLayer = L.geoJSON(filteredFeatures, {
    pointToLayer: (feature, latlng) => {
      const espece = feature.properties.libellefrancais || "Inconnue";
      const color = getColorFromString(espece);

      return L.circleMarker(latlng, {
        radius: 10,
        fillColor: color,
        color: "#FFFFFF",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      });
    },

    onEachFeature: function (feature, layer) {
      const props = feature.properties;
      const nomEspece = props["libellefrancais"];
      const layerId = layer._leaflet_id;

      if (window.innerWidth >= 768 && nomEspece) {
        layer.bindTooltip(nomEspece, {
          permanent: false,
          direction: 'top',
          offset: [0, -10],
          opacity: 0.9,
          className: 'custom-tooltip'
        });
      }

      const recette = getRecetteNonRepetitiveGlobal(nomEspece);
      if (!recette) return;

      let popupContent = '<div class="popup-details">';
      popupContent += `<h3>${props["libellefrancais"]}</h3>`;
      popupContent += `<h4>${props["genre"]} ${props["espece"]}</h4>`;
      popupContent += '</div>';

      popupContent += `
        <div class="recette-popup" id="recette-${layerId}">
          <h3 class="recette-title">${recette.titre}</h3>
          <img src="${recette.image}" alt="${recette.titre}">
          <a class="recette-link" href="${recette.lien}" target="_blank">🍽️ Voir la recette complète</a>
      `;

      if (recettes[nomEspece] && recettes[nomEspece].length > 1) {
        popupContent += `
          <button class="recette-refresh" data-layer="${layerId}" data-espece="${nomEspece}">🔄 Une autre recette</button>
        `;
      }

      popupContent += `</div>`;
      layer.bindPopup(popupContent);

      layer.on("click", () => {
        layer.openPopup();
      });
    }
  });

  markers.addLayer(geoJsonLayer);
  map.addLayer(markers);
}, 200);

// Bouton toggle du menu
document.getElementById("toggleSidebar").addEventListener("click", function () {
  const sidebar = document.getElementById("sidebar");
  const button = this;

  sidebar.classList.toggle("open");
  button.classList.toggle("open");

  button.innerHTML = sidebar.classList.contains("open") ? "✕" : "☰ Filtres";
  button.style.top = sidebar.classList.contains("open") ? "20px" : "100px";
});

// Bouton de rafraîchissement des recettes dans les popups
document.addEventListener("click", function (e) {
  if (e.target && e.target.classList.contains("recette-refresh")) {
    const layerId = e.target.dataset.layer;
    const espece = e.target.dataset.espece;

    const nouvelleRecette = getRecetteNonRepetitiveGlobal(espece);
    if (!nouvelleRecette) return;

    const container = document.getElementById(`recette-${layerId}`);
    if (container) {
      container.innerHTML = `
        <h3 class="recette-title">${nouvelleRecette.titre}</h3>
        <img src="${nouvelleRecette.image}" alt="${nouvelleRecette.titre}">
        <a class="recette-link" href="${nouvelleRecette.lien}" target="_blank">🍽️ Voir la recette complète</a>
        <button class="recette-refresh" data-layer="${layerId}" data-espece="${espece}">🔄 Une autre recette</button>
      `;
    }
  }
});

// Aide : bouton et fermeture du popup
document.getElementById("helpBtn").addEventListener("click", function () {
  const popup = document.getElementById("helpPopup");
  popup.style.display = popup.style.display === "block" ? "none" : "block";
});

document.getElementById("closeHelp").addEventListener("click", function () {
  document.getElementById("helpPopup").style.display = "none";
});


function goToAddress(address, region = "") {
  if (!address) return;

  const encoded = encodeURIComponent(address + " " + region + ", France");
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        map.setView([lat, lon], 17);
      } else {
        alert("Adresse non trouvée. Essayez avec une adresse plus précise !");
      }
    })
    .catch(err => {
      console.error("Erreur lors de la géolocalisation :", err);
      alert("Erreur lors de la recherche d’adresse.");
    });
}

document.getElementById("search-btn").addEventListener("click", function () {
  const address = document.getElementById("address-input").value;
  goToAddress(address, villes[ville].region);
});

document.getElementById("address-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    const address = document.getElementById("address-input").value;
    goToAddress(address, villes[ville].region);
  }
});
