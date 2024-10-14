# Guide d'intégration IA pour la cartographie des hôpitaux

## 1. Configuration du backend

### 1.1 Modèle de données
Assurez-vous que votre modèle `Hospital` dans `src/models/Hospital.js` contient les champs suivants :

```javascript
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
```

### 1.2 Routes API
Dans `src/routes/hospitalRoutes.js`, ajoutez les routes suivantes :

```javascript
router.get('/check', hospitalController.checkHospitalExists);
router.post('/upsert', validateHospitalInput, hospitalController.upsertHospital);
```

### 1.3 Contrôleur
Dans `src/controllers/hospitalController.js`, ajoutez ces fonctions :

```javascript
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

## 2. Implémentation côté frontend

### 2.1 Fonction de recherche d'informations
Créez une fonction pour simuler la recherche d'informations sur internet :

```javascript
async function searchHospitalInfo(name) {
  // Simuler une recherche internet
  console.log(`Searching for information about ${name}`);
  // Dans un cas réel, cette fonction ferait des requêtes à des API externes ou du web scraping
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
```

### 2.2 Fonction de traitement des informations
Créez une fonction pour traiter les informations trouvées et les synchroniser avec l'API :

```javascript
async function processHospitalInfo(name) {
  // Étape 1 : Rechercher les informations
  const hospitalInfo = await searchHospitalInfo(name);

  // Étape 2 : Vérifier si l'hôpital existe déjà
  const checkResponse = await fetch(`/api/hospitals/check?name=${encodeURIComponent(name)}`);
  const checkResult = await checkResponse.json();

  // Étape 3 : Comparer les informations existantes avec les nouvelles
  if (!checkResult.exists || JSON.stringify(checkResult.hospital) !== JSON.stringify(hospitalInfo)) {
    // Étape 4 : Mettre à jour ou créer l'hôpital
    const upsertResponse = await fetch('/api/hospitals/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hospitalInfo),
    });

    const upsertResult = await upsertResponse.json();
    console.log('Hospital information updated:', upsertResult);
  } else {
    console.log('Hospital information is up to date');
  }

  return hospitalInfo;
}
```

### 2.3 Intégration avec l'IA
Intégrez la fonction `processHospitalInfo` avec votre système d'IA :

```javascript
async function handleUserQuery(query) {
  // Utiliser l'IA pour extraire le nom de l'hôpital de la requête de l'utilisateur
  const hospitalName = extractHospitalName(query);
  
  if (hospitalName) {
    const hospitalInfo = await processHospitalInfo(hospitalName);
    // Utilisez hospitalInfo pour répondre à la requête de l'utilisateur
    return generateResponse(query, hospitalInfo);
  } else {
    return "Je n'ai pas pu identifier d'hôpital dans votre requête.";
  }
}

// Fonction simulée pour l'extraction du nom de l'hôpital
function extractHospitalName(query) {
  // Dans un cas réel, cette fonction utiliserait le NLP pour extraire le nom
  const hospitals = ["Hôpital Saint-Antoine", "Hôpital Cochin", "Hôpital Necker"];
  return hospitals.find(hospital => query.toLowerCase().includes(hospital.toLowerCase()));
}

// Fonction simulée pour générer une réponse
function generateResponse(query, hospitalInfo) {
  return `L'hôpital ${hospitalInfo.name} est ${hospitalInfo.status}. 
  Il est situé à l'adresse : ${hospitalInfo.address}. 
  Vous pouvez visiter leur site web : ${hospitalInfo.website}`;
}
```

## 3. Utilisation

Pour utiliser ce système, vous pouvez appeler la fonction `handleUserQuery` avec la requête de l'utilisateur :

```javascript
async function main() {
  const userQuery = "Quelles sont les informations sur l'Hôpital Saint-Antoine ?";
  const response = await handleUserQuery(userQuery);
  console.log(response);
}

main();
```

Ce guide couvre l'ensemble du processus, de la recherche d'informations par l'IA à la mise à jour de la base de données via l'API, en passant par le traitement des requêtes utilisateur.
