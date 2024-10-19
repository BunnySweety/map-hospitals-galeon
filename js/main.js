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

// Function to load GeoJSON data
async function loadGeoJSONData() {
    try {
        const response = await fetch('data/countries.geojson');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        window.countriesData = await response.json();
        console.log('GeoJSON data loaded successfully');
    } catch (error) {
        console.error('Error loading GeoJSON data:', error);
        handleError(error, 'Failed to load map data. Some features may not be available.');
    }
}

// Main initialization function
async function initApplication() {
    if (isInitialized) {
        console.log('Application already initialized. Skipping initialization.');
        return;
    }

    console.log('Initializing application...');

    try {
        // Check for necessary DOM elements
        const requiredElements = ['map', 'continent-select', 'country-filter', 'city-filter', 'hospital-search'];
        for (const elementId of requiredElements) {
            if (!document.getElementById(elementId)) {
                throw new Error(`Required element #${elementId} not found in the DOM`);
            }
        }

        // Check for necessary data
        if (!hospitals || !Array.isArray(hospitals) || hospitals.length === 0) {
            throw new Error('Hospitals data is missing or invalid');
        }
        if (!translations || typeof translations !== 'object') {
            throw new Error('Translations data is missing or invalid');
        }

        // Initialize the map
        initMap();

        // Load GeoJSON data
        await loadGeoJSONData();
        if (window.countriesData) {
            applyMapCustomization();
        }

        // Initialize gauges
        initGauges();

        // Initialize status tags
        initStatusTags();

        // Load user preferences
        loadPreferences();

        // Apply translations
        applyTranslations(language);

        // Add hospital markers
        addMarkers();

        // Add event listeners
        addEventListeners();

        // Adjust for mobile devices
        adjustForMobile();

        // Update gauges
        updateGauges();

        // Update tile layer
        updateTileLayer();

        // Display controls
        document.querySelector('.controls').style.display = 'block';

        // Update status tags visually
        updateStatusTagsVisually();

        // Apply map customization
        applyMapCustomization();

        // Enhance accessibility
        enhanceAccessibility();

        // Initialize hospital search
        initHospitalSearch();

        isInitialized = true;
        console.log('Application initialized successfully');

    } catch (error) {
        console.error('Error during initialization:', error);
        handleError(error, 'An error occurred during initialization. Please refresh the page or contact support.');
    }
}

// Initialize map
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

        // Create new panes for better layer control
        map.createPane('borderPane');
        map.getPane('borderPane').style.zIndex = 400;
        map.createPane('markerPane');
        map.getPane('markerPane').style.zIndex = 450;

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

// Initialize gauges
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

// Update gauges
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

// Initialize status tags
function initStatusTags() {
    document.querySelectorAll('.status-tag').forEach(tag => {
        tag.removeEventListener('click', handleStatusTagClick);
        tag.addEventListener('click', handleStatusTagClick);
    });
}

// Handle status tag click
function handleStatusTagClick(event) {
    const status = event.target.dataset.status;
    filterHospitals(status);
}

// Filter hospitals based on status
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
    debouncedUpdateMarkers();
    savePreferences();
    console.log('Active statuses:', activeStatus);
}

// Update status tags visually
function updateStatusTagsVisually() {
    document.querySelectorAll('.status-tag').forEach(tag => {
        const status = tag.dataset.status;
        const isActive = activeStatus.some(s => s.toLowerCase() === status.toLowerCase());
        tag.classList.toggle('active', isActive);
        // Update aria-pressed for accessibility
        tag.setAttribute('aria-pressed', isActive.toString());
    });
    console.log('Status tags updated visually');
}

// Add markers to the map
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

// Update markers in chunks to improve performance
function updateMarkersInChunks(hospitals, chunkSize = 5) {
    let index = 0;
    let createdMarkers = 0;

    function processChunk() {
        const chunk = hospitals.slice(index, index + chunkSize);
        chunk.forEach(hospital => {
            const { city, country } = extractLocationInfo(hospital.address);
            const marker = createMarker(hospital);
            markers.push(marker);
            createdMarkers++;
        });
        index += chunkSize;
        if (index < hospitals.length) {
            setTimeout(processChunk, 16); // Use 16ms timeout to aim for 60fps
        } else {
            console.log(`Total markers created: ${createdMarkers}`);
            console.log('All markers processed');
            updateMarkers();
        }
    }

    processChunk();
}

