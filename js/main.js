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

const IMAGE_LOADING_STATES = {
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error'
};

const DEFAULT_IMAGE = 'images/default-hospital.png';

const STATUS_MAP = {
    'Deployed': 'deployed',
    'In Progress': 'inProgress',
    'Signed': 'signed'
};

const REVERSE_STATUS_MAP = {
    'deployed': 'Deployed',
    'inProgress': 'In Progress',
    'signed': 'Signed'
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
/**
 * Debounces a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} - The debounced function
 */
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

/**
 * Debounced marker update with optimized timing
 */
const debouncedUpdateMarkers = debounce(() => {
    requestAnimationFrame(() => {
        const startTime = performance.now();
        updateMarkers().then(() => {
            const duration = performance.now() - startTime;
            console.log(`Markers update took ${duration.toFixed(2)}ms`);
        });
    });
}, 150);

/**
 * Main initialization function
 * @async
 * @throws {Error} If initialization fails
 */
async function initApplication() {
    if (isInitialized) {
        console.log('Application already initialized. Skipping initialization.');
        return;
    }

    console.log('Starting application initialization...');

    try {
        // Check required elements and data
        checkRequiredElements();
        checkRequiredData();

        // Initialize map
        console.log('Initializing map...');
        initMap();

        // Load GeoJSON data
        console.log('Loading GeoJSON data...');
        await loadGeoJSONData();

        // Initialize UI components
        console.log('Initializing UI components...');
        initGauges();
        initStatusTags();

        // Load user preferences
        console.log('Loading user preferences...');
        loadPreferences();

        // Apply translations
        console.log('Applying translations...');
        await applyTranslations(language);

        // Add markers
        console.log('Adding markers...');
        await addMarkers();

        // Set up event listeners
        console.log('Setting up event listeners...');
        addEventListeners();

        // Adjust for mobile devices
        console.log('Adjusting for mobile devices...');
        adjustForMobile();

        // Update UI elements
        console.log('Updating UI elements...');
        updateGauges();
        updateTileLayer();
        updateStatusTagsVisually();

        // Apply map customization
        console.log('Applying map customization...');
        applyMapCustomization();

        // Enhance accessibility
        console.log('Enhancing accessibility...');
        enhanceAccessibility();

        // Initialize hospital search
        console.log('Initializing hospital search...');
        initHospitalSearch();

        // Show controls
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.style.display = 'block';
        } else {
            console.warn('Controls element not found');
        }

        // Delayed marker update
        console.log('Scheduling delayed marker update...');
        setTimeout(() => {
            updateMarkers();
        }, 100);

        isInitialized = true;
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        handleError(error, 'An error occurred during initialization. Please refresh the page or contact support.');
        throw error;  // Re-throw the error for higher-level error handling
    }
}

/**
 * Checks if all required DOM elements are present
 * @throws {Error} If a required element is missing
 */
function checkRequiredElements() {
    console.log('Checking required elements...');
    const requiredElements = ['map', 'continent-select', 'country-filter', 'city-filter', 'hospital-search'];
    for (const elementId of requiredElements) {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Required element #${elementId} not found in the DOM`);
        }
    }
    console.log('All required elements found');
}

/**
 * Checks if required data is available
 * @throws {Error} If required data is missing or invalid
 */
function checkRequiredData() {
    console.log('Checking required data...');
    if (!hospitals || !Array.isArray(hospitals) || hospitals.length === 0) {
        throw new Error('Hospitals data is missing or invalid');
    }
    if (!translations || typeof translations !== 'object') {
        throw new Error('Translations data is missing or invalid');
    }
    console.log('All required data is valid');
}

// Map Initialization and Update Functions
/**
 * Initializes the map
 */
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

/**
 * Updates the map tile layer based on the current theme
 */
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
/**
 * Adds markers to the map
 * @async
 */
async function addMarkers() {
    if (markersAdded) {
        console.log('Markers already added. Updating existing markers.');
        await updateMarkers();
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

        await updateMarkersInChunks(hospitals);

        markersAdded = true;
    } catch (error) {
        console.error('Error in addMarkers:', error);
        handleError(error, 'An error occurred while adding markers to the map. Please check the console for more details.');
    }
}

