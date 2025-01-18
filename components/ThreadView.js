import { useEffect, useState, useContext } from 'react';
import { fetchThreadReplies } from '~/lib/Store';
import Message from './Message';
import MessageInput from './MessageInput';
import UserContext from '~/lib/UserContext';
import { FaTimes } from 'react-icons/fa';
import { supabase } from '~/lib/Store.js';

const ThreadView = ({ parentMessage, onClose }) => {
  const [replies, setReplies] = useState([]);
  const [threadRAGMessages, setThreadRAGMessages] = useState([]);
  const { user } = useContext(UserContext);
  
  const addThreadRAGMessage = (message, userId) => {
    const newMessage = {
      id: `thread-rag-${Date.now()}`,
      message: message,
      user_id: userId,
      inserted_at: new Date().toISOString(),
      author: { username: 'You' },
      reactions: [],
      isRAGMessage: true,
      thread_parent_id: parentMessage.id
    };
    setThreadRAGMessages(prev => [...prev, newMessage]);
  };

  const addThreadRAGResponse = (response, userId) => {
    const newMessage = {
      id: `thread-rag-response-${Date.now()}`,
      message: response,
      user_id: userId,
      inserted_at: new Date().toISOString(),
      author: { username: 'RAG' },
      reactions: [],
      isRAGResponse: true,
      thread_parent_id: parentMessage.id
    };
    setThreadRAGMessages(prev => [...prev, newMessage]);
  };

  const deleteThreadRAGMessage = (messageId) => {
    setThreadRAGMessages(prev => prev.filter(message => message.id !== messageId));
  };

  useEffect(() => {
    const loadReplies = async () => {
      const threadReplies = await fetchThreadReplies(parentMessage.id);
      setReplies(threadReplies);
    };
    loadReplies();

    // Subscribe to thread replies
    const threadListener = supabase
      .channel(`thread-${parentMessage.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `thread_parent_id=eq.${parentMessage.id}`
        }, 
        async (payload) => {
          // Fetch full message data including author and reactions
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              author:users(*),
              reactions:message_reactions(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setReplies(current => [...current, newMessage]);
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `thread_parent_id=eq.${parentMessage.id}`
        },
        (payload) => {
          setReplies(current => current.filter(message => message.id !== payload.old.id));
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(threadListener);
    };
  }, [parentMessage.id]);

  // Combine regular replies with RAG messages
  const allReplies = [...replies, ...threadRAGMessages].sort((a, b) => 
    new Date(a.inserted_at) - new Date(b.inserted_at)
  );

  return (
    <div className="flex flex-col h-full border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-medium">Thread</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close thread"
        >
          <FaTimes size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4">
        <div className="py-4 border-b">
          <Message message={parentMessage} isThreadParent />
        </div>
        
        <div className="py-4">
          {allReplies.map((reply) => (
            <Message 
              key={reply.id} 
              message={reply} 
              isThreadReply 
              onDeleteRAGMessage={deleteThreadRAGMessage}
            />
          ))}
        </div>
      </div>

      <div className="p-4 border-t">
        <MessageInput
          channelId={parentMessage.channel_id}
          userId={user.id}
          threadParentId={parentMessage.id}
          placeholder="Reply in thread..."
          onRAGMessage={addThreadRAGMessage}
          onRAGResponse={addThreadRAGResponse}
        />
      </div>
    </div>
  );
};

export default ThreadView; 