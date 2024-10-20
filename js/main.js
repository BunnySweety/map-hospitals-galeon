// Constants
const MOBILE_BREAKPOINT = 1024;
const DEFAULT_LANGUAGE = 'en';

// Global variables
let map, markers = [], activeStatus = [], language = DEFAULT_LANGUAGE;
let darkMode = false;
let markerClusterGroup;
let currentTranslations = {};
let markersAdded = false;
let isInitialized = false;

const gauges = {};
const colors = {
    'Deployed': '#4CAF50',
    'In Progress': '#FFA500',
    'Signed': '#2196F3'
};

// Customization configuration
const mapCustomization = {
    backgroundColor: '#f0f0f0',
    borderColor: '#333333',
    labelColor: '#000000',
    useCustomMarkers: false,
    customMarkerUrl: '/path/to/custom-marker.png',
    useCustomLegendIcons: false,
    customLegendIconUrls: {
        'Deployed': '/path/to/deployed-icon.png',
        'In Progress': '/path/to/in-progress-icon.png',
        'Signed': '/path/to/signed-icon.png'
    },
    useCustomStatusIcons: false,
    customStatusIconUrls: {
        'Deployed': '/path/to/deployed-status.png',
        'In Progress': '/path/to/in-progress-status.png',
        'Signed': '/path/to/signed-status.png'
    }
};

// Utility Functions
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Main initialization function
async function initApplication() {
    if (isInitialized) {
        console.log('Application already initialized. Skipping initialization.');
        return;
    }

    console.log('Initializing application...');

    try {
        checkRequiredElements();
        checkRequiredData();

        initMap();
        await loadGeoJSONData();
        initGauges();
        initStatusTags();
        loadPreferences();
        applyTranslations(language);
        addMarkers();
        addEventListeners();
        adjustForMobile();
        updateGauges();
        updateTileLayer();

        document.querySelector('.controls').style.display = 'block';
        updateStatusTagsVisually();
        applyMapCustomization();
        enhanceAccessibility();
        initHospitalSearch();

        isInitialized = true;
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        handleError(error, 'An error occurred during initialization. Please refresh the page or contact support.');
    }
}

function checkRequiredElements() {
    const requiredElements = ['map', 'continent-select', 'country-filter', 'city-filter', 'hospital-search'];
    for (const elementId of requiredElements) {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Required element #${elementId} not found in the DOM`);
        }
    }
}

function checkRequiredData() {
    if (!hospitals || !Array.isArray(hospitals) || hospitals.length === 0) {
        throw new Error('Hospitals data is missing or invalid');
    }
    if (!translations || typeof translations !== 'object') {
        throw new Error('Translations data is missing or invalid');
    }
}

// Map Initialization and Update Functions
function initMap() {
    if (!map) {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        map = L.map('map', {
            center: [50, 10],
            zoom: 4,
            maxZoom: 18,
            zoomControl: !isMobile,
            scrollWheelZoom: true,
            dragging: true,
            tap: true
        });

        map.createPane('borderPane').style.zIndex = 400;
        map.createPane('markerPane').style.zIndex = 450;

        markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });

        map.addLayer(markerClusterGroup);
        updateTileLayer();
    }
}

function updateTileLayer() {
    if (window.currentTileLayer && map.hasLayer(window.currentTileLayer)) {
        map.removeLayer(window.currentTileLayer);
    }

    window.currentTileLayer = L.tileLayer(
        darkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
            maxZoom: 19
        }
    ).addTo(map);
}

// Marker Functions
function addMarkers() {
    if (markersAdded) {
        console.log('Markers already added. Updating existing markers.');
        updateMarkers();
        return;
    }

    console.log('Starting addMarkers function');
    try {
        console.log('Hospitals data:', hospitals);
        if (!hospitals || !Array.isArray(hospitals)) {
            throw new Error('Hospitals data is not available or not in the correct format');
        }

        markerClusterGroup.clearLayers();
        markers = [];

        updateMarkersInChunks(hospitals);

        markersAdded = true;
    } catch (error) {
        console.error('Error in addMarkers:', error);
        handleError(error, 'An error occurred while adding markers to the map. Please check the console for more details.');
    }
}

