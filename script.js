const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');

function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (sender === 'user') {
        messageDiv.classList.add('user-message');
    } else {
        messageDiv.classList.add('ai-message');
    }
    messageDiv.innerText = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (text === '') return;

    appendMessage(text, 'user');
    userInput.value = '';

    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'ai-message');
    typingDiv.innerText = "Typing...";
    typingDiv.id = "typing-indicator";
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // NOTE: This URL is a placeholder until we reach Step 5!
        const response = await fetch('https://gemini-proxy-xi-lyart.vercel.app/api/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        document.getElementById('typing-indicator').remove();
        appendMessage(data.reply, 'ai');

    } catch (error) {
        // Since Vercel isn't hooked up yet, it will fail and show this:
        document.getElementById('typing-indicator').remove();
        appendMessage("Backend not connected yet! We will fix this in Step 5.", 'ai');
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}