// Create a marker for a hospital
function createMarker(hospital) {
    let marker;
    const markerOptions = {
        pane: 'markerPane'
    };

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
        autoPan: false
    });

    marker.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        markerClusterGroup.eachLayer(function (layer) {
            if (layer instanceof L.CircleMarker && layer !== marker) {
                layer.closePopup();
            }
        });
        this.openPopup();
    });

    return marker;
}

// Update existing markers
function updateMarkers() {
    if (!hospitals || hospitals.length === 0) {
        console.log('No hospital data available yet. Skipping marker update.');
        return;
    }

    console.log('Updating existing markers');
    const filters = {
        continent: document.getElementById('continent-select')?.value || '',
        country: document.getElementById('country-filter')?.value.toLowerCase() || '',
        city: document.getElementById('city-filter')?.value.toLowerCase() || '',
        searchTerm: document.getElementById('hospital-search')?.value.toLowerCase() || ''
    };

    let visibleMarkers = 0;
    const bounds = L.latLngBounds();

    markerClusterGroup.clearLayers();

    markers.forEach(marker => {
        const hospital = marker.hospitalData;
        const { city, country } = extractLocationInfo(hospital.address);

        if (markerMatchesFilters(hospital, filters, city, country)) {
            markerClusterGroup.addLayer(marker);
            bounds.extend(marker.getLatLng());
            visibleMarkers++;
        }
    });

    map.addLayer(markerClusterGroup);

    console.log(`Visible markers after update: ${visibleMarkers}`);
    updateGauges();
    updateNoHospitalsMessage(visibleMarkers);
    
    if (visibleMarkers > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        map.setView([50, 10], 4); // Default coordinates and zoom
    }

    console.log('Markers updated successfully');
}

// Helper function to check if a marker matches the current filters
function markerMatchesFilters(hospital, filters, city, country) {
    return (activeStatus.length === 0 || activeStatus.some(s => s.toLowerCase() === hospital.status.toLowerCase())) &&
        (!filters.continent || getContinent(hospital.lat, hospital.lon) === filters.continent) &&
        (!filters.country || country.toLowerCase().includes(filters.country)) &&
        (!filters.city || city.toLowerCase().includes(filters.city)) &&
        (!filters.searchTerm || hospital.name.toLowerCase().includes(filters.searchTerm));
}

// Helper function to update the "No hospitals" message
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

function updateMapView(visibleMarkers, bounds) {
    if (visibleMarkers > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        map.setView([50, 10], 4); // Default coordinates and zoom
    }
}

// Debounced update markers function
const debouncedUpdateMarkers = debounce(() => {
    updateMarkers();
}, 300);

// Adjust popup options
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

// Extract location info from address
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
    const postalCodeMatch = parts[parts.length - 1]?.match(/\b\d{5}(-\d{4})?\b/);
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

// Get continent based on coordinates
function getContinent(lat, lon) {
    if (lat > 35 && lat < 71 && lon > -25 && lon < 40) return "Europe";
    if (lat > -35 && lat < 37 && lon > -20 && lon < 60) return "Africa";
    if (lat > -10 && lat < 55 && lon > 25 && lon < 180) return "Asia";
    if (lat > -50 && lat < 0 && lon > 110 && lon < 180) return "Oceania";
    if (lat > 15 && lat < 72 && lon > -170 && lon < -40) return "North America";
    if (lat > -57 && lat < 15 && lon > -110 && lon < -35) return "South America";
    return "Unknown";
}

// Get color based on status
function getColor(status) {
    switch (status) {
        case 'Deployed': return '#28a745';
        case 'In Progress': return '#ffc107';
        case 'Signed': return '#007bff';
        default: return '#6c757d';
    }
}

// Create popup content
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

// Get status tag HTML
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

// Toggle theme
function toggleTheme() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode');
    updateTileLayer();
    savePreferences();
}

// Update tile layer
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

// Toggle legend
function toggleLegend() {
    const legendContainer = document.querySelector('.legend-container');
    legendContainer.style.display = legendContainer.style.display === 'none' ? 'block' : 'none';
}

// Toggle menu
function toggleMenu() {
    const controls = document.querySelector('.controls');
    controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
}