function updateMarkersInChunks(hospitals, chunkSize = 3) {
    let index = 0;
    let createdMarkers = 0;

    function processChunk() {
        const chunk = hospitals.slice(index, index + chunkSize);

        chunk.forEach(hospital => {
            const marker = createMarker(hospital);
            markers.push(marker);
            createdMarkers++;
        });

        index += chunkSize;

        if (index < hospitals.length) {
            requestAnimationFrame(processChunk);
        } else {
            console.log(`Total markers created: ${createdMarkers}`);
            console.log('All markers processed');
            updateMarkers();
        }
    }

    requestAnimationFrame(processChunk);
}

function createMarker(hospital) {
    const markerOptions = {
        pane: 'markerPane'
    };

    let marker;
    if (mapCustomization.useCustomMarkers) {
        const customIcon = L.icon({
            iconUrl: mapCustomization.customMarkerUrl,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        });
        marker = L.marker([hospital.lat, hospital.lon], { ...markerOptions, icon: customIcon });
    } else {
        marker = L.circleMarker([hospital.lat, hospital.lon], {
            ...markerOptions,
            radius: 8,
            fillColor: getColor(hospital.status),
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });
    }

    marker.hospitalData = hospital;

    const popupContent = createPopupContent(hospital);
    marker.bindPopup(popupContent, {
        autoPan: false,
        closeButton: true,
        closeOnClick: false
    });

    marker.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        markerClusterGroup.eachLayer(function (layer) {
            if (layer instanceof L.Marker && layer !== marker) {
                layer.closePopup();
            }
        });
        this.openPopup();
    });

    return marker;
}

function updateMarkers() {
    if (!hospitals || hospitals.length === 0) {
        console.log('No hospital data available yet. Skipping marker update.');
        return;
    }

    console.log('Updating existing markers');
    const filters = getFilters();

    let visibleMarkers = 0;
    const bounds = L.latLngBounds();

    markers.forEach(marker => {
        const hospital = marker.hospitalData;
        const { city, country } = extractLocationInfo(hospital.address);

        if (markerMatchesFilters(hospital, filters, city, country)) {
            if (!markerClusterGroup.hasLayer(marker)) {
                markerClusterGroup.addLayer(marker);
            }
            bounds.extend(marker.getLatLng());
            visibleMarkers++;
        } else {
            if (markerClusterGroup.hasLayer(marker)) {
                markerClusterGroup.removeLayer(marker);
            }
        }
    });

    console.log(`Visible markers after update: ${visibleMarkers}`);
    updateGauges();
    updateNoHospitalsMessage(visibleMarkers);

    if (visibleMarkers === 0) {
        map.setView([50, 10], 4);
    } else if (!map.getBounds().intersects(bounds)) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: map.getZoom() });
    }

    console.log('Markers updated successfully');
}

// Filter and Search Functions
function getFilters() {
    return {
        continent: document.getElementById('continent-select')?.value || '',
        country: document.getElementById('country-filter')?.value.toLowerCase() || '',
        city: document.getElementById('city-filter')?.value.toLowerCase() || '',
        searchTerm: document.getElementById('hospital-search')?.value.toLowerCase() || ''
    };
}

/**
 * Checks if a marker matches the current filters
 * @param {Object} hospital - The hospital data
 * @param {Object} filters - The current filter values
 * @param {string} city - The city extracted from the hospital address
 * @param {string} country - The country extracted from the hospital address
 * @returns {boolean} True if the marker matches all filters, false otherwise
 */
function markerMatchesFilters(hospital, filters, city, country) {
    // Check if the hospital status is in the active statuses or if no status filter is applied
    const statusMatch = activeStatus.length === 0 || activeStatus.some(s => s.toLowerCase() === hospital.status.toLowerCase());

    // Check if the hospital is in the selected continent
    const continentMatch = !filters.continent || getContinent(hospital.lat, hospital.lon) === filters.continent;

    // Check if the hospital country matches the country filter
    const countryMatch = !filters.country || country.toLowerCase().includes(filters.country);

    // Check if the hospital city matches the city filter
    const cityMatch = !filters.city || city.toLowerCase().includes(filters.city);

    // Check if the hospital name matches the search term
    const searchMatch = !filters.searchTerm || hospital.name.toLowerCase().includes(filters.searchTerm);

    // Return true only if all filter conditions are met
    return statusMatch && continentMatch && countryMatch && cityMatch && searchMatch;
}

