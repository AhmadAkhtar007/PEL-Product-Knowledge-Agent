'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';

type Source = {
  file: string;
  page?: number;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
};

type RagResponse = {
  answer?: string;
  sources?: Source[];
  error?: string;
};

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am the PEL Product Knowledge Agent. Ask me anything and I will retrieve the information for you.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMessage.content }),
      });

      const data = (await response.json().catch(() => ({}))) as RagResponse;
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          data.answer ||
          data.error ||
          "I'm sorry, I couldn't find an answer.",
        sources: data.sources || []
      };

      setMessages(prev => [...prev, botMessage]);
      if (!response.ok) {
        setError(data.error || 'Unable to reach the PEL backend.');
      }
    } catch (err) {
      setError('Unable to reach the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>PEL Product Knowledge Agent</h1>
        <p className={styles.subtitle}>Ask questions and get answers with citations.</p>
      </header>

      <main className={styles.chatArea}>
        <div className={styles.messages}>
          {messages.map((msg) => (
            <div key={msg.id} className={`${styles.messageWrapper} ${styles[msg.role]}`}>
              <div className={styles.message}>
                {msg.content.split('\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className={styles.citations}>
                    {msg.sources.map((source, idx) => (
                      <span key={idx} className={styles.citationBadge} title="Source Document">
                        📄 {source.file} {source.page ? `(p. ${source.page})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.messageWrapper} ${styles.bot}`}>
              <div className={styles.message}>
                <div className={styles.loadingDots}>
                  <span className={styles.loadingDot}></span>
                  <span className={styles.loadingDot}></span>
                  <span className={styles.loadingDot}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Message the PEL Product Knowledge Agent..."
                className={styles.input}
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button 
              type="submit" 
              className={styles.sendButton}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                width="24" 
                height="24"
              >
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </button>
          </form>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </main>
    </div>
  );
}
