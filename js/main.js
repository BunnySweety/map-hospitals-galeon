// -----------------------------------------------------
// Configuration et variables globales
// -----------------------------------------------------

/**
 * Breakpoint for mobile devices in pixels
 * @constant {number}
 */
const MOBILE_BREAKPOINT = 1024;

/**
 * Default language code for the application
 * @constant {string}
 */
const DEFAULT_LANGUAGE = 'en';

/** @type {L.Map} Map instance */
let map;

/** @type {L.CircleMarker[]} Array of map markers */
let markers = [];

/** @type {string[]} Array of active status filters */
let activeStatus = [];

/** @type {string} Current language code */
let language = DEFAULT_LANGUAGE;

/** @type {boolean} Dark mode state */
let darkMode = false;

/** @type {L.MarkerClusterGroup} Marker cluster group instance */
let markerClusterGroup;

/** @type {Object.<string, string>} Current translations */
let currentTranslations = {};

/** @type {boolean} Whether markers have been added to the map */
let markersAdded = false;

/** @type {boolean} Whether the application has been initialized */
let isInitialized = false;

/** @type {Object.<string, Object>} Gauge elements and data */
const gauges = {};

/**
 * Color scheme for different statuses
 * @type {Object.<string, string>}
 */
const colors = {
    'Deployed': '#4CAF50',
    'In Progress': '#FFA500',
    'Signed': '#2196F3'
};

/**
 * Map customization configuration
 * @type {Object}
 */
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

// -----------------------------------------------------
// Fonctions utilitaires
// -----------------------------------------------------

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} The debounced function
 * @example
 * const debouncedSearch = debounce(() => performSearch(), 300);
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
 * Debounced version of updateMarkers function
 */
const debouncedUpdateMarkers = debounce(() => {
    requestAnimationFrame(updateMarkers);
}, 300);

/**
 * Normalizes a status string for translation lookup
 * @param {string} status - The status to normalize
 * @returns {string} Normalized status string
 * @example
 * normalizeStatusForTranslation('In Progress') // returns 'inprogress'
 */
function normalizeStatusForTranslation(status) {
    return status.toLowerCase().replace(/\s+/g, '');
}

/**
 * Normalizes a status string for comparison
 * @param {string} status - The status to normalize
 * @returns {string} Normalized status string
 */
function normalizeStatusForComparison(status) {
    return status.toLowerCase();
}

// -----------------------------------------------------
// Initialisation et vérifications
// -----------------------------------------------------

/**
 * Initializes the application
 * @async
 * @throws {Error} If initialization fails
 * @returns {Promise<void>}
 */
async function initApplication() {
    if (isInitialized) {
        console.log('Application already initialized');
        return;
    }

    console.log('Starting application initialization...');

    try {
        checkRequiredElements();
        checkRequiredData();

        initMap();
        await loadGeoJSONData();
        
        initGauges();
        initStatusTags();
        loadPreferences();
        await applyTranslations(language);
        await addMarkers();
        
        addEventListeners();
        adjustForMobile();
        
        updateGauges();
        updateTileLayer();
        updateStatusTagsVisually();
        applyMapCustomization();
        enhanceAccessibility();
        initHospitalSearch();

        const controls = document.querySelector('.controls');
        if (controls) {
            controls.style.display = 'block';
        }

        setTimeout(() => {
            updateMarkers();
        }, 100);

        isInitialized = true;
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        handleError(error, 'An error occurred during initialization. Please refresh the page or contact support.');
        throw error;
    }
}

/**
 * Checks if all required DOM elements are present
 * @throws {Error} If any required element is missing
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
}

/**
 * Checks if required data is available and valid
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
}

// -----------------------------------------------------
// Gestion de la carte
// -----------------------------------------------------

/**
 * Initializes the map with all necessary settings and layers
 */