/**
 * Updates markers in chunks to improve performance
 * @param {Array} hospitals - Array of hospital data
 * @param {number} [chunkSize=5] - Number of markers to process in each chunk
 * @returns {Promise} A promise that resolves when all markers are processed
 */
function updateMarkersInChunks(hospitals, chunkSize = 5) {
    return new Promise((resolve) => {
        const chunks = [];
        for (let i = 0; i < hospitals.length; i += chunkSize) {
            chunks.push(hospitals.slice(i, i + chunkSize));
        }

        let currentChunk = 0;
        let createdMarkers = 0;

        function processNextChunk() {
            if (currentChunk >= chunks.length) {
                console.log(`Total markers created: ${createdMarkers}`);
                resolve();
                return;
            }

            const startTime = performance.now();
            
            chunks[currentChunk].forEach(hospital => {
                const marker = createMarker(hospital);
                markers.push(marker);
                createdMarkers++;
            });

            currentChunk++;

            const processingTime = performance.now() - startTime;
            if (processingTime < 16 && currentChunk < chunks.length) {
                processNextChunk();
            } else {
                requestAnimationFrame(processNextChunk);
            }
        }

        requestAnimationFrame(processNextChunk);
    });
}

/**
 * Creates a marker for a hospital
 * @param {Object} hospital - Hospital data
 * @returns {L.Marker} Leaflet marker object
 */
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

    marker.on('popupopen', function() {
        initPopupImageLoading(this.getPopup().getElement());
    });

    return marker;
}

/**
 * Updates existing markers based on current filters
 * @async
 */
async function updateMarkers() {
    if (!hospitals || hospitals.length === 0) {
        console.log('No hospital data available yet. Skipping marker update.');
        return;
    }

    const filters = getFilters();
    const bounds = L.latLngBounds();
    let visibleMarkers = 0;

    const markersToUpdate = markers.map(marker => {
        const hospital = marker.hospitalData;
        const { city, country } = extractLocationInfo(hospital.address);
        const shouldShow = markerMatchesFilters(hospital, filters, city, country);
        
        if (shouldShow) {
            bounds.extend(marker.getLatLng());
            visibleMarkers++;
        }

        return {
            marker,
            shouldShow
        };
    });

    const BATCH_SIZE = 10;
    for (let i = 0; i < markersToUpdate.length; i += BATCH_SIZE) {
        const batch = markersToUpdate.slice(i, i + BATCH_SIZE);
        
        requestAnimationFrame(() => {
            batch.forEach(({ marker, shouldShow }) => {
                if (shouldShow && !markerClusterGroup.hasLayer(marker)) {
                    markerClusterGroup.addLayer(marker);
                } else if (!shouldShow && markerClusterGroup.hasLayer(marker)) {
                    markerClusterGroup.removeLayer(marker);
                }
            });
        });

        if (i + BATCH_SIZE < markersToUpdate.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    updateGauges();
    updateNoHospitalsMessage(visibleMarkers);

    if (visibleMarkers === 0) {
        map.setView([50, 10], 4);
    } else if (!map.getBounds().intersects(bounds)) {
        requestAnimationFrame(() => {
            map.fitBounds(bounds, { 
                padding: [50, 50], 
                maxZoom: map.getZoom(),
                duration: 0.5
            });
        });
    }
}

// Filter and Search Functions
/**
 * Gets current filter values
 * @returns {Object} Current filter values
 */
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
    const statusMatch = activeStatus.length === 0 || 
                       activeStatus.some(s => s.toLowerCase() === hospital.status.toLowerCase() ||
                                            STATUS_MAP[s] === hospital.status.toLowerCase());
    
    const continentMatch = !filters.continent || getContinent(hospital.lat, hospital.lon) === filters.continent;
    const countryMatch = !filters.country || country.toLowerCase().includes(filters.country.toLowerCase());
    const cityMatch = !filters.city || (city && city.toLowerCase().includes(filters.city.toLowerCase()));
    const searchMatch = !filters.searchTerm || hospital.name.toLowerCase().includes(filters.searchTerm.toLowerCase());

    return statusMatch && continentMatch && countryMatch && cityMatch && searchMatch;
}

/**
 * Gets normalized status
 * @param {string} status - Status to normalize
 * @returns {string} Normalized status
 */
function getNormalizedStatus(status) {
    if (STATUS_MAP[status]) {
        return STATUS_MAP[status];
    }
    if (REVERSE_STATUS_MAP[status.toLowerCase()]) {
        return REVERSE_STATUS_MAP[status.toLowerCase()];
    }
    return status;
}

/**
 * Handles filter changes
 */
function handleFilterChange() {
    debouncedUpdateMarkers();
    savePreferences();
}

/**
 * Initializes hospital search functionality
 */
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
/**
 * Adds event listeners to various elements
 */
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
            element.addEventListener(event, handler);
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

    document.addEventListener('mapUpdate', debouncedUpdateMarkers);

    console.log('Event listeners added successfully');
}

