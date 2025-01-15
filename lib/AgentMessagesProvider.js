import { useState, useCallback } from 'react';
import AgentMessagesContext from './AgentMessagesContext';

export const AgentMessagesProvider = ({ children }) => {
  const [agentMessages, setAgentMessages] = useState([]);

  const addAgentMessage = useCallback((message, userId) => {
    const newMessage = {
      id: `agent-${Date.now()}`,
      message: message,
      user_id: userId,
      inserted_at: new Date().toISOString(),
      author: { username: 'You' },
      reactions: [],
      isAgentMessage: true
    };
    setAgentMessages(prev => [...prev, newMessage]);
  }, []);

  const addAgentResponse = useCallback((response, userId) => {
    const newMessage = {
      id: `agent-response-${Date.now()}`,
      message: response,
      user_id: 'agent',
      inserted_at: new Date().toISOString(),
      author: { username: 'Agent' },
      reactions: [],
      isAgentResponse: true
    };
    setAgentMessages(prev => [...prev, newMessage]);
  }, []);

  const deleteAgentMessage = useCallback((messageId) => {
    setAgentMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const clearAgentMessages = useCallback(() => {
    setAgentMessages([]);
  }, []);

  const value = {
    agentMessages,
    addAgentMessage,
    addAgentResponse,
    deleteAgentMessage,
    clearAgentMessages
  };

  return (
    <AgentMessagesContext.Provider value={value}>
      {children}
    </AgentMessagesContext.Provider>
  );
}; 