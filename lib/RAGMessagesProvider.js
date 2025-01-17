import { useState, useCallback } from 'react';
import RagMessagesContext from './RAGMessagesContext';

export const RagMessagesProvider = ({ children }) => {
  const [agentMessages, setAgentMessages] = useState([]);

  const addRagMessage = useCallback((message, userId) => {
    const newMessage = {
      id: `rag-${Date.now()}`,
      message: message,
      user_id: userId,
      inserted_at: new Date().toISOString(),
      author: { username: 'You' },
      reactions: [],
      isRAGMessage: true
    };
    setAgentMessages(prev => [...prev, newMessage]);
  }, []);

  const addRagResponse = useCallback((response, userId) => {
    const newMessage = {
      id: `rag-response-${Date.now()}`,
      message: response,
      user_id: userId,
      inserted_at: new Date().toISOString(),
      author: { username: 'Agent' },
      reactions: [],
      isRAGResponse: true
    };
    setAgentMessages(prev => [...prev, newMessage]);
  }, []);

  const deleteRagMessage = useCallback((messageId) => {
    setAgentMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const clearRagMessages = useCallback(() => {
    setAgentMessages([]);
  }, []);

  const value = {
    agentMessages,
    addAgentMessage: addRagMessage,
    addAgentResponse: addRagResponse,
    deleteAgentMessage: deleteRagMessage,
    clearAgentMessages: clearRagMessages
  };

  return (
    <RagMessagesContext.Provider value={value}>
      {children}
    </RagMessagesContext.Provider>
  );
}; 