function handleFilterChange() {
    document.dispatchEvent(new Event('mapUpdate'));
    savePreferences();
}

function initHospitalSearch() {
    const searchInput = document.getElementById('hospital-search');
    if (!searchInput) {
        console.error('Hospital search input not found');
        return;
    }

    searchInput.addEventListener('input', debounce(() => {
        document.dispatchEvent(new Event('mapUpdate'));
    }, 300));
}

// Event Listeners
function addEventListeners() {
    window.addEventListener('load', () => {
        adjustForMobile();
        initApplication();
    });

    window.addEventListener('resize', debounce(() => {
        adjustForMobile();
        if (map) {
            map.invalidateSize();
            updateMapControls();
        }
    }, 250));

    window.addEventListener('orientationchange', debounce(() => {
        adjustForMobile();
        if (map) map.invalidateSize();
    }, 100));

    const eventMap = {
        'language-select': { event: 'change', handler: handleLanguageChange },
        'continent-select': { event: 'change', handler: handleFilterChange },
        'country-filter': { event: 'input', handler: handleFilterChange },
        'city-filter': { event: 'input', handler: handleFilterChange },
        'hospital-search': { event: 'input', handler: handleFilterChange },
        'theme-toggle': { event: 'click', handler: toggleTheme },
        'hamburger': { event: 'click', handler: toggleMenu },
        'legend-toggle': { event: 'click', handler: toggleLegend }
    };

    Object.entries(eventMap).forEach(([id, { event, handler }]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, debounce(handler, 250));
        } else {
            console.warn(`Element with id '${id}' not found. Event listener not added.`);
        }
    });

    document.querySelectorAll('.status-tag').forEach(tag => {
        tag.addEventListener('click', handleStatusTagClick);
    });

    if (map) {
        map.on('click', handleMapClick);
    }

    document.addEventListener('mapUpdate', debounce(updateMarkers, 250));

    console.log('Event listeners added successfully');
}

function handleLanguageChange(event) {
    const newLanguage = event.target.value;
    applyTranslations(newLanguage);
    savePreferences();
    updateAllPopups();
    updateMarkers();
}

function updateAllPopups() {
    markers.forEach(marker => {
        if (marker.getPopup()) {
            const newContent = createPopupContent(marker.hospitalData);
            marker.getPopup().setContent(newContent);
            if (marker.getPopup().isOpen()) {
                marker.getPopup().update();
            }
        }
    });
}

function updateMapControls() {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    if (isMobile && map.zoomControl) {
        map.zoomControl.remove();
    } else if (!isMobile && !map.zoomControl) {
        map.zoomControl = new L.Control.Zoom();
        map.addControl(map.zoomControl);
    }
}

function handleStatusTagClick(event) {
    const status = event.target.dataset.status;
    filterHospitals(status);
    document.dispatchEvent(new Event('mapUpdate'));
}

function handleMapClick(e) {
    markerClusterGroup.eachLayer(function (layer) {
        if (layer instanceof L.Marker) {
            layer.closePopup();
        }
    });
}

// UI Update Functions
function updateStatusTagsVisually() {
    document.querySelectorAll('.status-tag').forEach(tag => {
        const status = tag.dataset.status;
        const isActive = activeStatus.some(s => s.toLowerCase() === status.toLowerCase());
        tag.classList.toggle('active', isActive);
        tag.setAttribute('aria-pressed', isActive.toString());
    });
    console.log('Status tags updated visually');
}

function updateNoHospitalsMessage(visibleMarkers) {
    const noHospitalsMessage = document.getElementById('no-hospitals-message');
    if (noHospitalsMessage) {
        noHospitalsMessage.style.display = visibleMarkers === 0 ? 'block' : 'none';
        if (visibleMarkers === 0) {
            const messageSpan = noHospitalsMessage.querySelector('span');
            if (messageSpan) {
                messageSpan.textContent = currentTranslations.noHospitalsMessage || "No hospitals match the current filters.";
            }
        }
    }
}

