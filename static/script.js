// script.js — works with Gemini backend

let messages = [];
const STORAGE_KEY = 'agroai_chat_history_v1';

const soilSelect = document.getElementById('soil-type');
const climateSelect = document.getElementById('climate');
const queryEl = document.getElementById('query');
const askBtn = document.getElementById('ask-btn');
const chatHistoryEl = document.getElementById('chat-history');
const languageEl = document.getElementById('language');
const exportBtn = document.getElementById('export-btn');
const clearBtn = document.getElementById('clear-btn');
const marketBtn = document.getElementById('market-btn');
const marketCropInput = document.getElementById('market-crop');

function loadHistory() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const obj = JSON.parse(saved);
            messages = obj.messages || [];
            renderMessages();
        } catch (e) {
            console.error('Failed to parse saved history', e);
        }
    }
}
function saveHistory() {
    const payload = { messages, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
function renderMessages() {
    chatHistoryEl.innerHTML = '';
    messages.forEach(m => addMessage(m.role, m.content, m.timestamp));
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}
function addMessage(role, content, timestamp) {
    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;
    div.textContent = content;
    if (timestamp) {
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = new Date(timestamp).toLocaleString();
        div.appendChild(meta);
    }
    chatHistoryEl.appendChild(div);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}
function setLoading(on = true) {
    if (on) addMessage('assistant', 'Thinking...');
    else {
        const last = chatHistoryEl.lastChild;
        if (last && last.textContent.includes('Thinking')) last.remove();
    }
}

async function getAdvice() {
    const soil = soilSelect.value;
    const climate = climateSelect.value;
    const query = queryEl.value.trim();
    const lang = languageEl.value;

    if (!soil || !climate || !query) {
        alert('Please fill soil, climate, and question.');
        return;
    }

    const userText = `Soil Type: ${soil}\nClimate: ${climate}\nQuestion: ${query}`;
    const userMsg = { role: 'user', content: userText, timestamp: new Date().toISOString() };
    messages.push(userMsg);
    saveHistory();
    addMessage('user', userText, userMsg.timestamp);
    setLoading(true);

    try {
        const res = await fetch('/get_advice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                soil_type: soil,
                climate: climate,
                language: lang,
                messages: messages.map(m => ({ role: m.role, content: m.content }))
            })
        });
        const data = await res.json();
        setLoading(false);

        const botMsg = { role: 'assistant', content: data.response, timestamp: data.timestamp };
        messages.push(botMsg);
        saveHistory();
        addMessage('assistant', data.response, botMsg.timestamp);
    } catch (e) {
        console.error(e);
        setLoading(false);
        addMessage('assistant', 'Error contacting server.');
    }

    queryEl.value = '';
}

async function getMarketInfo() {
    const crop = marketCropInput.value.trim();
    if (!crop) return alert('Enter a crop name.');
    addMessage('assistant', `Fetching market info for ${crop}...`);

    try {
        const res = await fetch(`/market?crop=${encodeURIComponent(crop)}`);
        const data = await res.json();

        let msg;
        if (data.error) msg = `Error: ${data.error}`;
        else if (data.price_per_kg)
            msg = `Market info for ${data.crop}:\nPrice per kg: ₹${data.price_per_kg}\nLink: ${data.link}`;
        else msg = `No static data for ${data.crop}. Suggested search: ${data.suggested_link}`;

        const botMsg = { role: 'assistant', content: msg, timestamp: new Date().toISOString() };
        messages.push(botMsg);
        saveHistory();
        addMessage('assistant', msg, botMsg.timestamp);
    } catch (e) {
        console.error(e);
        addMessage('assistant', 'Failed to fetch market info.');
    }
}

function exportHistory() {
    const blob = new Blob([JSON.stringify({ messages }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'agroai_chat_history.json';
    a.click();
    URL.revokeObjectURL(a.href);
}
function clearHistory() {
    if (!confirm('Clear chat history?')) return;
    messages = [];
    localStorage.removeItem(STORAGE_KEY);
    chatHistoryEl.innerHTML = '';
}

askBtn.addEventListener('click', getAdvice);
exportBtn.addEventListener('click', exportHistory);
clearBtn.addEventListener('click', clearHistory);
marketBtn.addEventListener('click', getMarketInfo);
loadHistory();
