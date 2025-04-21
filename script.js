(function() {
    'use strict';

    const firebaseConfig = {
        apiKey: "AIzaSyA8RrOW-D0Qr49L7AA-Lxoq0e4SB-TrONM",
        authDomain: "bing-search-phase-management.firebaseapp.com",
        databaseURL: "https://bing-search-phase-management-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "bing-search-phase-management",
        storageBucket: "bing-search-phase-management.firebasestorage.app",
        messagingSenderId: "656271743530",
        appId: "1:656271743530:web:30794c722708107d178153"
    };

    // Debug Logging
    let debugMessages = [];
    function logDebug(message) {
        debugMessages.push(`${new Date().toISOString()}: ${message}`);
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.innerHTML = debugMessages.map(msg => `<div>${msg}</div>`).join('');
        }
        console.log(`[AdminPanel] ${message}`);
    }

    // Initialize Firebase
    let database;
    let auth;
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        auth = firebase.auth();
        logDebug('Firebase initialized successfully');
    } catch (error) {
        logDebug(`Firebase init failed: ${error.message}`);
        alert('Firebase setup failed. Check configuration.');
    }

    // Authenticate
    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                logDebug(`Authenticated as anonymous user: ${user.uid}`);
            } else {
                logDebug('No user authenticated. Attempting anonymous sign-in...');
                auth.signInAnonymously()
                    .then(() => logDebug('Anonymous sign-in successful'))
                    .catch(error => {
                        logDebug(`Auth error: ${error.code} - ${error.message}`);
                        alert(`Authentication failed: ${error.message}`);
                    });
            }
        });
    } else {
        logDebug('Firebase Auth not initialized.');
        alert('Firebase Auth not initialized.');
    }

    // Validate Client ID
    function isValidClientId(clientId) {
        const regex = /^[a-zA-Z0-9]{3,20}$/;
        return regex.test(clientId);
    }

    // Save search phrases
    window.saveSearchTerms = function() {
        if (!database) {
            logDebug('Database not initialized.');
            alert('Database not initialized.');
            return;
        }
        const termsInput = document.getElementById('searchTerms').value;
        let terms = termsInput.split('\n').map(term => term.trim()).filter(term => term);
        if (terms.length === 0) {
            logDebug('No search phrases entered');
            alert('Please enter at least one search phrase.');
            return;
        }
        terms = [...new Set(terms)]; // Remove duplicates
        logDebug(`Saving ${terms.length} unique search phrases`);
        database.ref('searchTerms').set(terms)
            .then(() => {
                logDebug('Search phrases saved');
                alert('Search phrases saved!');
                document.getElementById('searchTerms').value = terms.join('\n');
            })
            .catch(error => {
                logDebug(`Save phrases failed: ${error.message}`);
                alert(`Failed to save phrases: ${error.message}`);
            });
    };

    // Clear search phrases
    window.clearSearchTerms = function() {
        if (!database) {
            logDebug('Database not initialized.');
            alert('Database not initialized.');
            return;
        }
        if (!confirm('Clear all search phrases?')) {
            logDebug('Clear phrases cancelled');
            return;
        }
        logDebug('Clearing search phrases');
        database.ref('searchTerms').remove()
            .then(() => {
                logDebug('Search phrases cleared');
                alert('Search phrases cleared!');
                document.getElementById('searchTerms').value = '';
            })
            .catch(error => {
                logDebug(`Clear phrases failed: ${error.message}`);
                alert(`Failed to clear phrases: ${error.message}`);
            });
    };

    // Add client ID
    window.addClientId = function() {
        if (!database) {
            logDebug('Database not initialized.');
            alert('Database not initialized.');
            return;
        }
        const clientId = document.getElementById('clientId').value.trim();
        if (!clientId) {
            logDebug('No Client ID entered');
            alert('Please enter a Client ID.');
            return;
        }
        if (!isValidClientId(clientId)) {
            logDebug('Invalid Client ID format');
            alert('Client ID must be 3-20 alphanumeric characters.');
            return;
        }
        logDebug(`Checking client: ${clientId}`);
        database.ref('clients/' + clientId).once('value', snapshot => {
            if (snapshot.exists()) {
                logDebug(`Client ${clientId} already exists`);
                alert('Client ID already exists.');
                return;
            }
            database.ref('clients/' + clientId).set({
                enabled: true,
                lastUsed: new Date().toISOString()
            }).then(() => {
                logDebug(`Client ${clientId} added`);
                alert(`Client ${clientId} added!`);
                document.getElementById('clientId').value = '';
                loadClientIds();
            }).catch(error => {
                logDebug(`Add client failed: ${error.message}`);
                alert(`Failed to add client: ${error.message}`);
            });
        }).catch(error => {
            logDebug(`Check client failed: ${error.message}`);
            alert(`Error checking client: ${error.message}`);
        });
    };

    // Toggle client status
    window.toggleClientStatus = function() {
        if (!database) {
            logDebug('Database not initialized.');
            alert('Database not initialized.');
            return;
        }
        const clientId = document.getElementById('clientId').value.trim();
        if (!clientId) {
            logDebug('No Client ID entered');
            alert('Please enter a Client ID.');
            return;
        }
        if (!isValidClientId(clientId)) {
            logDebug('Invalid Client ID format');
            alert('Client ID must be 3-20 alphanumeric characters.');
            return;
        }
        logDebug(`Toggling client: ${clientId}`);
        database.ref('clients/' + clientId).once('value', snapshot => {
            const data = snapshot.val();
            if (data) {
                database.ref('clients/' + clientId).update({
                    enabled: !data.enabled
                }).then(() => {
                    logDebug(`Client ${clientId} ${data.enabled ? 'disabled' : 'enabled'}`);
                    alert(`Client ${clientId} is now ${data.enabled ? 'disabled' : 'enabled'}`);
                    loadClientIds();
                }).catch(error => {
                    logDebug(`Toggle client failed: ${error.message}`);
                    alert(`Failed to toggle client: ${error.message}`);
                });
            } else {
                logDebug(`Client ${clientId} not found`);
                alert('Client ID not found.');
            }
        }).catch(error => {
            logDebug(`Fetch client failed: ${error.message}`);
            alert(`Error fetching client: ${error.message}`);
        });
    };

    // Delete client
    window.deleteClient = function() {
        if (!database) {
            logDebug('Database not initialized.');
            alert('Database not initialized.');
            return;
        }
        const clientId = document.getElementById('clientId').value.trim();
        if (!clientId) {
            logDebug('No Client ID entered');
            alert('Please enter a Client ID.');
            return;
        }
        if (!isValidClientId(clientId)) {
            logDebug('Invalid Client ID format');
            alert('Client ID must be 3-20 alphanumeric characters.');
            return;
        }
        if (!confirm(`Delete client ${clientId}?`)) {
            logDebug('Delete client cancelled');
            return;
        }
        logDebug(`Deleting client: ${clientId}`);
        database.ref('clients/' + clientId).remove()
            .then(() => {
                logDebug(`Client ${clientId} deleted`);
                alert(`Client ${clientId} deleted!`);
                document.getElementById('clientId').value = '';
                loadClientIds();
            })
            .catch(error => {
                logDebug(`Delete client failed: ${error.message}`);
                alert(`Failed to delete client: ${error.message}`);
            });
    };

    // Load client IDs
    window.refreshClients = function() {
        loadClientIds();
    };

    function loadClientIds() {
        if (!database) {
            logDebug('Database not initialized.');
            alert('Database not initialized.');
            return;
        }
        logDebug('Loading client list');
        database.ref('clients').once('value', snapshot => {
            const clientList = document.getElementById('clientList');
            clientList.innerHTML = '';
            snapshot.forEach(child => {
                const li = document.createElement('li');
                li.textContent = `${child.key} (${child.val().enabled ? 'Enabled' : 'Disabled'}, Last used: ${child.val().lastUsed || 'Never'})`;
                clientList.appendChild(li);
            });
            logDebug('Client list loaded');
        }).catch(error => {
            logDebug(`Load clients failed: ${error.message}`);
            alert(`Failed to load clients: ${error.message}`);
        });
    }

    // Load logs
    window.refreshLogs = function() {
        loadLogs();
    };

    function loadLogs() {
        if (!database) {
            logDebug('Database not initialized.');
            alert('Database not initialized.');
            return;
        }
        logDebug('Loading logs');
        database.ref('logs').limitToLast(50).once('value', snapshot => {
            const logList = document.getElementById('logList');
            logList.innerHTML = '';
            snapshot.forEach(child => {
                const log = document.createElement('div');
                log.textContent = `${child.val().clientId}: ${child.val().term} (${child.val().timestamp})`;
                logList.appendChild(log);
            });
            logDebug('Logs loaded');
        }).catch(error => {
            logDebug(`Load logs failed: ${error.message}`);
            alert(`Failed to load logs: ${error.message}`);
        });
    }

    // Export logs
    window.exportLogs = function() {
        if (!database) {
            logDebug('Database not initialized.');
            alert('Database not initialized.');
            return;
        }
        logDebug('Exporting logs');
        database.ref('logs').once('value', snapshot => {
            const logs = [];
            snapshot.forEach(child => {
                logs.push(`${child.val().clientId}: ${child.val().term} (${child.val().timestamp})`);
            });
            if (logs.length === 0) {
                logDebug('No logs to export');
                alert('No logs available.');
                return;
            }
            const logText = logs.join('\n');
            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `logs_${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            logDebug('Logs exported');
            alert('Logs exported!');
        }).catch(error => {
            logDebug(`Export logs failed: ${error.message}`);
            alert(`Failed to export logs: ${error.message}`);
        });
    };

    // Initial load
    window.addEventListener('load', () => {
        logDebug('Window loaded, initializing');
        loadClientIds();
        loadLogs();
    });
})();