function updateGauges() {
    const statusCounts = hospitals.reduce((acc, hospital) => {
        acc[hospital.status] = (acc[hospital.status] || 0) + 1;
        return acc;
    }, {});

    const totalHospitals = hospitals.length;

    Object.keys(gauges).forEach(status => {
        const count = statusCounts[status] || 0;
        const percentage = (count / totalHospitals) * 100 || 0;

        if (gauges[status]) {
            gauges[status].path.setAttribute("stroke-dasharray", `${percentage}, 100`);
            gauges[status].valueContainer.textContent = count;

            const percentageElement = gauges[status].element.nextElementSibling;
            if (percentageElement) {
                percentageElement.textContent = `(${percentage.toFixed(1)}%)`;
            }
        }
    });
}

// Customization and Styling Functions
function applyMapCustomization() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.style.backgroundColor = mapCustomization.backgroundColor;
    }

    if (window.borderLayer) {
        map.removeLayer(window.borderLayer);
    }
    if (window.countriesData) {
        window.borderLayer = L.geoJSON(window.countriesData, {
            pane: 'borderPane',
            style: {
                color: mapCustomization.borderColor,
                weight: 1,
                fillOpacity: 0
            },
            interactive: false
        }).addTo(map);
    }

    const style = document.createElement('style');
    style.textContent = `.leaflet-marker-icon { color: ${mapCustomization.labelColor} !important; }`;
    document.head.appendChild(style);

    updateMarkers();
    updateLegend();
    updateStatusTags();
}

function updateCustomization(newCustomization) {
    Object.assign(mapCustomization, newCustomization);
    applyMapCustomization();
}

function toggleTheme() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode');
    updateTileLayer();
    savePreferences();
}

function toggleLegend() {
    const legendContainer = document.querySelector('.legend-container');
    if (legendContainer) {
        legendContainer.style.display = legendContainer.style.display === 'none' ? 'block' : 'none';
    }
}

function toggleMenu() {
    const controls = document.querySelector('.controls');
    if (controls) {
        controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
    }
}

// Data Processing Functions
async function loadGeoJSONData() {
    try {
        const response = await fetch('data/countries.geojson');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        window.countriesData = data;
        console.log('GeoJSON data loaded successfully');
    } catch (error) {
        console.error('Error loading GeoJSON data:', error);
        handleError(error, 'Failed to load map data. Some features may not be available.');
    }
}

function filterCountries(countriesData, countriesToShow) {
    return {
        ...countriesData,
        features: countriesData.features.filter(feature =>
            countriesToShow.includes(feature.properties.ADMIN)
        )
    };
}

/**
 * Extracts location information from an address string
 * @param {string} address - The full address string
 * @returns {Object} An object containing parsed address components
 */
function extractLocationInfo(address) {
    if (typeof address !== 'string' || address.trim() === '') {
        console.warn('Invalid address provided to extractLocationInfo');
        return { street: '', city: '', state: '', country: '', postalCode: '' };
    }

    // Normalize the address string
    address = address.trim().replace(/\s+/g, ' ');

    // Split the address into parts
    const parts = address.split(',').map(part => part.trim());

    let street = '', city = '', state = '', country = '', postalCode = '';

    // Extract country (assumed to be the last part)
    if (parts.length > 0) {
        country = parts.pop();
    }

    // Extract postal code (if present)
    const postalCodeMatch = parts[parts.length - 1]?.match(/\b[A-Z0-9]{5,7}\b/i);
    if (postalCodeMatch) {
        postalCode = postalCodeMatch[0];
        parts[parts.length - 1] = parts[parts.length - 1].replace(postalCode, '').trim();
    }

    // Extract city and state (if present)
    if (parts.length > 0) {
        const cityStatePart = parts.pop();
        const cityStateMatch = cityStatePart.match(/^(.+?)\s*(?:,\s*)?(\w+)?$/);
        if (cityStateMatch) {
            city = cityStateMatch[1];
            state = cityStateMatch[2] || '';
        } else {
            city = cityStatePart;
        }
    }

    // The remaining parts form the street address
    street = parts.join(', ');

    // Clean up any remaining commas
    [street, city, state, country] = [street, city, state, country].map(s => s.replace(/^,\s*|,\s*$/g, ''));

    return { street, city, state, country, postalCode };
}