/**
 * Handles language change
 * @param {Event} event - The change event
 */
async function handleLanguageChange(event) {
    const newLanguage = event.target.value;
    language = newLanguage;
    
    // Wait for translations to be loaded and applied
    await applyTranslations(newLanguage);
    
    // Update UI elements
    updateAllUI();
    savePreferences();
}

/**
 * Updates all UI elements that need translation
 */
function updateAllUI() {
    console.log('Updating all UI elements');
    updatePlaceholders();
    updateContinentSelect();
    updateGaugeLabels();
    updateStatusTags();
    updateLegend();
    updateAllPopups();
    updateMarkers();
}


/**
 * Updates all popups with optimized image loading
 */
function updateAllPopups() {
    console.log('Updating all popups');
    
    const BATCH_SIZE = 5;
    let currentBatch = 0;
    
    function processNextBatch() {
        const start = currentBatch * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, markers.length);
        
        for (let i = start; i < end; i++) {
            const marker = markers[i];
            if (marker?.getPopup()) {
                const hospital = marker.hospitalData;
                if (hospital) {
                    const popup = marker.getPopup();
                    const newContent = createPopupContent(hospital);
                    popup.setContent(newContent);
                    
                    if (popup.isOpen()) {
                        popup.update();
                        initPopupImageLoading(popup.getElement());
                    }
                }
            }
        }

        currentBatch++;
        
        if (end < markers.length) {
            requestAnimationFrame(processNextBatch);
        }
    }

    requestAnimationFrame(processNextBatch);
}

/**
 * Initializes image loading for popup with improved error handling and state management
 * @param {HTMLElement} popupElement - The popup DOM element
 */
function initPopupImageLoading(popupElement) {
    if (!popupElement) return;

    const img = popupElement.querySelector('.popup-image');
    if (!img || !img.dataset.src) return;

    const actualSrc = img.dataset.src;
    if (!actualSrc) return;

    // Keep track of the current loading state
    const loadingState = img.getAttribute('data-loading-state');
    if (loadingState === IMAGE_LOADING_STATES.SUCCESS) return;

    // Create an image loader
    const imageLoader = new Image();
    
    imageLoader.onload = () => {
        requestAnimationFrame(() => {
            if (img.parentElement) { // Check if image is still in DOM
                img.src = actualSrc;
                img.setAttribute('data-loading-state', IMAGE_LOADING_STATES.SUCCESS);
            }
        });
    };

    imageLoader.onerror = () => {
        requestAnimationFrame(() => {
            if (img.parentElement) { // Check if image is still in DOM
                img.src = DEFAULT_IMAGE;
                img.setAttribute('data-loading-state', IMAGE_LOADING_STATES.ERROR);
            }
        });
    };

    // Start loading only if we're not already in a loading state
    if (loadingState !== IMAGE_LOADING_STATES.LOADING) {
        img.setAttribute('data-loading-state', IMAGE_LOADING_STATES.LOADING);
        imageLoader.src = actualSrc;
    }
}

/**
 * Updates map controls based on screen size
 */
function updateMapControls() {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    if (isMobile && map.zoomControl) {
        map.zoomControl.remove();
    } else if (!isMobile && !map.zoomControl) {
        map.zoomControl = new L.Control.Zoom();
        map.addControl(map.zoomControl);
    }
}

/**
 * Handles status tag click
 * @param {Event} event - The click event
 */
function handleStatusTagClick(event) {
    const status = event.target.dataset.status;
    if (status) {
        filterHospitals(status);
        document.dispatchEvent(new Event('mapUpdate'));
    } else {
        console.warn('Status tag clicked without a status attribute:', event.target);
    }
}

/**
 * Handles map click
 */
