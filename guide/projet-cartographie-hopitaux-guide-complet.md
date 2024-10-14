# Guide complet pour le projet de cartographie des hôpitaux avec intégration IA

## 1. Initialisation du projet

### 1.1 Création du répertoire du projet
```bash
mkdir projet-cartographie-hopitaux
cd projet-cartographie-hopitaux
```

### 1.2 Initialisation de npm et installation des dépendances
```bash
npm init -y
npm install express mongoose dotenv cors helmet
npm install --save-dev nodemon
```

### 1.3 Structure du projet
Créez la structure de fichiers suivante :
```
projet-cartographie-hopitaux/
├── src/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── config/
├── .env
├── .gitignore
└── server.js
```

### 1.4 Configuration de base
Créez un fichier `.env` à la racine du projet :
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hospital-map
NODE_ENV=development
```

Créez un fichier `.gitignore` :
```
node_modules/
.env
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
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('Could not connect to MongoDB', err));

// Routes
app.use('/api/hospitals', require('./src/routes/hospitalRoutes'));

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
Créez le fichier `src/controllers/hospitalController.js` :

```javascript
const Hospital = require('../models/Hospital');

exports.getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find();
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (hospital == null) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createHospital = async (req, res) => {
  const hospital = new Hospital({
    name: req.body.name,
    location: {
      type: 'Point',
      coordinates: [req.body.lon, req.body.lat]
    },
    status: req.body.status,
    address: req.body.address,
    website: req.body.website,
    imageUrl: req.body.imageUrl
  });

  try {
    const newHospital = await hospital.save();
    res.status(201).json(newHospital);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (hospital == null) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    if (req.body.name != null) {
      hospital.name = req.body.name;
    }
    if (req.body.lon != null && req.body.lat != null) {
      hospital.location = {
        type: 'Point',
        coordinates: [req.body.lon, req.body.lat]
      };
    }
    if (req.body.status != null) {
      hospital.status = req.body.status;
    }
    if (req.body.address != null) {
      hospital.address = req.body.address;
    }
    if (req.body.website != null) {
      hospital.website = req.body.website;
    }
    if (req.body.imageUrl != null) {
      hospital.imageUrl = req.body.imageUrl;
    }

    const updatedHospital = await hospital.save();
    res.json(updatedHospital);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (hospital == null) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    await hospital.remove();
    res.json({ message: 'Hospital deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getNearbyHospitals = async (req, res) => {
  try {
    const { lon, lat, maxDistance } = req.query;
    const hospitals = await Hospital.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance) || 5000 // Default to 5km if not specified
        }
      }
    });
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.checkHospitalExists = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ message: 'Hospital name is required' });
    }
    const hospital = await Hospital.findOne({ name: { $regex: new RegExp(name, 'i') } });
    res.json({ exists: !!hospital, hospital });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.upsertHospital = async (req, res) => {
  try {
    const { name, lat, lon, status, address, website, imageUrl } = req.body;
    let hospital = await Hospital.findOne({ name: { $regex: new RegExp(name, 'i') } });
    if (hospital) {
      hospital.location.coordinates = [lon, lat];
      hospital.status = status;
      hospital.address = address;
      hospital.website = website;
      hospital.imageUrl = imageUrl;
    } else {
      hospital = new Hospital({
        name,
        location: { type: 'Point', coordinates: [lon, lat] },
        status,
        address,
        website,
        imageUrl
      });
    }
    const updatedHospital = await hospital.save();
    res.status(200).json(updatedHospital);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
```

### 2.5 Middleware de validation
Créez le fichier `src/middleware/hospitalValidation.js` :

```javascript
const { body, validationResult } = require('express-validator');

exports.validateHospitalInput = [
  body('name').notEmpty().withMessage('Name is required'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('lon').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('status').isIn(['Deployed', 'Signed', 'In Progress']).withMessage('Invalid status'),
  body('address').notEmpty().withMessage('Address is required'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('imageUrl').optional().isURL().withMessage('Invalid image URL'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

## 3. Implémentation côté frontend

### 3.1 Création du fichier HTML
Créez un fichier `index.html` à la racine du projet :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cartographie des Hôpitaux</title>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
</head>
<body>
    <h1>Cartographie des Hôpitaux</h1>
    <input type="text" id="hospitalQuery" placeholder="Entrez le nom d'un hôpital">
    <button onclick="searchHospital()">Rechercher</button>
    <div id="result"></div>

    <script src="frontend.js"></script>
</body>
</html>
```

### 3.2 Création du fichier JavaScript frontend
Créez un fichier `frontend.js` à la racine du projet :

```javascript
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
  // Step 1: Search for information
  const hospitalInfo = await searchHospitalInfo(name);

  // Step 2: Check if the hospital already exists
  const checkResponse = await axios.get(`/api/hospitals/check?name=${encodeURIComponent(name)}`);
  const checkResult = checkResponse.data;

  // Step 3: Compare existing information with new information
  if (!checkResult.exists || JSON.stringify(checkResult.hospital) !== JSON.stringify(hospitalInfo)) {
    // Step 4: Update or create the hospital
    const upsertResponse = await axios.post('/api/hospitals/upsert', hospitalInfo);
    console.log('Hospital information updated:', upsertResponse.data);
  } else {
    console.log('Hospital information is up to date');
  }

  return hospitalInfo;
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
  } catch (error) {
    resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
  }
}
```

## 4. Configuration finale et lancement

### 4.1 Mise à jour du package.json
Ajoutez les scripts suivants dans votre `package.json` :

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

### 4.2 Lancement du serveur
```bash
npm run dev
```

## 5. Utilisation

1. Ouvrez votre navigateur et accédez à `http://localhost:3000`.
2. Entrez le nom d'un hôpital dans le champ de recherche.
3. Cliquez sur le bouton "Rechercher".
4. Les informations de l'hôpital seront affichées, et la base de données sera mise à jour si nécessaire.

## 6. Prochaines étapes

1. Implémentez une véritable recherche d'informations en utilisant des API externes ou du web scraping.
2. Ajoutez une carte interactive pour afficher les emplacements des hôpitaux.
3. Implémentez un système d'authentification pour sécuriser l'API.
4. Ajoutez des tests unitaires et d'intégration.