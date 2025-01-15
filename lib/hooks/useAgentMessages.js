import { useContext } from 'react';
import AgentMessagesContext from '../AgentMessagesContext';

export const useAgentMessages = () => {
  const context = useContext(AgentMessagesContext);
  if (!context) {
    throw new Error('useAgentMessages must be used within an AgentMessagesProvider');
  }
  return context;
}; 