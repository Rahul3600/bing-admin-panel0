// Replace this with your Firebase configuration from Step 1
const firebaseConfig = {
    apiKey: "AIzaSyA8RrOW-D0Qr49L7AA-Lxoq0e4SB-TrONM",
    authDomain: "bing-search-phase-management.firebaseapp.com",
    databaseURL: "https://bing-search-phase-management-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bing-search-phase-management",
    storageBucket: "bing-search-phase-management.firebasestorage.app",
    messagingSenderId: "656271743530",
    appId: "1:656271743530:web:30794c722708107d178153"
  };
  

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Sign in anonymously for basic security
firebase.auth().signInAnonymously().catch(error => console.error('Auth error:', error));

// Save search phrases to Firebase
function saveSearchTerms() {
    const terms = document.getElementById('searchTerms').value.split('\n').filter(term => term.trim() !== '');
    database.ref('searchTerms').set(terms);
    alert('Search phrases saved!');
}

// Add a client ID
function addClientId() {
    const clientId = document.getElementById('clientId').value.trim();
    if (clientId) {
        database.ref('clients/' + clientId).set({ enabled: true, lastUsed: new Date().toISOString() });
        document.getElementById('clientId').value = '';
        loadClientIds();
    }
}

// Load client IDs
function loadClientIds() {
    database.ref('clients').once('value', snapshot => {
        const clientList = document.getElementById('clientList');
        clientList.innerHTML = '';
        snapshot.forEach(child => {
            const li = document.createElement('li');
            li.textContent = `${child.key} (Last used: ${child.val().lastUsed || 'Never'})`;
            clientList.appendChild(li);
        });
    });
}

// Load activity logs
function loadLogs() {
    database.ref('logs').once('value', snapshot => {
        const logList = document.getElementById('logList');
        logList.innerHTML = '';
        snapshot.forEach(child => {
            const log = document.createElement('div');
            log.textContent = `${child.val().clientId}: ${child.val().term} (${child.val().timestamp})`;
            logList.appendChild(log);
        });
    });
}

// Initial load
loadClientIds();
loadLogs();