function handleMapClick() {
    markerClusterGroup.eachLayer(function (layer) {
        if (layer instanceof L.Marker) {
            layer.closePopup();
        }
    });
}

// UI Update Functions
/**
 * Updates status tags visually with proper status attributes
 */
function updateStatusTagsVisually() {
    document.querySelectorAll('.status-tag').forEach(tag => {
        const status = tag.dataset.status;
        if (status) {
            const isActive = activeStatus.includes(status);
            tag.classList.toggle('active', isActive);
            tag.setAttribute('aria-pressed', isActive.toString());
        } else {
            // Instead of just warning, attempt to fix the tag
            const statusFromClass = tag.className.match(/status-(\w+)/);
            if (statusFromClass) {
                const derivedStatus = getOriginalStatus(statusFromClass[1]);
                if (derivedStatus) {
                    tag.setAttribute('data-status', derivedStatus);
                    const isActive = activeStatus.includes(derivedStatus);
                    tag.classList.toggle('active', isActive);
                    tag.setAttribute('aria-pressed', isActive.toString());
                }
            } else {
                console.warn('Status tag found without status class:', tag);
            }
        }
    });
}

/**
 * Updates the "No hospitals" message
 * @param {number} visibleMarkers - Number of visible markers
 */
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

/**
 * Updates the gauges with current data
 */
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
/**
 * Applies map customization
 */
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

/**
 * Updates map customization
 * @param {Object} newCustomization - New customization settings
 */
function updateCustomization(newCustomization) {
    Object.assign(mapCustomization, newCustomization);
    applyMapCustomization();
}

/**
 * Toggles dark mode
 */
function toggleTheme() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode');
    updateTileLayer();
    savePreferences();
}

/**
 * Toggles legend visibility
 */
