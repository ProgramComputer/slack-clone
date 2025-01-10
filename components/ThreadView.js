import { useEffect, useState, useContext } from 'react';
import { fetchThreadReplies } from '~/lib/Store';
import Message from './Message';
import MessageInput from './MessageInput';
import UserContext from '~/lib/UserContext';
import { FaTimes } from 'react-icons/fa';
import { supabase } from '~/lib/Store.js';

const ThreadView = ({ parentMessage, onClose }) => {
  const [replies, setReplies] = useState([]);
  const { user } = useContext(UserContext);
  
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
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(threadListener);
    };
  }, [parentMessage.id]);

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
          {replies.map((reply) => (
            <Message key={reply.id} message={reply} isThreadReply />
          ))}
        </div>
      </div>

      <div className="p-4 border-t">
        <MessageInput
          channelId={parentMessage.channel_id}
          userId={user.id}
          threadParentId={parentMessage.id}
          placeholder="Reply in thread..."
        />
      </div>
    </div>
  );
};

export default ThreadView; 