// Save preferences
function savePreferences() {
    const preferences = {
        theme: darkMode ? 'dark' : 'light',
        language: document.getElementById('language-select').value,
        continent: document.getElementById('continent-select').value,
        country: document.getElementById('country-filter').value,
        city: document.getElementById('city-filter').value,
        activeStatus: activeStatus
    };
    localStorage.setItem('galeonMapPreferences', JSON.stringify(preferences));
}

// Load preferences
function loadPreferences() {
    const savedPreferences = localStorage.getItem('galeonMapPreferences');
    if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        language = preferences.language || DEFAULT_LANGUAGE;
        document.getElementById('language-select').value = language;

        darkMode = preferences.theme === 'dark';
        document.body.classList.toggle('dark-mode', darkMode);
        updateTileLayer();

        document.getElementById('continent-select').value = preferences.continent || '';
        document.getElementById('country-filter').value = preferences.country || '';
        document.getElementById('city-filter').value = preferences.city || '';

        activeStatus = preferences.activeStatus || [];

        applyTranslations(language);
    } else {
        applyTranslations(DEFAULT_LANGUAGE);
    }
}

// Apply translations
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
    updateMarkers(); // To update the "No hospitals match" message
}

// Update placeholders
function updatePlaceholders() {
    const countryFilter = document.getElementById('country-filter');
    const cityFilter = document.getElementById('city-filter');
    const hospitalSearch = document.getElementById('hospital-search');
    if (countryFilter) countryFilter.setAttribute('placeholder', currentTranslations.enterCountry || 'Enter country...');
    if (cityFilter) cityFilter.setAttribute('placeholder', currentTranslations.enterCity || 'Enter city...');
    if (hospitalSearch) hospitalSearch.setAttribute('placeholder', currentTranslations.searchHospital || 'Search hospital...');
}

// Update legend
function updateLegend() {
    const legendItems = document.querySelectorAll('.legend-item .legend-text');
    if (legendItems.length >= 3) {
        legendItems[0].textContent = currentTranslations.legendDeployed || 'Deployed';
        legendItems[1].textContent = currentTranslations.legendInProgress || 'In Progress';
        legendItems[2].textContent = currentTranslations.legendSigned || 'Signed';
    }

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

// Update continent select
function updateContinentSelect() {
    const continentSelect = document.getElementById('continent-select');
    if (continentSelect) {
        continentSelect.options[0].text = currentTranslations.continent || 'Continent';
        const continentOptions = {
            'Europe': currentTranslations.europe || 'Europe',
            'North America': currentTranslations.northAmerica || 'North America',
            'South America': currentTranslations.southAmerica || 'South America',
            'Asia': currentTranslations.asia || 'Asia',
            'Africa': currentTranslations.africa || 'Africa',
            'Oceania': currentTranslations.oceania || 'Oceania'
        };
        for (let i = 1; i < continentSelect.options.length; i++) {
            const option = continentSelect.options[i];
            option.text = continentOptions[option.value] || option.value;
        }
    }
}

// Update gauge labels
function updateGaugeLabels() {
    const gaugeLabels = document.querySelectorAll('.gauge-label');
    if (gaugeLabels.length >= 3) {
        gaugeLabels[0].textContent = currentTranslations.gaugesDeployed || 'Deployed';
        gaugeLabels[1].textContent = currentTranslations.gaugesInProgress || 'In Progress';
        gaugeLabels[2].textContent = currentTranslations.gaugesSigned || 'Signed';
    }
}

// Update status tags
function updateStatusTags() {
    const statusTags = document.querySelectorAll('.status-tag');
    statusTags.forEach(tag => {
        const status = tag.dataset.status;
        let translatedText;
        switch (status) {
            case 'deployed':
                translatedText = currentTranslations.deployed || currentTranslations.statusDeployed || 'Deployed';
                break;
            case 'in progress':
                translatedText = currentTranslations.inProgress || currentTranslations.statusInProgress || 'In Progress';
                break;
            case 'signed':
                translatedText = currentTranslations.signed || currentTranslations.statusSigned || 'Signed';
                break;
            default:
                translatedText = status;
        }
        tag.textContent = translatedText;
    });
}

// Adjust for mobile
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

// Adjust chart container
function adjustChartContainer(isMobile, isLandscape) {
    const chartContainer = document.querySelector('.chart-container');
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

// Adjust map container
function adjustMapContainer(isMobile, isLandscape) {
    const mapContainer = document.getElementById('map');
    if (isMobile && isLandscape) {
        mapContainer.style.height = '100%';
        mapContainer.style.width = '100%';
    } else {
        mapContainer.style.height = '';
        mapContainer.style.width = '';
    }
}

// Adjust legend container
function adjustLegendContainer(isMobile, isLandscape) {
    const legendContainer = document.querySelector('.legend-container');
    const legendToggle = document.getElementById('legend-toggle');

    legendContainer.style.display = 'block';

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

// Adjust gauges
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

// Add event listeners
function addEventListeners() {
    window.addEventListener('load', () => {
        adjustForMobile();
        initApplication();
    });

    window.addEventListener('resize', debounce(() => {
        adjustForMobile();
        if (map) map.invalidateSize();
    
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        if (map) {
            if (isMobile && map.zoomControl) {
                map.zoomControl.remove();
            } else if (!isMobile && !map.zoomControl) {
                map.zoomControl = new L.Control.Zoom();
                map.addControl(map.zoomControl);
            }
        }
    }, 250));

    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            adjustForMobile();
            if (map) map.invalidateSize();
        }, 100);
    });

    document.getElementById('language-select').addEventListener('change', handleLanguageChange);
    document.getElementById('continent-select').addEventListener('change', handleContinentChange);
    document.querySelectorAll('#country-filter, #city-filter, #hospital-search').forEach(input => {
        input.addEventListener('input', debounce(handleFilterChange, 300));
    });

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('hamburger').addEventListener('click', toggleMenu);
    document.getElementById('legend-toggle').addEventListener('click', toggleLegend);

    // Add map click event listener
    map.on('click', handleMapClick);
}

