// Global variables
let currentBroker = null;
let brokerSymbols = [];
let isAutoTradeEnabled = false;
let authToken = '';

const brokers = {
    ironbeam: {
        baseUrl: 'https://demo.ironbeamapi.com/v1',
        username: '51364396',
        password: '271264',
        apiKey: '136bdde6773045ef86aa4026e6edddb4'
    },
    oanda: {
        baseUrl: 'https://api-fxpractice.oanda.com',
        accountId: '101-004-25302801-001',
        apiKey: '70ae8130c7ee5daa27aa6b8ccaacbe7e-03b707a7a88079144d12d5e93c1a626e'
    },
    alpaca: {
        baseUrl: 'https://broker-api.sandbox.alpaca.markets',
        apiKey: 'CK9MIT1E1KNQ0MPTT3EF',
        apiSecret: 'A5ge9mB9eugJejr3gfHQvZPQukTbXk7g44qefWJ9'
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('toggleBrokerInfo').addEventListener('click', toggleBrokerInfo);
    document.getElementById('brokerSelect').addEventListener('change', changeBroker);
    document.getElementById('connectBtn').addEventListener('click', connectToBroker);
    document.getElementById('placeTrade').addEventListener('click', placeTrade);
    document.getElementById('executeAiTrade').addEventListener('click', executeAiTrade);
    document.getElementById('autoTradeCheck').addEventListener('change', toggleAutoTrade);
    document.getElementById('symbol').addEventListener('change', fetchInstrumentPrice);
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => fetchMarketData(tab.dataset.market));
    });
    document.querySelectorAll('.trade-btn').forEach(btn => {
        btn.addEventListener('click', handleTradeButtonClick);
    });
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const themeIcon = document.getElementById('themeToggle');
    themeIcon.textContent = document.body.classList.contains('light-theme') ? '🌙' : ☀️';
}

function toggleBrokerInfo() {
    const brokerInfo = document.getElementById('brokerInfo');
    brokerInfo.classList.toggle('hidden');
}

function changeBroker() {
    currentBroker = document.getElementById('brokerSelect').value;
    document.getElementById('connectionStatus').textContent = 'Disconnected';
    document.getElementById('connectionStatus').style.color = 'red';
}

