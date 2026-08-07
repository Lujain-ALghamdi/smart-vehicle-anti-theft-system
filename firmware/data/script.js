// ========== Initialization & Global Variables ==========
const esp32BaseURL = `http://${window.location.hostname}`;
let systemChart;
let currentCoords = { lat: 24.713552, lng: 46.675274 };
let inputPassword = '';
const correctPassword = '1234';
let systemStatus = {
    tilt: false,
    relay: false,
    buzzer: false,
    theftAlert: false,
    theftType: '',
    failedAttempts: 0,
    systemArmed: true
};
const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
let connectionInterval;
let updateInterval;

// Chart data storage
let chartData = {
    timestamps: [],
    tiltValues: [],
    alertValues: [],
    attemptValues: [],
    relayValues: []
};

// Chart configuration
const chartConfigs = {
    sensors: {
        type: 'line',
        label: 'Sensors Data',
        datasets: [
            {
                label: 'Tilt Sensor',
                data: [],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Alarm Status',
                data: [],
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    },
    security: {
        type: 'bar',
        label: 'Security Status',
        datasets: [
            {
                label: 'Security Level',
                data: [],
                backgroundColor: 'rgba(139, 92, 246, 0.7)',
                borderColor: '#8B5CF6',
                borderWidth: 1
            }
        ]
    },
    attempts: {
        type: 'line',
        label: 'Access Attempts',
        datasets: [
            {
                label: 'Failed Attempts',
                data: [],
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    },
    history: {
        type: 'line',
        label: 'System History',
        datasets: [
            {
                label: 'Tilt Events',
                data: [],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Alarm Events',
                data: [],
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Unlock Events',
                data: [],
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    }
};

// ========== Page Initialization ==========
document.addEventListener('DOMContentLoaded', function() {
    // Set page load time
    const pageLoadTime = document.getElementById('pageLoadTime');
    if (pageLoadTime) {
        pageLoadTime.textContent = new Date().toLocaleString();
    }
    
    // Initialize components
    initChart();
    initKeypad();
    initEventLog();
    initConnection();
    
    // Start auto-update
    startAutoUpdate();
    
    // Initialize chart data
    initializeChartData();
    
    // Log loading event
    logEvent('Control panel loaded successfully', 'success');
    logEvent('Connecting to ESP32 system...', 'info');
});

// ========== Chart Functions ==========
function initChart() {
    try {
        const ctx = document.getElementById('systemChart').getContext('2d');
        
        // Dark theme configuration
        Chart.defaults.color = '#94A3B8';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
        
        systemChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: chartConfigs.sensors.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#F1F5F9',
                            font: {
                                family: 'Poppins'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 31, 46, 0.9)',
                        titleColor: '#F1F5F9',
                        bodyColor: '#F1F5F9',
                        borderColor: '#3B82F6',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#94A3B8'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#94A3B8',
                            callback: function(value) {
                                return value;
                            }
                        },
                        min: 0,
                        max: 1
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        });
        
        logEvent('Chart system initialized successfully', 'success');
    } catch (error) {
        logEvent('Chart initialization failed: ' + error.message, 'danger');
        console.error('Chart error:', error);
    }
}

function initializeChartData() {
    // Generate initial data points
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 1000);
        chartData.timestamps.push(time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
        chartData.tiltValues.push(Math.random() > 0.8 ? 1 : 0);
        chartData.alertValues.push(Math.random() > 0.9 ? 1 : 0);
        chartData.attemptValues.push(Math.random() > 0.95 ? 1 : 0);
        chartData.relayValues.push(Math.random() > 0.7 ? 1 : 0);
    }
    
    updateChart('sensors');
}

function updateChart(type) {
    if (!systemChart) return;
    
    const config = chartConfigs[type];
    systemChart.data.labels = chartData.timestamps.slice(-30);
    
    // Update datasets based on type
    config.datasets.forEach((dataset, index) => {
        if (type === 'sensors') {
            if (index === 0) dataset.data = chartData.tiltValues.slice(-30);
            if (index === 1) dataset.data = chartData.alertValues.slice(-30);
        } else if (type === 'security') {
            dataset.data = chartData.alertValues.slice(-30);
        } else if (type === 'attempts') {
            dataset.data = chartData.attemptValues.slice(-30);
        } else if (type === 'history') {
            if (index === 0) dataset.data = chartData.tiltValues.slice(-30);
            if (index === 1) dataset.data = chartData.alertValues.slice(-30);
            if (index === 2) dataset.data = chartData.relayValues.slice(-30);
        }
    });
    
    systemChart.options.scales.y.max = type === 'sensors' || type === 'history' ? 1 : Math.max(...chartData.attemptValues.slice(-30)) + 1;
    systemChart.update();
    
    // Update chart stats
    updateChartStats();
}

function changeChart(type) {
    // Update active button
    document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Change chart type
    systemChart.data.datasets = chartConfigs[type].datasets;
    systemChart.type = chartConfigs[type].type;
    
    updateChart(type);
    logEvent(`Switched to ${chartConfigs[type].label} chart`, 'info');
}

function updateChartStats() {
    const sensorValue = document.getElementById('sensorValue');
    const alertValue = document.getElementById('alertValue');
    const attemptValue = document.getElementById('attemptValue');
    const uptimeValue = document.getElementById('uptimeValue');
    
    if (sensorValue) {
        const tiltCount = chartData.tiltValues.filter(v => v === 1).length;
        sensorValue.textContent = tiltCount;
        sensorValue.style.color = tiltCount > 0 ? '#EF4444' : '#10B981';
    }
    
    if (alertValue) {
        const alertCount = chartData.alertValues.filter(v => v === 1).length;
        alertValue.textContent = alertCount;
        alertValue.style.color = alertCount > 0 ? '#EF4444' : '#10B981';
    }
    
    if (attemptValue) {
        const attemptCount = chartData.attemptValues.filter(v => v === 1).length;
        attemptValue.textContent = attemptCount;
        attemptValue.style.color = attemptCount > 0 ? '#F59E0B' : '#10B981';
    }
    
    if (uptimeValue) {
        const uptime = 100 - (chartData.alertValues.filter(v => v === 1).length / chartData.alertValues.length * 100);
        uptimeValue.textContent = `${Math.max(0, uptime).toFixed(1)}%`;
        uptimeValue.style.color = uptime > 90 ? '#10B981' : uptime > 70 ? '#F59E0B' : '#EF4444';
    }
}

function exportChartData() {
    const dataStr = JSON.stringify(chartData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `car-security-data-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    logEvent('Chart data exported successfully', 'success');
}

// ========== GPS Coordinates Functions ==========
function openGoogleMaps() {
    const url = `https://www.google.com/maps/search/?api=1&query=${currentCoords.lat},${currentCoords.lng}`;
    window.open(url, '_blank');
    logEvent('Opened Google Maps with current coordinates', 'info');
}

function copyCoordinates() {
    const coordsText = `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`;
    
    navigator.clipboard.writeText(coordsText)
        .then(() => {
            logEvent('Coordinates copied to clipboard', 'success');
            
            // Show confirmation message
            const coordsElement = document.getElementById('coordinates');
            if (coordsElement) {
                const originalText = coordsElement.textContent;
                coordsElement.textContent = '✓ Copied!';
                coordsElement.style.color = '#10B981';
                
                setTimeout(() => {
                    coordsElement.textContent = originalText;
                    coordsElement.style.color = '';
                }, 2000);
            }
        })
        .catch(err => {
            logEvent('Failed to copy coordinates: ' + err, 'danger');
        });
}

// ========== Virtual Keypad ==========
function initKeypad() {
    try {
        const keypadEl = document.getElementById('virtualKeypad');
        if (!keypadEl) {
            console.error('Keypad element not found');
            return;
        }
        
        keypadKeys.forEach(key => {
            const keyEl = document.createElement('div');
            keyEl.className = 'keypad-key';
            keyEl.textContent = key;
            keyEl.dataset.key = key;
            
            if (key === '#') {
                keyEl.classList.add('enter');
                keyEl.innerHTML = '<i class="fas fa-check"></i> Confirm';
            } else if (key === '*') {
                keyEl.classList.add('clear');
                keyEl.innerHTML = '<i class="fas fa-times"></i> Clear';
            }
            
            keyEl.addEventListener('click', () => handleVirtualKey(key));
            keypadEl.appendChild(keyEl);
        });
        
        logEvent('Virtual keypad initialized', 'success');
    } catch (error) {
        console.error('Keypad initialization error:', error);
        logEvent('Keypad initialization failed', 'danger');
    }
}

function handleVirtualKey(key) {
    // Click effect
    const keyElement = document.querySelector(`[data-key="${key}"]`);
    if (keyElement) {
        keyElement.style.transform = 'translateY(2px)';
        setTimeout(() => {
            keyElement.style.transform = '';
        }, 100);
    }
    
    if (key === '#') {
        submitPassword();
    } else if (key === '*') {
        clearPassword();
    } else if (inputPassword.length < 4) {
        inputPassword += key;
        updatePasswordDisplay();
        logEvent(`Entered digit: ${key}`, 'info');
    } else {
        // Password is full
        const passwordDisplay = document.getElementById('passwordDisplay');
        if (passwordDisplay) {
            passwordDisplay.classList.add('shake');
            setTimeout(() => {
                passwordDisplay.classList.remove('shake');
            }, 500);
        }
    }
}

function updatePasswordDisplay() {
    const passwordDisplay = document.getElementById('passwordDisplay');
    if (!passwordDisplay) return;
    
    let display = '';
    for (let i = 0; i < 4; i++) {
        if (i < inputPassword.length) {
            display += inputPassword[i];
        } else {
            display += '•';
        }
        if (i < 3) display += ' ';
    }
    passwordDisplay.textContent = display;
}

function clearPassword() {
    inputPassword = '';
    updatePasswordDisplay();
    logEvent('Password input cleared', 'info');
}

function submitPassword() {
    const passwordDisplay = document.getElementById('passwordDisplay');
    if (!passwordDisplay) return;
    
    if (inputPassword.length !== 4) {
        logEvent('Password must be 4 digits', 'warning');
        passwordDisplay.classList.add('shake');
        setTimeout(() => {
            passwordDisplay.classList.remove('shake');
        }, 500);
        return;
    }
    
    logEvent(`Unlock attempt: Password [${inputPassword}] entered`, 'info');
    
    if (inputPassword === correctPassword) {
        // Success
        sendCommand('relay', 'on');
        logEvent('✅ Password correct - Car unlocked', 'success');
        systemStatus.failedAttempts = 0;
        updateSystemStatusDisplay();
        
        // Update chart data
        chartData.relayValues.push(1);
        updateChart(systemChart.type === 'line' ? 'sensors' : systemChart.type);
        
        // Success effect
        passwordDisplay.style.color = '#10B981';
        setTimeout(() => {
            passwordDisplay.style.color = '';
        }, 2000);
        
        inputPassword = '';
        updatePasswordDisplay();
    } else {
        // Failure
        systemStatus.failedAttempts++;
        updateSystemStatusDisplay();
        logEvent('❌ Wrong password', 'danger');
        
        // Update chart data
        chartData.attemptValues.push(1);
        updateChart(systemChart.type === 'line' ? 'sensors' : systemChart.type);
        
        // Failure effect
        passwordDisplay.style.color = '#EF4444';
        passwordDisplay.classList.add('shake');
        setTimeout(() => {
            passwordDisplay.style.color = '';
            passwordDisplay.classList.remove('shake');
        }, 1000);
        
        if (systemStatus.failedAttempts >= 3) {
            logEvent('🚨 Alert: 3 consecutive failed attempts (possible theft)', 'danger');
            sendCommand('buzzer', 'on');
            setTimeout(() => sendCommand('buzzer', 'off'), 5000);
        }
        
        inputPassword = '';
        updatePasswordDisplay();
    }
}

// ========== System Connection ==========
function initConnection() {
    const connectionDot = document.getElementById('connectionDot');
    const connectionText = document.getElementById('connectionText');
    const ipAddress = document.getElementById('ipAddress');
    
    // Simulate ESP32 connection
    setTimeout(() => {
        if (connectionDot) connectionDot.classList.add('connected');
        if (connectionText) connectionText.textContent = 'Connected';
        if (ipAddress) ipAddress.textContent = window.location.hostname;
        
        logEvent('✅ Connected to ESP32 Car Security System', 'success');
        
        // Get initial status
        getSystemStatus();
    }, 2000);
    
    // Monitor connection
    connectionInterval = setInterval(checkConnection, 10000);
}

function checkConnection() {
    fetch(`${esp32BaseURL}/api/status`, { timeout: 3000 })
        .then(response => {
            if (!response.ok) throw new Error('Connection failed');
            
            const connectionDot = document.getElementById('connectionDot');
            const connectionText = document.getElementById('connectionText');
            
            if (connectionDot && connectionText) {
                if (!connectionDot.classList.contains('connected')) {
                    connectionDot.classList.add('connected');
                    connectionText.textContent = 'Connected';
                    logEvent('✅ Reconnected to ESP32 system', 'success');
                }
            }
        })
        .catch(error => {
            const connectionDot = document.getElementById('connectionDot');
            const connectionText = document.getElementById('connectionText');
            
            if (connectionDot && connectionText) {
                if (connectionDot.classList.contains('connected')) {
                    connectionDot.classList.remove('connected');
                    connectionText.textContent = 'Disconnected';
                    logEvent('⚠️ Lost connection to ESP32 system', 'warning');
                }
            }
        });
}

function startAutoUpdate() {
    // Update status every 3 seconds
    updateInterval = setInterval(() => {
        getSystemStatus();
        updateChartData();
    }, 3000);
}

function updateChartData() {
    const now = new Date();
    const time = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Add new data point
    chartData.timestamps.push(time);
    chartData.tiltValues.push(systemStatus.tilt ? 1 : 0);
    chartData.alertValues.push(systemStatus.theftAlert ? 1 : 0);
    chartData.attemptValues.push(systemStatus.failedAttempts > 0 ? 1 : 0);
    chartData.relayValues.push(systemStatus.relay ? 1 : 0);
    
    // Keep only last 50 data points
    const maxPoints = 50;
    if (chartData.timestamps.length > maxPoints) {
        chartData.timestamps = chartData.timestamps.slice(-maxPoints);
        chartData.tiltValues = chartData.tiltValues.slice(-maxPoints);
        chartData.alertValues = chartData.alertValues.slice(-maxPoints);
        chartData.attemptValues = chartData.attemptValues.slice(-maxPoints);
        chartData.relayValues = chartData.relayValues.slice(-maxPoints);
    }
    
    // Update chart
    updateChart(systemChart.type === 'line' ? 'sensors' : systemChart.type);
    
    const chartLastUpdate = document.getElementById('chartLastUpdate');
    if (chartLastUpdate) {
        chartLastUpdate.textContent = 'Just now';
    }
}

// ========== System Status ==========
function getSystemStatus() {
    // Actual request to ESP32 (currently simulated)
    fetch(`${esp32BaseURL}/api/status`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            systemStatus = data;
            updateSystemStatusDisplay();
            
            // Update coordinates display
            const coordinatesElement = document.getElementById('coordinates');
            if (coordinatesElement) {
                coordinatesElement.textContent = 
                    `${data.gpsLat.toFixed(6)}, ${data.gpsLng.toFixed(6)}`;
                currentCoords.lat = data.gpsLat;
                currentCoords.lng = data.gpsLng;
            }
            
            const statusUpdateTime = document.getElementById('statusUpdateTime');
            if (statusUpdateTime) {
                statusUpdateTime.textContent = 'Just now';
            }
        })
        .catch(error => {
            // Use mock data if connection fails
            const mockData = {
                tilt: Math.random() > 0.8,
                relay: inputPassword === correctPassword,
                buzzer: false,
                theftAlert: systemStatus.theftAlert,
                theftType: systemStatus.theftType,
                failedAttempts: systemStatus.failedAttempts,
                systemArmed: systemStatus.systemArmed,
                gpsLat: currentCoords.lat + (Math.random() - 0.5) * 0.001,
                gpsLng: currentCoords.lng + (Math.random() - 0.5) * 0.001
            };
            
            systemStatus = mockData;
            updateSystemStatusDisplay();
        });
}

function updateSystemStatusDisplay() {
    const statusItems = [
        {
            id: 'tilt',
            title: 'Tilt Sensor',
            status: systemStatus.tilt ? 'Active' : 'Inactive',
            desc: systemStatus.tilt ? 'Car tilt detected' : 'Car is stable',
            icon: 'fas fa-car-crash',
            value: systemStatus.tilt ? '🚨 Tilted' : '✅ Normal',
            type: systemStatus.tilt ? 'danger' : 'safe'
        },
        {
            id: 'relay',
            title: 'Car Lock',
            status: systemStatus.relay ? 'Open' : 'Locked',
            desc: systemStatus.relay ? 'Car is unlocked' : 'Car is locked',
            icon: systemStatus.relay ? 'fas fa-unlock' : 'fas fa-lock',
            value: systemStatus.relay ? '🔓 Unlocked' : '🔒 Locked',
            type: systemStatus.relay ? 'safe' : 'warning'
        },
        {
            id: 'buzzer',
            title: 'Alarm (Buzzer)',
            status: systemStatus.buzzer ? 'Active' : 'Inactive',
            desc: systemStatus.buzzer ? 'Alarm is active' : 'Alarm is ready',
            icon: 'fas fa-bell',
            value: systemStatus.buzzer ? '🔊 Active' : '🔇 Quiet',
            type: systemStatus.buzzer ? 'warning' : 'safe'
        },
        {
            id: 'security',
            title: 'Security Status',
            status: systemStatus.theftAlert ? 'Warning' : 'Safe',
            desc: systemStatus.theftAlert ? systemStatus.theftType : 'No threats detected',
            icon: systemStatus.theftAlert ? 'fas fa-exclamation-triangle' : 'fas fa-shield-alt',
            value: systemStatus.theftAlert ? '🚨 Danger' : '✅ Safe',
            type: systemStatus.theftAlert ? 'danger' : 'safe'
        }
    ];
    
    const statusHTML = statusItems.map(item => `
        <div class="status-item ${item.type}">
            <div class="status-icon">
                <i class="${item.icon}"></i>
            </div>
            <div class="status-info">
                <h3>${item.title}</h3>
                <p>${item.desc}</p>
                <div class="status-value">${item.value}</div>
            </div>
        </div>
    `).join('');
    
    const systemStatusElement = document.getElementById('systemStatus');
    if (systemStatusElement) {
        systemStatusElement.innerHTML = statusHTML;
    }
    
    const attemptsCount = document.getElementById('attemptsCount');
    if (attemptsCount) {
        attemptsCount.textContent = systemStatus.failedAttempts;
    }
    
    // Update system status
    const systemArmedElement = document.getElementById('systemArmedStatus');
    const armButtonText = document.getElementById('armButtonText');
    
    if (systemArmedElement && armButtonText) {
        if (systemStatus.systemArmed) {
            systemArmedElement.innerHTML = '<i class="fas fa-lock" style="color: var(--accent-red);"></i> System Armed';
            armButtonText.textContent = 'Disarm System';
        } else {
            systemArmedElement.innerHTML = '<i class="fas fa-lock-open" style="color: var(--accent-green);"></i> System Disarmed';
            armButtonText.textContent = 'Arm System';
        }
    }
    
    // Update attempts counter
    const attemptsCounter = document.getElementById('attemptsCounter');
    if (attemptsCounter) {
        if (systemStatus.failedAttempts >= 3) {
            attemptsCounter.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: var(--accent-red);"></i> Attempts: <span style="color: var(--accent-red);">' + systemStatus.failedAttempts + '</span>/3';
        } else if (systemStatus.failedAttempts >= 1) {
            attemptsCounter.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: var(--accent-amber);"></i> Attempts: <span style="color: var(--accent-amber);">' + systemStatus.failedAttempts + '</span>/3';
        } else {
            attemptsCounter.innerHTML = '<i class="fas fa-check-circle" style="color: var(--accent-green);"></i> Attempts: <span>' + systemStatus.failedAttempts + '</span>/3';
        }
    }
}

// ========== Command Sending ==========
function sendCommand(device, action) {
    const commands = {
        'relay:on': { device: 'Relay', action: 'on', msg: 'Unlock car' },
        'relay:off': { device: 'Relay', action: 'off', msg: 'Lock car' },
        'buzzer:on': { device: 'Buzzer', action: 'on', msg: 'Turn on alarm' },
        'buzzer:off': { device: 'Buzzer', action: 'off', msg: 'Turn off alarm' },
        'buzzer:toggle': { device: 'Buzzer', action: 'toggle', msg: 'Test alarm' }
    };
    
    const key = `${device}:${action}`;
    const cmd = commands[key] || { device, action, msg: `Send command to ${device}` };
    
    logEvent(`Command: ${cmd.msg}`, 'info');
    
    // Send actual command to ESP32
    fetch(`${esp32BaseURL}/api/${device}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `state=${action}`
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
    })
    .then(data => {
        logEvent(`Command executed: ${cmd.msg}`, 'success');
        
        // Update status after command
        setTimeout(getSystemStatus, 500);
    })
    .catch(error => {
        logEvent(`Failed to send command: ${error.message}`, 'danger');
    });
}

function toggleSystemArm() {
    systemStatus.systemArmed = !systemStatus.systemArmed;
    
    if (systemStatus.systemArmed) {
        logEvent('Security system armed', 'success');
        sendCommand('relay', 'off'); // Lock car
    } else {
        logEvent('Security system disarmed', 'warning');
    }
    
    updateSystemStatusDisplay();
}

function resetSystem() {
    if (confirm('Are you sure you want to reset the system?')) {
        systemStatus.failedAttempts = 0;
        systemStatus.theftAlert = false;
        systemStatus.systemArmed = true;
        inputPassword = '';
        
        updatePasswordDisplay();
        updateSystemStatusDisplay();
        
        sendCommand('relay', 'off');
        sendCommand('buzzer', 'off');
        
        logEvent('System reset to default state', 'success');
    }
}

function emergencyStop() {
    if (confirm('⚠️ This is an emergency action! Stop all systems?')) {
        systemStatus.theftAlert = false;
        systemStatus.systemArmed = false;
        
        sendCommand('relay', 'off');
        sendCommand('buzzer', 'off');
        
        logEvent('Emergency stop executed - All systems stopped', 'danger');
        updateSystemStatusDisplay();
    }
}

// ========== Event Log ==========
function initEventLog() {
    logEvent('🚗 Advanced Car Security System - Ready', 'success');
    logEvent('Advanced control panel loaded', 'info');
    logEvent('Analytics dashboard initialized', 'info');
}

function logEvent(message, type = 'info') {
    try {
        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const typeIcons = {
            'info': { icon: 'fas fa-info-circle', color: '#3B82F6' },
            'success': { icon: 'fas fa-check-circle', color: '#10B981' },
            'warning': { icon: 'fas fa-exclamation-triangle', color: '#F59E0B' },
            'danger': { icon: 'fas fa-times-circle', color: '#EF4444' }
        };
        
        const typeConfig = typeIcons[type] || typeIcons.info;
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `
            <div class="log-time">${time}</div>
            <div class="log-icon">
                <i class="${typeConfig.icon}" style="color: ${typeConfig.color};"></i>
            </div>
            <div class="log-message">${message}</div>
        `;
        
        const logContainer = document.getElementById('eventLog');
        if (logContainer) {
            logContainer.insertBefore(entry, logContainer.firstChild);
            
            // Keep only 20 events
            if (logContainer.children.length > 20) {
                logContainer.removeChild(logContainer.lastChild);
            }
            
            // Fade-in animation
            entry.style.animation = 'fadeIn 0.3s ease';
        }
    } catch (error) {
        console.error('Error logging event:', error);
    }
}

function clearLog() {
    if (confirm('Clear all event logs?')) {
        const logContainer = document.getElementById('eventLog');
        if (logContainer) {
            logContainer.innerHTML = '';
            logEvent('Event log cleared', 'info');
        }
    }
}

// ========== Error Handling ==========
window.addEventListener('error', function(event) {
    logEvent(`System error: ${event.message}`, 'danger');
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    logEvent(`Promise rejection: ${event.reason}`, 'danger');
    console.error('Unhandled rejection:', event.reason);
});

window.addEventListener('offline', function() {
    logEvent('Internet connection lost', 'warning');
});

window.addEventListener('online', function() {
    logEvent('Internet connection restored', 'success');
});