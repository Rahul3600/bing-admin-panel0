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
        console.log(`[AdminPanel] ${message}`);
    }

    // Show Feedback
    function showFeedback(elementId, message, isError = false) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `mt-2 text-sm ${isError ? 'text-red-400' : 'text-green-400'}`;
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
        showFeedback('phrasesFeedback', 'Firebase setup failed. Check configuration.', true);
    }

    // Authenticate
    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                logDebug(`Authenticated as anonymous user: ${user.uid}`);
                // Retry initial loads after authentication
                loadClientIds();
                loadLogs();
            } else {
                logDebug('No user authenticated. Attempting anonymous sign-in...');
                auth.signInAnonymously()
                    .then(() => logDebug('Anonymous sign-in successful'))
                    .catch(error => {
                        logDebug(`Auth error: ${error.code} - ${error.message}`);
                        showFeedback('phrasesFeedback', `Authentication failed: ${error.message}. Enable anonymous sign-in in Firebase Console.`, true);
                    });
            }
        });
    } else {
        logDebug('Firebase Auth not initialized.');
        showFeedback('phrasesFeedback', 'Firebase Auth not initialized.', true);
    }

    // Validate Client ID
    function isValidClientId(clientId) {
        const regex = /^[a-zA-Z0-9]{3,20}$/;
        return regex.test(clientId);
    }

    // Toggle Section Visibility
    window.toggleSection = function(section) {
        const content = document.getElementById(`${section}-content`);
        const icon = document.getElementById(`${section}-icon`);
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>';
        } else {
            content.classList.add('hidden');
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>';
        }
    };

    // Save Search Phrases
    window.saveSearchTerms = function() {
        if (!database || !auth.currentUser) {
            showFeedback('searchTermsFeedback', 'Not authenticated or database not initialized.', true);
            return;
        }
        const termsInput = document.getElementById('searchTerms').value;
        let terms = termsInput.split('\n').map(term => term.trim()).filter(term => term);
        if (terms.length === 0) {
            showFeedback('searchTermsFeedback', 'Enter at least one phrase.', true);
            return;
        }
        terms = [...new Set(terms)]; // Remove duplicates
        logDebug(`Saving ${terms.length} phrases`);
        showFeedback('searchTermsFeedback', 'Saving...');
        database.ref('searchTerms').set(terms)
            .then(() => {
                logDebug('Phrases saved');
                showFeedback('searchTermsFeedback', 'Phrases saved!');
                document.getElementById('searchTerms').value = terms.join('\n');
            })
            .catch(error => {
                logDebug(`Save failed: ${error.message}`);
                showFeedback('searchTermsFeedback', `Failed: ${error.message}`, true);
            });
    };

    // Clear Search Phrases
    window.clearSearchTerms = function() {
        if (!database || !auth.currentUser) {
            showFeedback('searchTermsFeedback', 'Not authenticated or database not initialized.', true);
            return;
        }
        if (!confirm('Clear all search phrases?')) {
            logDebug('Clear cancelled');
            return;
        }
        logDebug('Clearing phrases');
        showFeedback('searchTermsFeedback', 'Clearing...');
        database.ref('searchTerms').remove()
            .then(() => {
                logDebug('Phrases cleared');
                showFeedback('searchTermsFeedback', 'Phrases cleared!');
                document.getElementById('searchTerms').value = '';
            })
            .catch(error => {
                logDebug(`Clear failed: ${error.message}`);
                showFeedback('searchTermsFeedback', `Failed: ${error.message}`, true);
            });
    };

    // Add Client ID
    window.addClientId = function() {
        if (!database || !auth.currentUser) {
            showFeedback('clientFeedback', 'Not authenticated or database not initialized.', true);
            return;
        }
        const clientId = document.getElementById('clientId').value.trim();
        if (!clientId) {
            showFeedback('clientFeedback', 'Enter a Client ID.', true);
            return;
        }
        if (!isValidClientId(clientId)) {
            showFeedback('clientFeedback', 'ID must be 3-20 alphanumeric characters.', true);
            return;
        }
        logDebug(`Checking client: ${clientId}`);
        showFeedback('clientFeedback', 'Checking...');
        database.ref('clients/' + clientId).once('value', snapshot => {
            if (snapshot.exists()) {
                logDebug(`Client ${clientId} exists`);
                showFeedback('clientFeedback', 'Client ID already exists.', true);
                return;
            }
            database.ref('clients/' + clientId).set({
                enabled: true,
                lastUsed: new Date().toISOString()
            }).then(() => {
                logDebug(`Client ${clientId} added`);
                showFeedback('clientFeedback', `Client ${clientId} added!`);
                document.getElementById('clientId').value = '';
                loadClientIds();
            }).catch(error => {
                logDebug(`Add failed: ${error.message}`);
                showFeedback('clientFeedback', `Failed: ${error.message}`, true);
            });
        }).catch(error => {
            logDebug(`Check failed: ${error.message}`);
            showFeedback('clientFeedback', `Error: ${error.message}`, true);
        });
    };

    // Toggle Client Status
    window.toggleClientStatus = function() {
        if (!database || !auth.currentUser) {
            showFeedback('clientFeedback', 'Not authenticated or database not initialized.', true);
            return;
        }
        const clientId = document.getElementById('clientId').value.trim();
        if (!clientId) {
            showFeedback('clientFeedback', 'Enter a Client ID.', true);
            return;
        }
        if (!isValidClientId(clientId)) {
            showFeedback('clientFeedback', 'ID must be 3-20 alphanumeric characters.', true);
            return;
        }
        logDebug(`Toggling client: ${clientId}`);
        showFeedback('clientFeedback', 'Toggling...');
        database.ref('clients/' + clientId).once('value', snapshot => {
            const data = snapshot.val();
            if (data) {
                database.ref('clients/' + clientId).update({
                    enabled: !data.enabled
                }).then(() => {
                    logDebug(`Client ${clientId} ${data.enabled ? 'disabled' : 'enabled'}`);
                    showFeedback('clientFeedback', `Client ${clientId} ${data.enabled ? 'disabled' : 'enabled'}`);
                    loadClientIds();
                }).catch(error => {
                    logDebug(`Toggle failed: ${error.message}`);
                    showFeedback('clientFeedback', `Failed: ${error.message}`, true);
                });
            } else {
                logDebug(`Client ${clientId} not found`);
                showFeedback('clientFeedback', 'Client not found.', true);
            }
        }).catch(error => {
            logDebug(`Fetch failed: ${error.message}`);
            showFeedback('clientFeedback', `Error: ${error.message}`, true);
        });
    };

    // Delete Client
    window.deleteClient = function() {
        if (!database || !auth.currentUser) {
            showFeedback('clientFeedback', 'Not authenticated or database not initialized.', true);
            return;
        }
        const clientId = document.getElementById('clientId').value.trim();
        if (!clientId) {
            showFeedback('clientFeedback', 'Enter a Client ID.', true);
            return;
        }
        if (!isValidClientId(clientId)) {
            showFeedback('clientFeedback', 'ID must be 3-20 alphanumeric characters.', true);
            return;
        }
        if (!confirm(`Delete client ${clientId}?`)) {
            logDebug('Delete cancelled');
            return;
        }
        logDebug(`Deleting client: ${clientId}`);
        showFeedback('clientFeedback', 'Deleting...');
        database.ref('clients/' + clientId).remove()
            .then(() => {
                logDebug(`Client ${clientId} deleted`);
                showFeedback('clientFeedback', `Client ${clientId} deleted!`);
                document.getElementById('clientId').value = '';
                loadClientIds();
            })
            .catch(error => {
                logDebug(`Delete failed: ${error.message}`);
                showFeedback('clientFeedback', `Failed: ${error.message}`, true);
            });
    };

    // Bulk Toggle Clients
    window.bulkToggleClients = function() {
        if (!database || !auth.currentUser) {
            showFeedback('clientFeedback', 'Not authenticated or database not initialized.', true);
            return;
        }
        const selectedClients = Array.from(document.querySelectorAll('input[name="clientSelect"]:checked')).map(input => input.value);
        if (selectedClients.length === 0) {
            showFeedback('clientFeedback', 'Select at least one client.', true);
            return;
        }
        logDebug(`Toggling ${selectedClients.length} clients`);
        showFeedback('clientFeedback', 'Toggling...');
        Promise.all(selectedClients.map(clientId => 
            database.ref('clients/' + clientId).once('value').then(snapshot => {
                const data = snapshot.val();
                if (data) {
                    return database.ref('clients/' + clientId).update({ enabled: !data.enabled });
                }
            })
        )).then(() => {
            logDebug('Bulk toggle complete');
            showFeedback('clientFeedback', 'Clients toggled!');
            loadClientIds();
        }).catch(error => {
            logDebug(`Bulk toggle failed: ${error.message}`);
            showFeedback('clientFeedback', `Failed: ${error.message}`, true);
        });
    };

    // Load Client IDs
    window.refreshClients = function() {
        loadClientIds();
    };

    function loadClientIds() {
        if (!database || !auth.currentUser) {
            showFeedback('clientFeedback', 'Not authenticated or database not initialized.', true);
            return;
        }
        logDebug('Loading clients');
        database.ref('clients').once('value', snapshot => {
            const clientList = document.getElementById('clientList');
            clientList.innerHTML = '';
            snapshot.forEach(child => {
                const li = document.createElement('li');
                li.className = 'flex items-center p-2';
                li.innerHTML = `
                    <input type="checkbox" name="clientSelect" value="${child.key}" class="mr-2">
                    ${child.key} (${child.val().enabled ? 'Enabled' : 'Disabled'}, Last used: ${child.val().lastUsed || 'Never'})
                `;
                clientList.appendChild(li);
            });
            logDebug('Clients loaded');
            showFeedback('clientFeedback', 'Clients loaded.');
        }).catch(error => {
            logDebug(`Load clients failed: ${error.message}`);
            showFeedback('clientFeedback', `Failed: ${error.message}`, true);
        });
    }

    // Load Logs
    window.refreshLogs = function() {
        loadLogs();
    };

    function loadLogs(filter = '') {
        if (!database || !auth.currentUser) {
            showFeedback('logFeedback', 'Not authenticated or database not initialized.', true);
            return;
        }
        logDebug('Loading logs');
        showFeedback('logFeedback', 'Loading...');
        database.ref('logs').limitToLast(50).once('value', snapshot => {
            const logList = document.getElementById('logList');
            logList.innerHTML = '';
            snapshot.forEach(child => {
                const log = child.val();
                if (filter && !log.clientId.includes(filter) && !log.term.includes(filter)) return;
                const div = document.createElement('div');
                div.className = 'p-2';
                div.textContent = `${log.clientId}: ${log.term} (${log.timestamp})`;
                logList.appendChild(div);
            });
            logDebug('Logs loaded');
            showFeedback('logFeedback', 'Logs loaded.');
        }).catch(error => {
            logDebug(`Load logs failed: ${error.message}`);
            showFeedback('logFeedback', `Failed: ${error.message}`, true);
        });
    }

    // Export Logs
    window.exportLogs = function() {
        if (!database || !auth.currentUser) {
            showFeedback('logFeedback', 'Not authenticated or database not initialized.', true);
            return;
        }
        logDebug('Exporting logs');
        showFeedback('logFeedback', 'Exporting...');
        database.ref('logs').once('value', snapshot => {
            const logs = [];
            snapshot.forEach(child => {
                logs.push(`${child.val().clientId}: ${child.val().term} (${child.val().timestamp})`);
            });
            if (logs.length === 0) {
                logDebug('No logs to export');
                showFeedback('logFeedback', 'No logs available.', true);
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
            showFeedback('logFeedback', 'Logs exported!');
        }).catch(error => {
            logDebug(`Export failed: ${error.message}`);
            showFeedback('logFeedback', `Failed: ${error.message}`, true);
        });
    };

    // Load Stats
    window.loadStats = function() {
        if (!database || !auth.currentUser) {
            showFeedback('statsFeedback', 'Not authenticated or database not initialized.', true);
            return;
        }
        logDebug('Loading stats');
        showFeedback('statsFeedback', 'Loading...');
        database.ref('logs').once('value', snapshot => {
            const stats = {};
            snapshot.forEach(child => {
                const term = child.val().term;
                stats[term] = (stats[term] || 0) + 1;
            });
            const statsList = document.getElementById('statsList');
            statsList.innerHTML = '';
            Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([term, count]) => {
                const div = document.createElement('div');
                div.className = 'p-2';
                div.textContent = `${term}: ${count} uses`;
                statsList.appendChild(div);
            });
            logDebug('Stats loaded');
            showFeedback('statsFeedback', 'Stats loaded.');
        }).catch(error => {
            logDebug(`Load stats failed: ${error.message}`);
            showFeedback('statsFeedback', `Failed: ${error.message}`, true);
        });
    };

    // Real-time Log Search
    document.getElementById('logSearch').addEventListener('input', (e) => {
        loadLogs(e.target.value.trim());
    });

    // Real-time Client ID Validation
    document.getElementById('clientId').addEventListener('input', (e) => {
        const clientId = e.target.value.trim();
        if (clientId && !isValidClientId(clientId)) {
            showFeedback('clientFeedback', 'ID must be 3-20 alphanumeric characters.', true);
        } else {
            showFeedback('clientFeedback', '');
        }
    });

    // Initial Load
    window.addEventListener('load', () => {
        logDebug('Window loaded, initializing');
        // Defer loading until authenticated
    });
})();