// Handle language change
function handleLanguageChange() {
    const openPopups = [];
    map.eachLayer(function (layer) {
        if (layer instanceof L.CircleMarker && layer.isPopupOpen()) {
            openPopups.push({
                latlng: layer.getLatLng(),
                hospitalData: layer.hospitalData
            });
        }
    });

    applyTranslations(this.value);
    savePreferences();
    debouncedUpdateMarkers();

    markers.forEach(marker => {
        const newContent = createPopupContent(marker.hospitalData);
        marker.getPopup().setContent(newContent);
    });

    openPopups.forEach(popup => {
        const marker = findMarkerByLatLng(popup.latlng);
        if (marker) {
            marker.openPopup();
        }
    });
}

// Handle continent change
function handleContinentChange() {
    debouncedUpdateMarkers();
    updateMapView();
    savePreferences();
}

// Handle filter change
function handleFilterChange() {
    debouncedUpdateMarkers();
    updateMapView();
    savePreferences();
}

// Utility function: Debounce
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Utility function: Find marker by LatLng
function findMarkerByLatLng(latlng) {
    let foundMarker = null;
    markerClusterGroup.eachLayer(function (layer) {
        if (layer instanceof L.CircleMarker && layer.getLatLng().equals(latlng)) {
            foundMarker = layer;
        }
    });
    return foundMarker;
}

// Enhance accessibility
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

// Apply map customization
function applyMapCustomization() {
    // Apply background color
    document.getElementById('map').style.backgroundColor = mapCustomization.backgroundColor;

    // Update borders
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

    // Update labels
    const style = document.createElement('style');
    style.textContent = `.leaflet-marker-icon { color: ${mapCustomization.labelColor} !important; }`;
    document.head.appendChild(style);

    // Update markers
    updateMarkers();

    // Update legend
    updateLegend();

    // Update status tags
    updateStatusTags();
}

// Function to update customization
function updateCustomization(newCustomization) {
    Object.assign(mapCustomization, newCustomization);
    applyMapCustomization();
}

// Function to filter countries if needed
function filterCountries(countriesData, countriesToShow) {
    return {
        ...countriesData,
        features: countriesData.features.filter(feature =>
            countriesToShow.includes(feature.properties.ADMIN)
        )
    };
}

// Function to handle errors and display them to the user
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

// Function to handle map clicks
function handleMapClick(e) {
    markerClusterGroup.eachLayer(function (layer) {
        if (layer instanceof L.CircleMarker) {
            layer.closePopup();
        }
    });
}

// Initialize hospital search
function initHospitalSearch() {
    const searchInput = document.getElementById('hospital-search');
    if (!searchInput) {
        console.error('Hospital search input not found');
        return;
    }

    searchInput.addEventListener('input', debounce(() => {
        debouncedUpdateMarkers();
    }, 300));
}

// Initialize the application when the DOM is fully loaded
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