function initMap() {
    if (!map) {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        
        // Initialize main map
        map = L.map('map', {
            center: [50, 10],
            zoom: 4,
            maxZoom: 18,
            zoomControl: !isMobile,
            scrollWheelZoom: true,
            dragging: true,
            tap: true,
            wheelDebounceTime: 150,
            zoomSnap: 0.5,
            zoomDelta: 0.5
        });

        // Create map panes
        map.createPane('borderPane').style.zIndex = 400;
        map.createPane('markerPane').style.zIndex = 450;

        // Initialize marker cluster group
        markerClusterGroup = L.markerClusterGroup({
            chunkedLoading: true,
            chunkInterval: 50,
            chunkDelay: 50,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            removeOutsideVisibleBounds: true
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

    const tileUrl = darkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    window.currentTileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19
    }).addTo(map);
}

/**
 * Adds all hospital markers to the map
 * @async
 * @returns {Promise<void>}
 */
async function addMarkers() {
    if (markersAdded) {
        console.log('Markers already added, updating...');
        await updateMarkers();
        return;
    }

    try {
        markerClusterGroup.clearLayers();
        markers = [];
        await updateMarkersInChunks(hospitals);
        markersAdded = true;
    } catch (error) {
        handleError(error, 'Failed to add markers to the map');
    }
}

/**
 * Updates markers in chunks to improve performance
 * @param {Array} hospitals - Array of hospital data
 * @param {number} [chunkSize=3] - Initial chunk size
 * @returns {Promise<void>}
 */
function updateMarkersInChunks(hospitals, chunkSize = 3) {
    return new Promise((resolve) => {
        let index = 0;
        let createdMarkers = 0;

        function processChunk() {
            const startTime = performance.now();
            const chunk = hospitals.slice(index, index + chunkSize);

            chunk.forEach(hospital => {
                const marker = createMarker(hospital);
                markers.push(marker);
                createdMarkers++;
            });

            index += chunkSize;
            const endTime = performance.now();

            if (index < hospitals.length) {
                // Adjust chunk size based on performance
                if (endTime - startTime < 16 && chunkSize < 10) {
                    chunkSize++;
                } else if (endTime - startTime > 16 && chunkSize > 2) {
                    chunkSize--;
                }
                
                setTimeout(() => requestAnimationFrame(processChunk), 0);
            } else {
                console.log(`Created ${createdMarkers} markers`);
                updateMarkers();
                resolve();
            }
        }

        requestAnimationFrame(processChunk);
    });
}

// -----------------------------------------------------
// Gestion des marqueurs (suite)
// -----------------------------------------------------

/**
 * Creates a marker for a hospital
 * @param {Object} hospital - Hospital data object
 * @param {string} hospital.name - Hospital name
 * @param {number} hospital.lat - Latitude
 * @param {number} hospital.lon - Longitude
 * @param {string} hospital.status - Hospital status
 * @returns {L.Marker|L.CircleMarker} - The created marker
 */
function createMarker(hospital) {
    const markerOptions = { pane: 'markerPane' };
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

    marker.on('click', handleMarkerClick);
    return marker;
}

/**
 * Handles marker click events
 * @param {L.Event} e - Leaflet event object
 */
function handleMarkerClick(e) {
    L.DomEvent.stopPropagation(e);
    const clickedMarker = this;
    
    markerClusterGroup.eachLayer(layer => {
        if (layer instanceof L.Marker && layer !== clickedMarker) {
            layer.closePopup();
        }
    });
    
    clickedMarker.openPopup();
}

/**
 * Updates marker visibility based on current filters
 */
function updateMarkers() {
    if (!hospitals || !hospitals.length) {
        console.log('No hospital data available');
        return;
    }

    const filters = getFilters();
    let visibleMarkers = 0;
    const bounds = L.latLngBounds();
    const markersToAdd = [];
    const markersToRemove = [];

    markers.forEach(marker => {
        const hospital = marker.hospitalData;
        const { city, country } = extractLocationInfo(hospital.address);

        if (markerMatchesFilters(hospital, filters, city, country)) {
            if (!markerClusterGroup.hasLayer(marker)) {
                markersToAdd.push(marker);
            }
            bounds.extend(marker.getLatLng());
            visibleMarkers++;
        } else if (markerClusterGroup.hasLayer(marker)) {
            markersToRemove.push(marker);
        }
    });

    requestAnimationFrame(() => {
        markerClusterGroup.removeLayers(markersToRemove);
        markerClusterGroup.addLayers(markersToAdd);

        updateGauges();
        updateNoHospitalsMessage(visibleMarkers);

        if (visibleMarkers === 0) {
            map.setView([50, 10], 4);
        } else if (!map.getBounds().intersects(bounds)) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: map.getZoom() });
        }
    });
}

