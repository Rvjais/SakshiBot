import React, { useState, useRef, useEffect } from 'react'
import './index.css'

// API URL - uses environment variable in production (remove trailing slash if present)
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, '');

// Generate or get browser ID
const getBrowserId = () => {
    let oderId = localStorage.getItem('sakshi_browser_id');
    if (!oderId) {
        oderId = 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('sakshi_browser_id', oderId);
    }
    return oderId;
};

function App() {
    const [text, setText] = useState("");
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const oderId = getBrowserId();

    // Load chat history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await fetch(`${API_URL}/chat/${oderId}`);
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    setMessages(data.messages);
                }
            } catch (error) {
                console.log("Could not load chat history");
            }
        };
        loadHistory();
    }, [oderId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const send = async () => {
        if (!text.trim() || isLoading) return;

        const userMsg = { role: "user", content: text };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setText("");
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ oderId, messages: newMessages })
            });
            const data = await res.json();
            const botContent = data.message?.content || data.error || "No response";
            setMessages(prev => [...prev, { role: "bot", content: botContent }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: "bot",
                content: "Connection error. Try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') send();
    };

    return (
        <div className="app">
            <header className="header">
                <h1 className="title">Sakshi</h1>
            </header>

            <div className="messages">
                {messages.length === 0 ? (
                    <div className="empty">Start a conversation</div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} className={`msg ${msg.role}`}>
                            <div className="bubble">{msg.content}</div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="msg bot">
                        <div className="bubble">
                            <div className="typing">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
                <div className="input-box">
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Type a message..."
                        disabled={isLoading}
                    />
                    <button
                        className="send-btn"
                        onClick={send}
                        disabled={isLoading || !text.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App