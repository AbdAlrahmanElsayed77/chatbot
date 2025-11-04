const API_KEY = "YOUR_API_KEY_HERE"; // ضع مفتاح OpenAI هنا

const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatList = document.getElementById('chatList');
const themeToggle = document.getElementById('themeToggle');

let chats = [];
let currentChatId = null;
let darkMode = false;

// Load data
function loadData() {
  try {
    const savedChats = localStorage.getItem('chats');
    const savedCurrentId = localStorage.getItem('currentChatId');
    const savedTheme = localStorage.getItem('darkMode');

    if (savedChats) chats = JSON.parse(savedChats);
    if (savedCurrentId) currentChatId = Number(savedCurrentId);
    if (savedTheme) darkMode = savedTheme === 'true';

    if (darkMode) {
      document.body.classList.add('dark');
      themeToggle.textContent = '☀️';
    }

    if (chats.length === 0) {
      const id = Date.now();
      chats.push({ id, title: 'New Chat', messages: [] });
      currentChatId = id;
      saveData();
    }

    if (!currentChatId || !chats.find(c => c.id === currentChatId)) {
      currentChatId = chats[chats.length - 1].id;
    }

    renderList();
    if (currentChatId) loadChat(currentChatId);
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

function saveData() {
  try {
    localStorage.setItem('chats', JSON.stringify(chats));
    localStorage.setItem('currentChatId', String(currentChatId || ''));
    localStorage.setItem('darkMode', String(document.body.classList.contains('dark')));
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

function renderList() {
  chatList.innerHTML = '';
  [...chats].reverse().forEach(c => {
    const div = document.createElement('div');
    div.className = 'chat-item' + (c.id === currentChatId ? ' active' : '');
    
    const span = document.createElement('span');
    span.textContent = c.title || 'New Chat';
    span.onclick = () => loadChat(c.id);

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.innerHTML = '🗑️';
    del.onclick = e => {
      e.stopPropagation();
      deleteChat(c.id);
    };

    div.append(span, del);
    chatList.appendChild(div);
  });
}

function addMessage(role, text) {
  const d = document.createElement('div');
  d.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
  
  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? 'You' : 'Assistant';
  
  const content = document.createElement('div');
  content.innerText = text;
  
  d.appendChild(label);
  d.appendChild(content);
  chatBox.appendChild(d);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function loadChat(id) {
  currentChatId = id;
  const chat = chats.find(c => c.id === id);
  chatBox.innerHTML = '';
  
  if (chat.messages.length === 0) {
    chatBox.innerHTML = '<div class="empty-state"><h1>👋</h1><p>Start the conversation by typing your message</p></div>';
  } else {
    chat.messages.forEach(m => addMessage(m.role, m.content));
  }
  
  renderList();
  saveData();
}

async function newChat() {
  const current = chats.find(c => c.id === currentChatId);
  if (current && current.messages.length === 0) return;
  
  const id = Date.now();
  const chat = { id, title: 'New Chat', messages: [] };
  chats.push(chat);
  currentChatId = id;
  saveData();
  renderList();
  chatBox.innerHTML = '<div class="empty-state"><h1>✨</h1><p>New chat - start by typing your message</p></div>';
  userInput.focus();
}

async function deleteChat(id) {
  if (chats.length === 1) {
    alert('Cannot delete the last chat');
    return;
  }
  
  chats = chats.filter(c => c.id !== id);
  if (currentChatId === id) {
    currentChatId = chats[chats.length - 1].id;
    loadChat(currentChatId);
  }
  saveData();
  renderList();
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || !currentChatId) return;
  
  userInput.value = '';
  userInput.style.height = 'auto';
  
  const chat = chats.find(c => c.id === currentChatId);
  const emptyState = chatBox.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  
  addMessage('user', text);
  chat.messages.push({ role: 'user', content: text });
  
  if (chat.messages.length === 1) {
    chat.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
    renderList();
  }
  
  saveData();

  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="loading"></span>';

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: chat.messages,
        max_tokens: 800
      })
    });
    
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    
    const reply = data.choices?.[0]?.message?.content || "No reply";
    addMessage('assistant', reply);
    chat.messages.push({ role: 'assistant', content: reply });
    saveData();
  } catch (err) {
    addMessage('assistant', '❌ Error: ' + err.message + '\n\nPlease check your API key');
  }

  sendBtn.disabled = false;
  sendBtn.innerHTML = 'Send';
  userInput.focus();
}

userInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});

sendBtn.onclick = sendMessage;
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('newChatBtn').onclick = newChat;

themeToggle.onclick = () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  saveData();
};

loadData();
