# Guide complet pour le projet de cartographie des hôpitaux avec intégration IA et code existant

## 1. Initialisation du projet

### 1.1 Clonage du projet existant
```bash
git clone https://github.com/BunnySweety/map-hospitals-galeon.git
cd map-hospitals-galeon
```

### 1.2 Installation des dépendances supplémentaires
```bash
npm install express mongoose dotenv cors helmet axios
npm install --save-dev nodemon
```

### 1.3 Structure du projet mise à jour
Ajoutez les dossiers et fichiers suivants à la structure existante :
```
map-hospitals-galeon/
├── src/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── config/
├── .env
├── server.js
└── (fichiers existants)
```

## 2. Configuration du backend

### 2.1 Modèle de données
Créez le fichier `src/models/Hospital.js` :

```javascript
const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }
  },
  status: {
    type: String,
    enum: ['Deployed', 'Signed', 'In Progress'],
    required: true
  },
  address: { type: String, required: true },
  website: { type: String, trim: true },
  imageUrl: { type: String, trim: true }
}, { timestamps: true });

HospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', HospitalSchema);
```

### 2.2 Configuration du serveur
Créez le fichier `server.js` à la racine du projet :

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('Could not connect to MongoDB', err));

// Routes
app.use('/api/hospitals', require('./src/routes/hospitalRoutes'));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2.3 Routes
Créez le fichier `src/routes/hospitalRoutes.js` :

```javascript
const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { validateHospitalInput } = require('../middleware/hospitalValidation');

router.get('/', hospitalController.getAllHospitals);
router.get('/:id', hospitalController.getHospitalById);
router.post('/', validateHospitalInput, hospitalController.createHospital);
router.put('/:id', validateHospitalInput, hospitalController.updateHospital);
router.delete('/:id', hospitalController.deleteHospital);
router.get('/nearby', hospitalController.getNearbyHospitals);
router.get('/check', hospitalController.checkHospitalExists);
router.post('/upsert', validateHospitalInput, hospitalController.upsertHospital);

module.exports = router;
```

### 2.4 Contrôleur
Créez le fichier `src/controllers/hospitalController.js` avec le contenu du contrôleur fourni précédemment.

### 2.5 Middleware de validation
Créez le fichier `src/middleware/hospitalValidation.js` avec le contenu du middleware de validation fourni précédemment.

## 3. Intégration du code frontend existant

### 3.1 Mise à jour du fichier HTML
Mettez à jour le fichier `index.html` existant :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cartographie des Hôpitaux Galeon</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <link rel="stylesheet" href="style.css" />
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
</head>
<body>
    <div id="map"></div>
    <div id="search-container">
        <input type="text" id="hospitalQuery" placeholder="Entrez le nom d'un hôpital">
        <button onclick="searchHospital()">Rechercher</button>
    </div>
    <div id="result"></div>

    <script src="hospitals.js"></script>
    <script src="map.js"></script>
    <script src="frontend.js"></script>
</body>
</html>
```

### 3.2 Mise à jour du fichier JavaScript principal
Mettez à jour le fichier `map.js` existant et ajoutez les nouvelles fonctionnalités :

```javascript
let map;
let markers = [];

function initMap() {
    map = L.map('map').setView([46.603354, 1.888334], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

function addMarkers(hospitals) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    hospitals.forEach(hospital => {
        const marker = L.marker([hospital.location.coordinates[1], hospital.location.coordinates[0]])
            .addTo(map)
            .bindPopup(`
                <b>${hospital.name}</b><br>
                Status: ${hospital.status}<br>
                Address: ${hospital.address}<br>
                <a href="${hospital.website}" target="_blank">Website</a>
            `);
        markers.push(marker);
    });
}

async function loadHospitals() {
    try {
        const response = await axios.get('/api/hospitals');
        addMarkers(response.data);
    } catch (error) {
        console.error('Error loading hospitals:', error);
    }
}

async function searchHospitalInfo(name) {
    console.log(`Searching for information about ${name}`);
    // Simulate internet search (replace with actual API calls or web scraping in a real scenario)
    return {
        name: name,
        lat: Math.random() * 180 - 90,
        lon: Math.random() * 360 - 180,
        status: ['Deployed', 'Signed', 'In Progress'][Math.floor(Math.random() * 3)],
        address: `${Math.floor(Math.random() * 1000)} Sample St, City, Country`,
        website: `http://www.${name.toLowerCase().replace(/\s/g, '')}.com`,
        imageUrl: `http://example.com/${name.toLowerCase().replace(/\s/g, '')}.jpg`
    };
}

async function processHospitalInfo(name) {
    const hospitalInfo = await searchHospitalInfo(name);

    try {
        const checkResponse = await axios.get(`/api/hospitals/check?name=${encodeURIComponent(name)}`);
        const checkResult = checkResponse.data;

        if (!checkResult.exists || JSON.stringify(checkResult.hospital) !== JSON.stringify(hospitalInfo)) {
            const upsertResponse = await axios.post('/api/hospitals/upsert', hospitalInfo);
            console.log('Hospital information updated:', upsertResponse.data);
        } else {
            console.log('Hospital information is up to date');
        }

        return hospitalInfo;
    } catch (error) {
        console.error('Error processing hospital info:', error);
        throw error;
    }
}

async function searchHospital() {
    const query = document.getElementById('hospitalQuery').value;
    const resultDiv = document.getElementById('result');
    
    try {
        const hospitalInfo = await processHospitalInfo(query);
        resultDiv.innerHTML = `
            <h2>${hospitalInfo.name}</h2>
            <p>Status: ${hospitalInfo.status}</p>
            <p>Address: ${hospitalInfo.address}</p>
            <p>Website: <a href="${hospitalInfo.website}" target="_blank">${hospitalInfo.website}</a></p>
            <img src="${hospitalInfo.imageUrl}" alt="${hospitalInfo.name}" width="200">
        `;

        map.setView([hospitalInfo.lat, hospitalInfo.lon], 13);
        loadHospitals();
    } catch (error) {
        resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadHospitals();
});
```

### 3.3 Mise à jour du fichier de données des hôpitaux
Modifiez le fichier `hospitals.js` pour qu'il exporte les données au lieu de les définir globalement :

```javascript
const hospitalsData = [
    // ... vos données existantes ...
];

export default hospitalsData;
```

## 4. Configuration finale et lancement

### 4.1 Création du fichier .env
Créez un fichier `.env` à la racine du projet :

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hospital-map
NODE_ENV=development
```

### 4.2 Mise à jour du package.json
Mettez à jour les scripts dans votre `package.json` :

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

### 4.3 Lancement du serveur
```bash
npm run dev
```

## 5. Utilisation

1. Ouvrez votre navigateur et accédez à `http://localhost:3000`.
2. La carte s'affichera avec les marqueurs des hôpitaux existants.
3. Utilisez la barre de recherche pour trouver ou ajouter de nouveaux hôpitaux.
4. Les informations de l'hôpital recherché seront affichées, et la base de données sera mise à jour si nécessaire.

## 6. Prochaines étapes

1. Implémentez une véritable recherche d'informations en utilisant des API externes ou du web scraping.
2. Améliorez l'interface utilisateur pour une meilleure expérience.
3. Ajoutez des fonctionnalités de filtrage et de tri des hôpitaux sur la carte.
4. Implémentez un système d'authentification pour sécuriser l'API.
5. Ajoutez des tests unitaires et d'intégration.