// -----------------------------------------------------
// Gestion des filtres
// -----------------------------------------------------

/**
 * Gets current filter values from UI elements
 * @returns {Object} Filter values object
 * @property {string} continent - Selected continent
 * @property {string} country - Country filter text
 * @property {string} city - City filter text
 * @property {string} searchTerm - Search input text
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
 * Checks if a hospital matches the current filters
 * @param {Object} hospital - Hospital data
 * @param {Object} filters - Current filters
 * @param {string} city - Extracted city name
 * @param {string} country - Extracted country name
 * @returns {boolean} True if hospital matches all filters
 */
function markerMatchesFilters(hospital, filters, city, country) {
    const statusMatch = activeStatus.length === 0 || 
        activeStatus.some(s => normalizeStatusForComparison(s) === 
                         normalizeStatusForComparison(hospital.status));
    
    const continentMatch = !filters.continent || 
        getContinent(hospital.lat, hospital.lon) === filters.continent;
    
    const countryMatch = !filters.country || 
        country.toLowerCase().includes(filters.country);
    
    const cityMatch = !filters.city || 
        (city && city.toLowerCase().includes(filters.city));
    
    const searchMatch = !filters.searchTerm || 
        hospital.name.toLowerCase().includes(filters.searchTerm);

    return statusMatch && continentMatch && countryMatch && cityMatch && searchMatch;
}

// -----------------------------------------------------
// Gestion des événements
// -----------------------------------------------------

/**
 * Sets up all event listeners
 */
function addEventListeners() {
    // Window events
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

    // UI element events
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
        }
    });

    // Map events
    if (map) {
        map.on('click', () => {
            markerClusterGroup.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    layer.closePopup();
                }
            });
        });
    }

    document.addEventListener('mapUpdate', debouncedUpdateMarkers);
}

/**
 * Handles language change events
 * @param {Event} event - Change event
 */
function handleLanguageChange(event) {
    const newLanguage = event.target.value;
    language = newLanguage;
    applyTranslations(newLanguage);
    savePreferences();
}

/**
 * Handles filter change events
 */
function handleFilterChange() {
    debouncedUpdateMarkers();
    savePreferences();
}

// -----------------------------------------------------
// Gestion des traductions
// -----------------------------------------------------

/**
 * Applies translations to the UI
 * @param {string} lang - Language code
 */
function applyTranslations(lang) {
    currentTranslations = translations[lang] || translations[DEFAULT_LANGUAGE];
    
    // Update all translatable elements
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (currentTranslations[key]) {
            element.textContent = currentTranslations[key];
        }
    });

    // Update all UI components
    updatePlaceholders();
    updateContinentSelect();
    updateGaugeLabels();
    updateStatusTags();
    updateLegend();
    updateAllPopups();
    updateMarkers();
}

/**
 * Updates input placeholders with translated text
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
            element.setAttribute('placeholder', currentTranslations[key] || 
                               `Enter ${id.split('-')[0]}...`);
        }
    });
}

/**
 * Updates status tags with translations
 */