function getContinent(lat, lon) {
    if (lat > 35 && lat < 71 && lon > -25 && lon < 40) return "Europe";
    if (lat > -35 && lat < 37 && lon > -20 && lon < 60) return "Africa";
    if (lat > -10 && lat < 55 && lon > 25 && lon < 180) return "Asia";
    if (lat > -50 && lat < 0 && lon > 110 && lon < 180) return "Oceania";
    if (lat > 15 && lat < 72 && lon > -170 && lon < -40) return "North America";
    if (lat > -57 && lat < 15 && lon > -110 && lon < -35) return "South America";
    return "Unknown";
}

function getColor(status) {
    return colors[status] || '#6c757d';
}

// Popup Content Creation
function createPopupContent(hospital) {
    const isLandscape = window.innerWidth > window.innerHeight;
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    const popupClass = isMobile && isLandscape ? 'popup-content mobile-landscape' : 'popup-content';

    const statusTag = getStatusTag(hospital.status, true);
    return `
    <div class="${popupClass}">
        <h3 class="popup-title">${hospital.name}</h3>
        <img class="popup-image" src="${hospital.imageUrl}" alt="${hospital.name}" loading="lazy">
        <div class="popup-address">
            <strong>${currentTranslations.address || 'Address'}:</strong><br>
            ${hospital.address}
        </div>
        <a href="${hospital.website}" target="_blank" rel="noopener noreferrer" class="popup-link">${currentTranslations.visitWebsite || 'Visit Website'}</a>
        <div class="popup-status">
            <span>${currentTranslations.status || 'Status'}:</span> ${statusTag}
        </div>
    </div>
    `;
}

function getStatusTag(status, isActive = false) {
    const statusKey = status.toLowerCase().replace(" ", "");
    const statusText = currentTranslations[statusKey] || status;
    const activeClass = isActive ? ' active' : '';

    if (mapCustomization.useCustomStatusIcons && mapCustomization.customStatusIconUrls[status]) {
        return `<span class="status-tag status-${statusKey}${activeClass}">
        <img src="${mapCustomization.customStatusIconUrls[status]}" alt="${statusText}" style="width:20px;height:20px;margin-right:5px;">
        ${statusText}
    </span>`;
    } else {
        return `<span class="status-tag status-${statusKey}${activeClass}">${statusText}</span>`;
    }
}

// Translation and Localization Functions
function applyTranslations(lang) {
    currentTranslations = translations[lang] || translations[DEFAULT_LANGUAGE];
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (currentTranslations[key]) {
            element.textContent = currentTranslations[key];
        }
    });
    updatePlaceholders();
    updateContinentSelect();
    updateGaugeLabels();
    updateStatusTags();
    updateLegend();
    updateMarkers();
}

function updatePlaceholders() {
    const elements = {
        'country-filter': 'enterCountry',
        'city-filter': 'enterCity',
        'hospital-search': 'searchHospital'
    };

    Object.entries(elements).forEach(([id, key]) => {
        const element = document.getElementById(id);
        if (element) {
            element.setAttribute('placeholder', currentTranslations[key] || `Enter ${id.split('-')[0]}...`);
        }
    });
}

function updateContinentSelect() {
    const continentSelect = document.getElementById('continent-select');
    if (continentSelect) {
        continentSelect.options[0].text = currentTranslations.continent || 'Continent';
        const continentOptions = {
            'Europe': 'europe',
            'North America': 'northAmerica',
            'South America': 'southAmerica',
            'Asia': 'asia',
            'Africa': 'africa',
            'Oceania': 'oceania'
        };
        for (let i = 1; i < continentSelect.options.length; i++) {
            const option = continentSelect.options[i];
            option.text = currentTranslations[continentOptions[option.value]] || option.value;
        }
    }
}

function updateGaugeLabels() {
    const gaugeLabels = document.querySelectorAll('.gauge-label');
    const labelTexts = ['gaugesDeployed', 'gaugesInProgress', 'gaugesSigned'];
    gaugeLabels.forEach((label, index) => {
        if (index < labelTexts.length) {
            label.textContent = currentTranslations[labelTexts[index]] || labelTexts[index].replace('gauges', '');
        }
    });
}

