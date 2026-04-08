import React, { useEffect, useMemo, useState } from 'react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const createMessage = (role, text, source = null) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  source,
});

const getAssistantCopy = (userType) => {
  if (userType === 'mechanic') {
    return {
      title: 'AI Roadside Assistant',
      subtitle: 'Ask about garage management, messages, availability, or how RoadResQ works for mechanics.',
      starter:
        "Ask about your garage listings, chats, availability, or tell me where you want to go in the app and I'll guide you.",
      prompts: [
        'How do I add my garage?',
        'Show my messages',
        'What can mechanics do here?',
        'How do users find me?',
      ],
      placeholder: 'Try "Open garage management" or "How many chats do I have?"',
    };
  }

  return {
    title: 'AI Roadside Assistant',
    subtitle: 'Ask for help finding mechanics, contacting them, or understanding the fastest next step.',
    starter:
      "Ask about nearby mechanics, chatting with a garage, or tell me what help you need and I'll guide you through RoadResQ.",
    prompts: [
      'I need roadside help right now',
      'How do I find nearby mechanics?',
      'Open messages',
      'What can I do in RoadResQ?',
    ],
    placeholder: 'Try "I need roadside help right now" or "How do I contact a mechanic?"',
  };
};

const dispatchAction = (action) => {
  if (!action?.type) return;
  window.dispatchEvent(
    new CustomEvent('roadresq:assistant-action', {
      detail: action,
    })
  );
};

export default function AIRoadsideAssistant() {
  const { user } = useAuth();
  const assistantCopy = useMemo(() => getAssistantCopy(user?.userType), [user?.userType]);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    createMessage('assistant', assistantCopy.starter, 'system'),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMessages([createMessage('assistant', assistantCopy.starter, 'system')]);
    setQuery('');
    setError('');
  }, [assistantCopy.starter]);

  const submitQuery = async (nextQuery) => {
    const trimmed = nextQuery.trim();
    if (!trimmed || loading) {
      if (!trimmed) {
        setError('Please enter a question.');
      }
      return;
    }

    setLoading(true);
    setError('');
    setMessages((current) => [...current, createMessage('user', trimmed)]);
    setQuery('');

    try {
      const response = await aiAPI.ask(trimmed);
      const answer =
        response?.data?.answer ||
        response?.data?.response ||
        "I couldn't find a response for that request.";
      const source = response?.data?.source || null;

      setMessages((current) => [
        ...current,
        { ...createMessage('assistant', answer), source },
      ]);
      dispatchAction(response?.data?.action);
    } catch (err) {
      console.error('AI query error:', err);
      const message = 'Failed to get response from the server.';
      setError(message);
      setMessages((current) => [...current, createMessage('assistant', message, 'system')]);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async (event) => {
    event.preventDefault();
    await submitQuery(query);
  };

  return (
    <div className="ai-container">
      <div className="ai-header">
        <h2>{assistantCopy.title}</h2>
        <p className="ai-subtitle">{assistantCopy.subtitle}</p>
      </div>

      <div className="ai-suggestions">
        {assistantCopy.prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="ai-chip"
            onClick={() => {
              void submitQuery(prompt);
            }}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="ai-chat-log" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`ai-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}
          >
            <span className="ai-role">{message.role === 'user' ? 'You' : 'Assistant'}</span>
            {message.role === 'assistant' && message.source ? (
              <span className={`ai-source ai-source-${message.source}`}>
                {message.source === 'gemini'
                  ? 'Gemini'
                  : message.source === 'local_fallback'
                    ? 'Local fallback'
                    : message.source === 'system'
                      ? 'System'
                      : 'Local action'}
              </span>
            ) : null}
            <p>{message.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleAsk} className="ai-form">
        <div className="ai-input-row">
          <input
            type="text"
            placeholder={assistantCopy.placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Working...' : 'Send'}
          </button>
        </div>
        {error && <p className="ai-error">{error}</p>}
      </form>
    </div>
  );
}