function toggleLegend() {
    const legendContainer = document.querySelector('.legend-container');
    if (legendContainer) {
        legendContainer.style.display = legendContainer.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Toggles menu visibility
 */
function toggleMenu() {
    const controls = document.querySelector('.controls');
    if (controls) {
        controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
    }
}

// Data Processing Functions
/**
 * Loads GeoJSON data
 * @async
 */
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

/**
 * Filters countries based on a list
 * @param {Object} countriesData - GeoJSON data of countries
 * @param {Array} countriesToShow - List of countries to show
 * @returns {Object} Filtered GeoJSON data
 */
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
    const postalCodeMatch = parts[parts.length - 1]?.match(/\b[A-Z0-9]{5,10}\b/i);
    if (postalCodeMatch) {
        postalCode = postalCodeMatch[0];
        parts[parts.length - 1] = parts[parts.length - 1].replace(postalCode, '').trim();
    }

    // Extract city (assumed to be the last remaining part)
    if (parts.length > 0) {
        city = parts.pop();
    }

    // The remaining parts form the street address
    street = parts.join(', ');

    // Clean up any remaining commas
    [street, city, state, country] = [street, city, state, country].map(s => s.replace(/^,\s*|,\s*$/g, ''));

    console.log(`Extracted location info: City: ${city}, Country: ${country}`);

    return { street, city, state, country, postalCode };
}

/**
 * Determines the continent based on coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} Continent name
 */
function getContinent(lat, lon) {
    if (lat > 35 && lat < 71 && lon > -25 && lon < 40) return "Europe";
    if (lat > -35 && lat < 37 && lon > -20 && lon < 60) return "Africa";
    if (lat > -10 && lat < 55 && lon > 25 && lon < 180) return "Asia";
    if (lat > -50 && lat < 0 && lon > 110 && lon < 180) return "Oceania";
    if (lat > 15 && lat < 72 && lon > -170 && lon < -40) return "North America";
    if (lat > -57 && lat < 15 && lon > -110 && lon < -35) return "South America";
    return "Unknown";
}

/**
 * Gets color based on status
 * @param {string} status - Hospital status
 * @returns {string} Color code
 */
function getColor(status) {
    return colors[status] || '#6c757d';
}

/**
 * Creates popup content for a hospital with proper status tags
 * @param {Object} hospital - Hospital data
 * @returns {string} HTML content for the popup
 */
function createPopupContent(hospital) {
    const isLandscape = window.innerWidth > window.innerHeight;
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    const popupClass = isMobile && isLandscape ? 'popup-content mobile-landscape' : 'popup-content';

    const translatedStatus = getTranslatedStatus(hospital.status);
    const statusTag = getStatusTag(hospital.status, activeStatus.includes(hospital.status));

    return `
    <div class="${popupClass}">
        <h3 class="popup-title">${hospital.name}</h3>
        <div class="popup-image-wrapper">
            <img 
                src="images/default-hospital.png"
                data-src="${hospital.imageUrl}" 
                alt="${hospital.name}"
                class="popup-image"
                data-loading-state="loading"
            />
        </div>
        <div class="popup-address">
            <strong>${currentTranslations.address || 'Address'}:</strong><br>
            ${hospital.address}
        </div>
        <a href="${hospital.website}" target="_blank" rel="noopener noreferrer" class="popup-link">
            ${currentTranslations.visitWebsite || 'Visit Website'}
        </a>
        <div class="popup-status">
            <span>${currentTranslations.status || 'Status'}:</span>
            ${statusTag}
        </div>
    </div>
    `;
}

/**
 * Gets translated status from mapped key
 * @param {string} status - Original status
 * @returns {string} Translated status
 */
function getTranslatedStatus(status) {
    if (!status) return '';

    const statusMap = {
        'Deployed': 'deployed',
        'In Progress': 'inprogress',
        'Signed': 'signed'
    };

    const translationKey = statusMap[status];
    
    if (!translationKey) {
        console.warn(`Unknown status: ${status}`);
        return status;
    }

    return currentTranslations[translationKey] || status;
}

/**
 * Gets mapped key from status
 * @param {string} status - Status to map
 * @returns {string} Mapped key
 */
function getMappedStatus(status) {
    const statusMap = {
        'Deployed': 'deployed',
        'In Progress': 'inprogress',
        'Signed': 'signed'
    };
    
    return statusMap[status] || status.toLowerCase();
}

/**
 * Gets original status from mapped key
 * @param {string} key - Mapped key
 * @returns {string} Original status
 */
function getOriginalStatus(key) {
    const reverseMap = {
        'deployed': 'Deployed',
        'inprogress': 'In Progress',
        'signed': 'Signed'
    };
    
    return reverseMap[key] || key;
}

/**
 * Gets status tag HTML with proper data attributes
 * @param {string} status - Hospital status
 * @param {boolean} isActive - Whether the status is active
 * @returns {string} HTML for the status tag
 */
function getStatusTag(status, isActive = false) {
    if (!status) {
        console.warn('Attempted to create status tag without status');
        return '';
    }
    
    const statusKey = getMappedStatus(status);
    const translatedStatus = currentTranslations[statusKey] || status;
    const activeClass = isActive ? ' active' : '';
    const statusClass = status.toLowerCase().replace(/\s+/g, "-");
    
    let tagContent = '';
    if (mapCustomization.useCustomStatusIcons && mapCustomization.customStatusIconUrls[status]) {
        tagContent = `<img src="${mapCustomization.customStatusIconUrls[status]}" alt="${translatedStatus}" style="width:20px;height:20px;margin-right:5px;">${translatedStatus}`;
    } else {
        tagContent = translatedStatus;
    }

    return `<span class="status-tag status-${statusClass}${activeClass}" 
                 data-status="${status}"
                 role="button" 
                 aria-pressed="${isActive}">${tagContent}</span>`;
}

/**
 * Applies translations and returns a promise when completed
 * @param {string} lang - Language code
 * @returns {Promise} Promise that resolves when translations are applied
 */
async function applyTranslations(lang) {
    return new Promise((resolve) => {
        console.log('Applying translations for language:', lang);
        currentTranslations = translations[lang] || translations[DEFAULT_LANGUAGE];
        
        // Update all translatable elements
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (currentTranslations[key]) {
                element.textContent = currentTranslations[key];
            }
        });

        resolve();
    });
}

/**
 * Updates placeholders with translated text
 */
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

/**
 * Updates continent select options with translated text
 */
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

/**
 * Updates gauge labels with translated text
 */
function updateGaugeLabels() {
    const gaugeLabels = document.querySelectorAll('.gauge-label');
    const labelTexts = ['gaugesDeployed', 'gaugesInProgress', 'gaugesSigned'];
    gaugeLabels.forEach((label, index) => {
        if (index < labelTexts.length) {
            label.textContent = currentTranslations[labelTexts[index]] || labelTexts[index].replace('gauges', '');
        }
    });
}