function updateStatusTags() {
    const statusTags = document.querySelectorAll('.status-tag');
    statusTags.forEach(tag => {
        const status = tag.dataset.status;
        const translationKey = status.toLowerCase().replace(" ", "");
        tag.textContent = currentTranslations[translationKey] || currentTranslations[`status${status.charAt(0).toUpperCase() + status.slice(1)}`] || status;
    });
}

function updateLegend() {
    const legendItems = document.querySelectorAll('.legend-item .legend-text');
    const legendTexts = ['legendDeployed', 'legendInProgress', 'legendSigned'];
    legendItems.forEach((item, index) => {
        if (index < legendTexts.length) {
            item.textContent = currentTranslations[legendTexts[index]] || legendTexts[index].replace('legend', '');
        }
    });

    if (mapCustomization.useCustomLegendIcons) {
        legendItems.forEach((item, index) => {
            const status = ['Deployed', 'In Progress', 'Signed'][index];
            const iconUrl = mapCustomization.customLegendIconUrls[status];
            if (iconUrl) {
                const img = document.createElement('img');
                img.src = iconUrl;
                img.style.width = '20px';
                img.style.height = '20px';
                item.parentNode.querySelector('.legend-color').replaceWith(img);
            }
        });
    }
}

// Preferences Management
function savePreferences() {
    const preferences = {
        theme: darkMode ? 'dark' : 'light',
        language: document.getElementById('language-select')?.value,
        continent: document.getElementById('continent-select')?.value,
        country: document.getElementById('country-filter')?.value,
        city: document.getElementById('city-filter')?.value,
        activeStatus: activeStatus
    };
    localStorage.setItem('galeonMapPreferences', JSON.stringify(preferences));
}

function loadPreferences() {
    const savedPreferences = localStorage.getItem('galeonMapPreferences');
    if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        language = preferences.language || DEFAULT_LANGUAGE;
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.value = language;
        }

        darkMode = preferences.theme === 'dark';
        document.body.classList.toggle('dark-mode', darkMode);
        updateTileLayer();

        const continentSelect = document.getElementById('continent-select');
        if (continentSelect) {
            continentSelect.value = preferences.continent || '';
        }

        const countryFilter = document.getElementById('country-filter');
        if (countryFilter) {
            countryFilter.value = preferences.country || '';
        }

        const cityFilter = document.getElementById('city-filter');
        if (cityFilter) {
            cityFilter.value = preferences.city || '';
        }

        activeStatus = preferences.activeStatus || [];

        applyTranslations(language);
    } else {
        applyTranslations(DEFAULT_LANGUAGE);
    }
}

// Mobile Adjustments
function adjustForMobile() {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    const isLandscape = window.innerWidth > window.innerHeight;

    document.body.classList.toggle('landscape-mode', isMobile && isLandscape);

    adjustChartContainer(isMobile, isLandscape);
    adjustMapContainer(isMobile, isLandscape);
    adjustLegendContainer(isMobile, isLandscape);
    adjustPopupOptions();
    adjustGauges(isMobile);

    if (map) {
        map.invalidateSize();
    }
}

function adjustChartContainer(isMobile, isLandscape) {
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        const style = {
            flexDirection: 'row',
            maxWidth: '350px',
            width: 'auto',
            bottom: '10px'
        };

        if (isMobile) {
            if (isLandscape) {
                Object.assign(style, { right: '10px', left: 'auto', transform: 'none' });
            } else {
                Object.assign(style, { right: 'auto', left: '50%', transform: 'translateX(-50%)' });
            }
        } else {
            Object.assign(style, { right: '10px', left: 'auto', transform: 'none' });
        }

        Object.assign(chartContainer.style, style);
    }
}

function adjustMapContainer(isMobile, isLandscape) {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        if (isMobile && isLandscape) {
            mapContainer.style.height = '100%';
            mapContainer.style.width = '100%';
        } else {
            mapContainer.style.height = '';
            mapContainer.style.width = '';
        }
    }
}