async function connectToBroker() {
    const apiKey = document.getElementById('apiKeyInput').value;
    const broker = brokers[currentBroker];

    try {
        // For debugging, log the request details
        console.log(`Connecting to ${broker.baseUrl}/auth with API key: ${apiKey}`);

        const response = await fetch(`${broker.baseUrl}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: apiKey })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Connection failed: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        authToken = data.token;
        document.getElementById('connectionStatus').textContent = 'Connected';
        document.getElementById('connectionStatus').style.color = 'green';
        
        console.log('Connection successful, token:', authToken);

        await fetchInstruments();
        await fetchMarketData('futures');  // Default to futures market
    } catch (error) {
        console.error('Connection error:', error);
        document.getElementById('connectionStatus').textContent = 'Connection Failed';
        document.getElementById('connectionStatus').style.color = 'red';
        alert(`Failed to connect: ${error.message}`);
    }
}

// Ensure all buttons have event listeners
function setupButtonListeners() {
    const buttons = document.querySelectorAll('.trade-btn');
    buttons.forEach(button => {
        button.addEventListener('click', handleTradeButtonClick);
    });
    console.log(`Set up listeners for ${buttons.length} buttons`);
}

// Call this function after the DOM is loaded
document.addEventListener('DOMContentLoaded', setupButtonListeners);

function handleTradeButtonClick(event) {
    const action = event.target.dataset.action;
    console.log(`Button clicked: ${action}`);
    // Implement the action logic here
    // For example:
    switch(action) {
        case 'buy':
        case 'sell':
            document.getElementById('direction').value = action;
            break;
        case 'market':
        case 'limit':
        case 'stop':
            document.getElementById('orderType').value = action;
            break;
        // Add more cases as needed
    }
}

async function placeTrade() {
    // Validate all required fields are filled
    const requiredFields = ['symbol', 'orderType', 'direction', 'amount'];
    for (let field of requiredFields) {
        if (!document.getElementById(field).value) {
            alert(`Please fill in the ${field} field`);
            return;
        }
    }

    const tradeDetails = {
        symbol: document.getElementById('symbol').value,
        orderType: document.getElementById('orderType').value,
        direction: document.getElementById('direction').value,
        amount: document.getElementById('amount').value,
        entryPrice: document.getElementById('entryPrice').value,
        takeProfit: document.getElementById('takeProfit').value,
        stopLoss: document.getElementById('stopLoss').value
    };

    try {
        console.log('Placing trade with details:', tradeDetails);

        const response = await fetch(`${brokers[currentBroker].baseUrl}/orders`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tradeDetails)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to place trade: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Trade placed:', data);
        alert('Trade placed successfully!');
        updateOrderHistory(data);
    } catch (error) {
        console.error('Error placing trade:', error);
        alert(`Failed to place trade: ${error.message}`);
    }
}

function handleTradeButtonClick(event) {
    const action = event.target.dataset.action;
    console.log(`Trade action: ${action}`);
    // Implement specific actions for each button
    // For example:
    switch(action) {
        case 'buy':
        case 'sell':
            document.getElementById('direction').value = action;
            break;
        case 'market':
        case 'limit':
        case 'stop':
            document.getElementById('orderType').value = action;
            break;
        case 'risk1':
        case 'risk2':
        case 'risk3':
            const riskPercentage = action.slice(-1);
            document.getElementById('riskPercentage').value = riskPercentage;
            break;
        // Implement other actions...
    }
}

async function executeAiTrade() {
    const aiInstructions = document.getElementById('textToTrade').value;
    const processingElement = document.getElementById('aiProcessing');
    
    processingElement.classList.remove('hidden');
    processingElement.textContent = 'AI is cooking up some trades...';
    
    try {
        // Simulating API call to AI service
        const response = await new Promise(resolve => setTimeout(() => resolve({ success: true, trade: 'BUY AAPL' }), 2000));
        
        if (response.success) {
            processingElement.textContent = `AI Trade executed: ${response.trade}`;
            updateOrderHistory({ type: 'AI', details: response.trade });
        } else {
            throw new Error('AI Trade failed');
        }
    } catch (error) {
        processingElement.textContent = `Error: ${error.message}`;
    }
}

function toggleAutoTrade(event) {
    isAutoTradeEnabled = event.target.checked;
    const autoTradeStatus = document.getElementById('autoTradeStatus');
    if (isAutoTradeEnabled) {
        autoTradeStatus.textContent = 'Auto Trade: ON';
        autoTradeStatus.style.color = 'green';
        startAutoTrading();
    } else {
        autoTradeStatus.textContent = 'Auto Trade: OFF';
        autoTradeStatus.style.color = 'red';
        stopAutoTrading();
    }
}

function startAutoTrading() {
    console.log('Auto-trading started');
    // Implement webhook listener or polling mechanism here
}

function stopAutoTrading() {
    console.log('Auto-trading stopped');
    // Stop webhook listener or polling mechanism here
}

function updateOrderHistory(order) {
    const historyContent = document.getElementById('orderHistoryContent');
    const orderElement = document.createElement('div');
    orderElement.textContent = `${new Date().toLocaleTimeString()} - ${order.type}: ${order.details}`;
    historyContent.prepend(orderElement);
}

// Utility functions
function sanitizeInput(input) {
    // Implement input sanitization to prevent XSS attacks
    return input.replace(/[<>&'"]/g, function (c) {
        return { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c];
    });
}

// Initialize the panel
document.getElementById('brokerSelect').value = 'ironbeam'; // Set default broker
changeBroker(); // Initialize with default broker