function updateStatusTags() {
    const statusTags = document.querySelectorAll('.status-tag');
    statusTags.forEach(tag => {
        const status = tag.dataset.status;
        if (status) {
            const translationKey = normalizeStatusForTranslation(status);
            const translatedText = currentTranslations[translationKey] || 
                                 tag.getAttribute('data-original-status');
            tag.textContent = translatedText;
        }
    });
}

// -----------------------------------------------------
// Gestion mobile et responsive
// -----------------------------------------------------

/**
 * Updates all UI elements for mobile devices
 * Handles responsive layout adjustments based on screen size and orientation
 */
function adjustForMobile() {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    const isLandscape = window.innerWidth > window.innerHeight;

    document.body.classList.toggle('landscape-mode', isMobile && isLandscape);

    adjustChartContainer(isMobile, isLandscape);
    adjustMapContainer(isMobile, isLandscape);
    adjustLegendContainer(isMobile);
    adjustPopupOptions();
    adjustGauges(isMobile);

    if (map) {
        map.invalidateSize();
        updateMapControls();
    }
}

/**
 * Adjusts the chart container layout for different screen sizes
 * @param {boolean} isMobile - Whether device is mobile
 * @param {boolean} isLandscape - Whether device is in landscape mode
 */
function adjustChartContainer(isMobile, isLandscape) {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;

    const baseStyle = {
        flexDirection: 'row',
        maxWidth: '350px',
        width: 'auto',
        bottom: '10px'
    };

    if (isMobile) {
        Object.assign(baseStyle, isLandscape ? 
            { right: '10px', left: 'auto', transform: 'none' } :
            { right: 'auto', left: '50%', transform: 'translateX(-50%)' }
        );
    } else {
        Object.assign(baseStyle, { right: '10px', left: 'auto', transform: 'none' });
    }

    Object.assign(chartContainer.style, baseStyle);
}

/**
 * Adjusts the map container for different screen sizes
 * @param {boolean} isMobile - Whether device is mobile
 * @param {boolean} isLandscape - Whether device is in landscape mode
 */
function adjustMapContainer(isMobile, isLandscape) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    if (isMobile && isLandscape) {
        mapContainer.style.height = '100%';
        mapContainer.style.width = '100%';
    } else {
        mapContainer.style.height = '';
        mapContainer.style.width = '';
    }
}

/**
 * Adjusts popup behavior based on device and orientation
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

/**
 * Updates map controls based on screen size
 */
function updateMapControls() {
    if (!map) return;

    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    
    if (isMobile && map.zoomControl) {
        map.zoomControl.remove();
    } else if (!isMobile && !map.zoomControl) {
        map.zoomControl = new L.Control.Zoom();
        map.addControl(map.zoomControl);
    }
}

// -----------------------------------------------------
// Accessibilité
// -----------------------------------------------------

/**
 * Enhances accessibility of all UI elements
 * Adds ARIA labels, roles, and keyboard navigation
 */
function enhanceAccessibility() {
    enhanceFormAccessibility();
    enhanceStatusTagsAccessibility();
    enhanceMapAccessibility();
}

/**
 * Enhances form elements accessibility
 */
function enhanceFormAccessibility() {
    const ariaLabels = {
        languageSelect: 'Select language',
        continentSelect: 'Select continent',
        countryFilter: 'Filter by country',
        cityFilter: 'Filter by city',
        hospitalSearch: 'Search hospitals'
    };

    Object.entries(ariaLabels).forEach(([id, label]) => {
        const element = document.getElementById(id);
        if (element) {
            element.setAttribute('aria-label', label);
        }
    });
}

/**
 * Enhances status tags accessibility
 * Adds keyboard navigation and ARIA attributes
 */
function enhanceStatusTagsAccessibility() {
    const statusTags = document.querySelectorAll('.status-tag');
    statusTags.forEach(tag => {
        tag.setAttribute('role', 'button');
        tag.setAttribute('tabindex', '0');
        tag.setAttribute('aria-pressed', 'false');
        
        // Add keyboard navigation
        tag.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                tag.click();
            }
        });
    });
}