function adjustLegendContainer(isMobile, isLandscape) {
    const legendContainer = document.querySelector('.legend-container');
    const legendToggle = document.getElementById('legend-toggle');

    if (legendContainer) {
        legendContainer.style.display = 'block';
    }

    if (legendToggle) {
        if (isMobile) {
            Object.assign(legendToggle.style, {
                top: '140px',
                left: '9px',
                bottom: 'auto'
            });
        } else {
            Object.assign(legendToggle.style, {
                top: '',
                left: '',
                bottom: ''
            });
        }
    }
}

function adjustGauges(isMobile) {
    const gauges = document.querySelectorAll('.gauge');
    const gaugeTexts = document.querySelectorAll('.gauge-value, .gauge-percentage, .gauge-label');

    if (isMobile) {
        gauges.forEach(gauge => {
            gauge.style.width = '60px';
            gauge.style.height = '60px';
        });
        gaugeTexts.forEach(text => {
            text.style.fontSize = '12px';
        });
    } else {
        gauges.forEach(gauge => {
            gauge.style.width = '';
            gauge.style.height = '';
        });
        gaugeTexts.forEach(text => {
            text.style.fontSize = '';
        });
    }
}

function adjustPopupOptions() {
    const isLandscape = window.innerWidth > window.innerHeight;
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

    if (isMobile && isLandscape) {
        L.Popup.prototype.options.autoPan = false;
        L.Popup.prototype.options.closeOnClick = false;
    } else {
        L.Popup.prototype.options.autoPan = true;
        L.Popup.prototype.options.closeOnClick = true;
    }
}

// Accessibility Enhancements
function enhanceAccessibility() {
    const elements = {
        languageSelect: document.getElementById('language-select'),
        continentSelect: document.getElementById('continent-select'),
        countryFilter: document.getElementById('country-filter'),
        cityFilter: document.getElementById('city-filter'),
        hospitalSearch: document.getElementById('hospital-search')
    };

    for (const [key, element] of Object.entries(elements)) {
        if (element) {
            element.setAttribute('aria-label', `${key.replace(/([A-Z])/g, ' $1').trim()}`);
        }
    }

    const statusTags = document.querySelectorAll('.status-tag');
    statusTags.forEach(tag => {
        tag.setAttribute('role', 'button');
        tag.setAttribute('aria-pressed', 'false');
        tag.addEventListener('click', () => {
            const isPressed = tag.getAttribute('aria-pressed') === 'true';
            tag.setAttribute('aria-pressed', (!isPressed).toString());
        });
    });
}

// Error Handling
function handleError(error, userMessage) {
    console.error('Error:', error);
    const errorMessageElement = document.getElementById('error-message');
    if (errorMessageElement) {
        errorMessageElement.textContent = userMessage || 'An error occurred. Please try again.';
        errorMessageElement.style.display = 'block';
        setTimeout(() => {
            errorMessageElement.style.display = 'none';
        }, 5000);
    }
}

// Initialization
function initGauges() {
    ['Deployed', 'In Progress', 'Signed'].forEach(initGauge);
}

function initGauge(status) {
    const element = document.getElementById(`${status.toLowerCase().replace(' ', '-')}-progress`);
    if (element) {
        const svg = element.querySelector('svg');
        const valueContainer = element.querySelector('.gauge-value');

        if (svg && valueContainer) {
            gauges[status] = {
                path: svg.querySelector(`path[stroke="${colors[status]}"]`),
                element: element,
                valueContainer: valueContainer
            };
        }
    }
}

function initStatusTags() {
    document.querySelectorAll('.status-tag').forEach(tag => {
        tag.removeEventListener('click', handleStatusTagClick);
        tag.addEventListener('click', handleStatusTagClick);
    });
}

function filterHospitals(status) {
    if (!status) return;

    const statusLower = status.toLowerCase();
    const index = activeStatus.findIndex(s => s.toLowerCase() === statusLower);

    if (index > -1) {
        activeStatus.splice(index, 1);
    } else {
        activeStatus.push(status);
    }

    updateStatusTagsVisually();
    document.dispatchEvent(new Event('mapUpdate'));
    savePreferences();
    console.log('Active statuses:', activeStatus);
}

// Main Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (!isInitialized) {
        initApplication();
    }
});

// Export functions for potential use in other modules
export {
    initApplication,
    updateCustomization,
    filterCountries,
    toggleTheme,
    toggleLegend,
    toggleMenu
};