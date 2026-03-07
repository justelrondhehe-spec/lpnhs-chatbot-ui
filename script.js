/**
 * script.js — LPNHS Main Chatbot Logic
 * =====================================================
 * All original function names, element IDs, and the
 * Vercel backend URL are preserved exactly as-is.
 *
 * Enhancements added on top:
 *  - Welcome message injected on page load
 *  - Native typing-indicator element (replaces inline div)
 *  - Dedicated error-message CSS class
 *  - Clear-chat button wired up
 *  - Input disabled during fetch to prevent duplicate sends
 *  - Auto-scroll always fires after every update
 * =====================================================
 */

'use strict';

/* =====================================================
   DOM REFERENCES
   Grabbed once; reused throughout.
   ===================================================== */
const chatBox        = document.getElementById('chat-box');         // Message feed
const userInput      = document.getElementById('user-input');       // Text input
const typingIndicator = document.getElementById('typing-indicator'); // Animated dots
const clearBtn       = document.getElementById('clearBtn');         // Clear button

/* =====================================================
   CONVERSATION HISTORY
   Stores every exchange as { role, text } objects so
   the backend receives full context with every request.
   This gives the bot its "memory" within a session.
     role: 'user'  — a message the user sent
     role: 'model' — a reply the bot gave
   ===================================================== */
let conversationHistory = [];

/* =====================================================
   UTILITIES
   ===================================================== */

/**
 * Scrolls the message feed to the very bottom.
 * Called after every message or indicator change.
 */
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Returns the current time as "HH:MM AM/PM".
 * Appended as a small label beneath each bubble.
 * @returns {string}
 */
function getTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* =====================================================
   MESSAGE RENDERING
   Preserves your original .message / .ai-message /
   .user-message class structure.
   ===================================================== */

/**
 * Creates and appends a message bubble to the chat feed.
 *
 * @param {string} text   - The message text to display.
 * @param {'user'|'ai'|'error'} sender - Controls alignment and style.
 */
function appendMessage(text, sender) {
  /* -- Outer wrapper -- */
  const wrapper = document.createElement('div');

  /* -- Bubble -- */
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');

  if (sender === 'user') {
    messageDiv.classList.add('user-message');
  } else if (sender === 'error') {
    messageDiv.classList.add('ai-message', 'error-message');
  } else {
    // Default: 'ai'
    messageDiv.classList.add('ai-message');
  }

  /* Use innerText (not innerHTML) to prevent XSS from user input */
  messageDiv.innerText = text;

  /* -- Timestamp label -- */
  const timeEl = document.createElement('p');
  timeEl.style.cssText = `
    font-size: 0.62rem;
    color: #aaa;
    margin-top: 4px;
    padding: 0 4px;
    text-align: ${sender === 'user' ? 'right' : 'left'};
  `;
  timeEl.textContent = getTime();

  wrapper.appendChild(messageDiv);
  wrapper.appendChild(timeEl);
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = sender === 'user' ? 'flex-end' : 'flex-start';

  chatBox.appendChild(wrapper);
  scrollToBottom();
}

/* =====================================================
   TYPING INDICATOR HELPERS
   Uses the dedicated #typing-indicator element from HTML
   instead of injecting a temporary div each time.
   ===================================================== */

/** Shows the animated "typing" dots and scrolls to it. */
function showTyping() {
  typingIndicator.hidden = false;
  scrollToBottom();
}

/** Hides the animated "typing" dots. */
function hideTyping() {
  typingIndicator.hidden = true;
}

/* =====================================================
   BACKEND COMMUNICATION
   Your original Vercel URL and data.reply shape
   are preserved exactly.
   ===================================================== */

/**
 * Sends the user's message to the Vercel backend via POST
 * and returns the bot reply string.
 *
 * Backend contract (unchanged from your original):
 *   POST  https://gemini-proxy-xi-lyart.vercel.app/api/chatbot
 *   Body: { message: string }
 *   200:  { reply: string }
 *
 * @param {string} message - The text the user typed.
 * @returns {Promise<string>} The bot's reply text.
 * @throws {Error} On network failure or non-2xx response.
 */
async function sendMessage() {
  const text = userInput.value.trim();

  /* Guard: ignore empty submissions */
  if (text === '') return;

  /* -- Render user bubble immediately -- */
  appendMessage(text, 'user');
  userInput.value = '';

  /* -- Save user turn to history BEFORE sending --
     The backend receives this history with the current message
     so Gemini can read the full conversation context.        */
  conversationHistory.push({ role: 'user', text });

  /* -- Lock input while waiting for response -- */
  userInput.disabled = true;

  /* -- Show typing animation -- */
  showTyping();

  try {
    const response = await fetch('https://gemini-proxy-xi-lyart.vercel.app/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        // Send all previous turns (excluding the current one, which is 'message')
        // so the bot understands the full conversation context.
        history: conversationHistory.slice(0, -1)
      })
    });

    const data = await response.json();

    hideTyping();
    appendMessage(data.reply, 'ai');

    /* -- Save bot reply to history so future messages include it -- */
    conversationHistory.push({ role: 'model', text: data.reply });

  } catch (error) {
    /* Show a friendly error if the backend is unreachable */
    hideTyping();
    appendMessage(
      '⚠️ Could not reach the server. Please check your connection and try again.',
      'error'
    );
    console.error('[LPNHS Chat] Fetch error:', error);
  } finally {
    /* Always re-enable input after success or failure */
    userInput.disabled = false;
    userInput.focus();
  }
}

/* =====================================================
   KEYBOARD HANDLER
   Preserved exactly from your original code.
   ===================================================== */

/**
 * Triggers sendMessage() when the user presses Enter.
 * Called via onkeypress="handleKeyPress(event)" in HTML.
 *
 * @param {KeyboardEvent} event
 */
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

/* =====================================================
   CLEAR BUTTON
   Wipes the chat and re-shows the welcome message.
   ===================================================== */
clearBtn.addEventListener('click', () => {
  const confirmed = window.confirm('Clear the entire conversation?');
  if (!confirmed) return;

  chatBox.innerHTML = '';

  /* Reset conversation history so the bot starts completely fresh */
  conversationHistory = [];

  initWelcome();
  userInput.focus();
});

/* =====================================================
   INITIALIZATION
   ===================================================== */

/**
 * Injects the opening greeting from the bot.
 * Called on page load and after the chat is cleared.
 */
function initWelcome() {
  appendMessage(
    'Hello! I am the LPNHS Main chatbot. How can I help you today?',
    'ai'
  );
}

/* Run on page load */
initWelcome();
userInput.focus();