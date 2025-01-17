import { useContext } from 'react';
import RAGMessagesContext from '../RAGMessagesContext';

export const useRAGMessages = () => {
  const context = useContext(RAGMessagesContext);
  if (!context) {
    throw new Error('useRAGMessages must be used within an RAGMessagesProvider');
  }
  return context;
}; 