/**
 * Enhances map accessibility
 * Adds keyboard controls and ARIA labels for map elements
 */
function enhanceMapAccessibility() {
    if (!map) return;

    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.setAttribute('role', 'region');
        mapElement.setAttribute('aria-label', 'Interactive hospital locations map');
        mapElement.setAttribute('tabindex', '0');
    }
}

// -----------------------------------------------------
// Préférences utilisateur
// -----------------------------------------------------

/**
 * Saves current user preferences to localStorage
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

    try {
        localStorage.setItem('galeonMapPreferences', JSON.stringify(preferences));
    } catch (error) {
        console.warn('Failed to save preferences:', error);
    }
}

/**
 * Loads and applies user preferences from localStorage
 */
function loadPreferences() {
    try {
        const savedPreferences = localStorage.getItem('galeonMapPreferences');
        if (!savedPreferences) {
            applyTranslations(DEFAULT_LANGUAGE);
            return;
        }

        const preferences = JSON.parse(savedPreferences);
        
        // Apply language preference
        language = preferences.language || DEFAULT_LANGUAGE;
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.value = language;
        }

        // Apply theme preference
        darkMode = preferences.theme === 'dark';
        document.body.classList.toggle('dark-mode', darkMode);
        updateTileLayer();

        // Apply filter preferences
        const filterElements = {
            'continent-select': preferences.continent,
            'country-filter': preferences.country,
            'city-filter': preferences.city
        };

        Object.entries(filterElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value) {
                element.value = value;
            }
        });

        // Apply status preferences
        activeStatus = preferences.activeStatus || [];

        applyTranslations(language);
    } catch (error) {
        console.warn('Failed to load preferences:', error);
        applyTranslations(DEFAULT_LANGUAGE);
    }
}

/**
 * Applies default preferences
 */
function applyDefaultPreferences() {
    language = DEFAULT_LANGUAGE;
    darkMode = false;
    activeStatus = [];
    
    document.body.classList.remove('dark-mode');
    updateTileLayer();
    applyTranslations(DEFAULT_LANGUAGE);
}

// -----------------------------------------------------
// Utilitaires et helpers
// -----------------------------------------------------

/**
 * Extracts location information from an address string
 * @param {string} address - Full address string
 * @returns {Object} Parsed address components
 */
function extractLocationInfo(address) {
    if (typeof address !== 'string' || !address.trim()) {
        console.warn('Invalid address provided');
        return { street: '', city: '', state: '', country: '', postalCode: '' };
    }

    const parts = address.trim().split(',').map(part => part.trim());
    let street = '', city = '', state = '', country = '', postalCode = '';

    if (parts.length > 0) {
        country = parts.pop() || '';
        
        const postalCodeMatch = parts[parts.length - 1]?.match(/\b[A-Z0-9]{5,10}\b/i);
        if (postalCodeMatch) {
            postalCode = postalCodeMatch[0];
            parts[parts.length - 1] = parts[parts.length - 1].replace(postalCode, '').trim();
        }

        if (parts.length > 0) {
            city = parts.pop() || '';
        }

        street = parts.join(', ');
    }

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
 * Gets color based on hospital status
 * @param {string} status - Hospital status
 * @returns {string} Color hex code
 */
function getColor(status) {
    return colors[status] || '#6c757d';
}

/**
 * Handles errors and displays messages to the user
 * @param {Error} error - Error object
 * @param {string} userMessage - Message to display to user
 */
function handleError(error, userMessage) {
    console.error('Error:', error);
    
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = userMessage;
        errorElement.style.display = 'block';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        alert(userMessage);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!isInitialized) {
        initApplication().catch(error => {
            handleError(error, 'Failed to initialize the application');
        });
    }
});

// Export public API
export {
    initApplication,
    updateCustomization,
    filterCountries,
    toggleTheme,
    toggleLegend,
    toggleMenu
};