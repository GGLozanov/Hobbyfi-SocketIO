const admin = require('firebase-admin');
const fs = require('fs');

const firebaseApp = admin.initializeApp({ credential:
        admin.credential.cert(fs.readFileSync('../keys/hobbyfi-firebase-adminsdk-o1f83-e1d558ffae.json'))
});

const messaging = firebaseApp.messaging();

export default messaging;