# Structure séparée pour le projet de cartographie des hôpitaux avec IA et chat virtuel

## 1. Structure du projet

```
map-hospitals-galeon/
├── frontend-map/
│   ├── index.html
│   ├── style.css
│   ├── map.js
│   └── hospitals.js
├── frontend-ai/
│   ├── index.html
│   ├── style.css
│   ├── ai.js
│   └── chat.js
├── backend/
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── middleware/
│   ├── server.js
│   └── package.json
├── .env
└── README.md
```

## 2. Frontend de la carte interactive (votre code existant)

### 2.1 HTML (frontend-map/index.html)

Conservez votre fichier HTML existant :

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
</head>
<body>
    <div id="map"></div>
    <script src="hospitals.js"></script>
    <script src="map.js"></script>
</body>
</html>
```

### 2.2 CSS (frontend-map/style.css)

Conservez votre CSS existant.

### 2.3 JavaScript (frontend-map/map.js)

Conservez vos fonctions existantes et ajoutez une fonction pour charger les données depuis l'API :

```javascript
// ... vos fonctions existantes ...

async function loadHospitalsFromAPI() {
    try {
        const response = await fetch('/api/hospitals');
        const data = await response.json();
        hospitals = data;
        addMarkers(hospitals);
    } catch (error) {
        console.error('Error loading hospitals from API:', error);
    }
}

// Appelez cette fonction au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadHospitalsFromAPI();
});
```

### 2.4 Données des hôpitaux (frontend-map/hospitals.js)

Vous pouvez conserver ce fichier pour les données statiques, mais il sera principalement utilisé comme sauvegarde si l'API ne répond pas.

## 3. Frontend AI et chat virtuel

### 3.1 HTML (frontend-ai/index.html)

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Assistant IA pour les Hôpitaux</title>
    <link rel="stylesheet" href="style.css" />
</head>
<body>
    <div id="chat-container">
        <div id="chat-messages"></div>
        <input type="text" id="user-input" placeholder="Posez votre question...">
        <button onclick="sendMessage()">Envoyer</button>
    </div>
    <script src="ai.js"></script>
    <script src="chat.js"></script>
</body>
</html>
```

### 3.2 CSS (frontend-ai/style.css)

```css
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f0f0f0;
}

#chat-container {
    width: 80%;
    max-width: 600px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
    overflow: hidden;
}

#chat-messages {
    height: 400px;
    overflow-y: auto;
    padding: 20px;
}

#user-input {
    width: calc(100% - 80px);
    padding: 10px;
    border: none;
    border-top: 1px solid #e0e0e0;
}

button {
    width: 80px;
    padding: 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    cursor: pointer;
}
```

### 3.3 JavaScript IA (frontend-ai/ai.js)

```javascript
async function processUserQuery(query) {
    try {
        const response = await fetch('/api/ai/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });
        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error processing query:', error);
        return "Désolé, je n'ai pas pu traiter votre demande.";
    }
}

async function searchHospitalInfo(name) {
    try {
        const response = await fetch(`/api/hospitals/search?name=${encodeURIComponent(name)}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error searching hospital:', error);
        return null;
    }
}
```

### 3.4 JavaScript Chat (frontend-ai/chat.js)

```javascript
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');

function addMessage(message, isUser = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isUser ? 'user-message' : 'ai-message');
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (message) {
        addMessage(message, true);
        userInput.value = '';

        const response = await processUserQuery(message);
        addMessage(response);
    }
}

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
```

## 4. Backend

### 4.1 Serveur (backend/server.js)

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files for both frontends
app.use('/map', express.static(path.join(__dirname, '../frontend-map')));
app.use('/ai', express.static(path.join(__dirname, '../frontend-ai')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('Could not connect to MongoDB', err));

// Routes
app.use('/api/hospitals', require('./src/routes/hospitalRoutes'));
app.use('/api/ai', require('./src/routes/aiRoutes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 4.2 Routes AI (backend/src/routes/aiRoutes.js)

```javascript
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/process', aiController.processQuery);

module.exports = router;
```

### 4.3 Contrôleur AI (backend/src/controllers/aiController.js)

```javascript
const Hospital = require('../models/Hospital');

exports.processQuery = async (req, res) => {
    try {
        const { query } = req.body;
        // Ici, vous intégreriez votre logique d'IA pour traiter la requête
        // Pour cet exemple, nous allons simplement rechercher un hôpital si le nom est mentionné
        const hospitalName = extractHospitalName(query);
        if (hospitalName) {
            const hospital = await Hospital.findOne({ name: { $regex: new RegExp(hospitalName, 'i') } });
            if (hospital) {
                res.json({ response: `L'hôpital ${hospital.name} est ${hospital.status}. Il est situé à ${hospital.address}.` });
            } else {
                res.json({ response: `Désolé, je n'ai pas trouvé d'informations sur l'hôpital ${hospitalName}.` });
            }
        } else {
            res.json({ response: "Je n'ai pas compris votre demande. Pouvez-vous préciser le nom de l'hôpital ?" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

function extractHospitalName(query) {
    // Cette fonction devrait être implémentée avec une logique NLP plus avancée
    // Pour cet exemple, nous recherchons simplement le mot après "hôpital"
    const match = query.match(/hôpital\s+(\w+)/i);
    return match ? match[1] : null;
}
```

## 5. Configuration et lancement

### 5.1 Fichier .env (à la racine du projet)

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hospital-map
```

### 5.2 Package.json (backend/package.json)

```json
{
  "name": "hospital-map-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.17.1",
    "mongoose": "^5.12.3",
    "dotenv": "^8.2.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^2.0.7"
  }
}
```

### 5.3 Lancement du serveur

```bash
cd backend
npm install
npm run dev
```

## 6. Utilisation

1. Accédez à `http://localhost:3000/map` pour voir la carte interactive.
2. Accédez à `http://localhost:3000/ai` pour interagir avec le chat IA.

## 7. Prochaines étapes

1. Implémentez une véritable logique d'IA pour le traitement des requêtes utilisateur.
2. Ajoutez plus de fonctionnalités au chat, comme la possibilité de mettre à jour les informations des hôpitaux.
3. Intégrez un système d'authentification pour sécuriser l'API.
4. Améliorez l'interface utilisateur du chat IA.
5. Ajoutez des tests unitaires et d'intégration pour les deux frontends et le backend.