/**
 * Updates status tags with proper data attributes
 */
function updateStatusTags() {
    const statusList = Object.keys(STATUS_MAP);
    
    document.querySelectorAll('.status-tag').forEach(tag => {
        const status = tag.dataset.status || tag.textContent.trim();
        const normalizedStatus = getNormalizedStatus(status);
        
        if (statusList.includes(normalizedStatus)) {
            const isActive = activeStatus.includes(normalizedStatus);
            const newTag = getStatusTag(normalizedStatus, isActive);
            tag.outerHTML = newTag;
        }
    });
}

/**
 * Updates legend with translated text and custom icons if applicable
 */
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
                const colorElement = item.parentNode.querySelector('.legend-color');
                if (colorElement) {
                    colorElement.replaceWith(img);
                }
            }
        });
    }
}

// Preferences Management
/**
 * Saves user preferences to localStorage
 */
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

/**
 * Loads user preferences from localStorage
 */
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
        updateAllUI();
    } else {
        applyTranslations(DEFAULT_LANGUAGE);
    }
}

// Mobile Adjustments
/**
 * Adjusts the layout for mobile devices
 */
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

/**
 * Adjusts the chart container for different screen sizes
 * @param {boolean} isMobile - Whether the device is mobile
 * @param {boolean} isLandscape - Whether the device is in landscape mode
 */
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

/**
 * Adjusts the map container for different screen sizes
 * @param {boolean} isMobile - Whether the device is mobile
 * @param {boolean} isLandscape - Whether the device is in landscape mode
 */
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

/**
 * Adjusts the legend container for different screen sizes
 * @param {boolean} isMobile - Whether the device is mobile
 */
function adjustLegendContainer(isMobile) {
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

/**
 * Adjusts gauges for mobile devices
 * @param {boolean} isMobile - Whether the device is mobile
 */
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

/**
 * Adjusts popup options for mobile devices
 */
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
/**
 * Enhances accessibility of various UI elements
 */
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
/**
 * Handles errors and displays them to the user
 * @param {Error} error - The error object
 * @param {string} userMessage - The message to display to the user
 */
function handleError(error, userMessage) {
    console.error('Initialization error:', error);
    const errorMessageElement = document.getElementById('error-message');
    if (errorMessageElement) {
        errorMessageElement.textContent = userMessage;
        errorMessageElement.style.display = 'block';
        setTimeout(() => {
            errorMessageElement.style.display = 'none';
        }, 5000);
    } else {
        alert(userMessage);
    }
}

// Initialization
/**
 * Initializes gauges
 */
function initGauges() {
    ['Deployed', 'In Progress', 'Signed'].forEach(initGauge);
}

/**
 * Initializes a single gauge
 * @param {string} status - The status for the gauge
 */
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

/**
 * Initializes status tags with proper attributes
 */
function initStatusTags() {
    let statusContainer = document.querySelector('.status-tags-container');
    if (!statusContainer) {
        statusContainer = document.createElement('div');
        statusContainer.className = 'status-tags-container';
        document.querySelector('.controls')?.appendChild(statusContainer);
    }

    const statuses = Object.keys(STATUS_MAP); // ['Deployed', 'In Progress', 'Signed']
    statusContainer.innerHTML = statuses
        .map(status => getStatusTag(status, activeStatus.includes(status)))
        .join('');

    document.querySelectorAll('.status-tag').forEach(tag => {
        tag.removeEventListener('click', handleStatusTagClick);
        tag.addEventListener('click', handleStatusTagClick);
    });
}

/**
 * Filters hospitals based on status with proper error handling
 * @param {string} status - The status to filter by
 */
function filterHospitals(status) {
    if (!status) {
        console.warn('Attempted to filter with empty status');
        return;
    }

    const normalizedStatus = getNormalizedStatus(status);
    const index = activeStatus.findIndex(s => getNormalizedStatus(s) === normalizedStatus);

    if (index > -1) {
        activeStatus.splice(index, 1);
    } else {
        activeStatus.push(normalizedStatus);
    }

    updateStatusTagsVisually();
    document.dispatchEvent(new Event('mapUpdate'));
    savePreferences();
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