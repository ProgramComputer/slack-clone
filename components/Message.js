// components/Message.js
import { useContext, useState, useEffect } from 'react';
import UserContext from '~/lib/UserContext';
import { deleteMessage, addReaction, removeReaction } from '~/lib/Store';
import { FaTrash, FaSmile, FaPaperclip } from 'react-icons/fa';
import Picker from '@emoji-mart/react';
import { supabase } from '~/lib/Store';
import { useRAGMessages } from '~/lib/hooks/useRAGMessages';
import ReactMarkdown from 'react-markdown';
import ProfilePicture from './ProfilePicture';

const Message = ({ message, highlight, onThreadClick, isThreadParent, onDeleteRAGMessage }) => {
  const { user } = useContext(UserContext);
  const { deleteAgentMessage } = useRAGMessages();
  const authorUsername = message.author.username; 
  const isAuthor = user?.id === message.user_id;
  const isRAGMessage = message.isRAGMessage || message.isRAGResponse || (typeof message.message === 'string' && message.message.startsWith('@rag'));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [reactions, setReactions] = useState(message.reactions || []);

  // Group reactions by emoji with local state
  const reactionCounts = reactions.reduce((acc, reaction) => {
    const { emoji, user_id } = reaction;
    if (!acc[emoji]) {
      acc[emoji] = { count: 0, reacted: false };
    }
    acc[emoji].count += 1;
    if (user_id === user.id) {
      acc[emoji].reacted = true;
    }
    return acc;
  }, {});

  const handleAddReaction = async (emoji) => {
    if (typeof emoji === 'object' && emoji.native) {
      await addReaction(message.id, user.id, emoji.native);
      // Update local state
      setReactions([...reactions, { emoji: emoji.native, user_id: user.id, message_id: message.id }]);
    } else {
      await addReaction(message.id, user.id, emoji);
      // Update local state
      setReactions([...reactions, { emoji, user_id: user.id, message_id: message.id }]);
    }
    setShowEmojiPicker(false);
  };

  const handleRemoveReaction = async (emoji) => {
    await removeReaction(message.id, user.id, emoji);
    // Update local state
    setReactions(reactions.filter(r => !(r.user_id === user.id && r.emoji === emoji)));
  };

  const handleDeleteMessage = async () => {
    try {
      if (isRAGMessage) {
        // Check if this is a thread-local RAG message
        if (message.thread_parent_id && onDeleteRAGMessage) {
          // Delete thread RAG message from local state only
          onDeleteRAGMessage(message.id);
        } else {
          // Delete global RAG message
          deleteAgentMessage(message.id);
        }
        return;
      }

      // Delete regular message from database
      if (message.file_url) {
        const filePathMatch = message.file_url.match(/\/uploads\/([^?]+)/);
        if (filePathMatch) {
          const filePath = filePathMatch[1];
          // Extract the folder name (everything up to the last slash)
          const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
          
          // List all files in the folder
          const { data: files, error: listError } = await supabase.storage
            .from('uploads')
            .list(folderPath);

          if (!listError && files?.length > 0) {
            // Delete all files in the folder
            const { error: deleteError } = await supabase.storage
              .from('uploads')
              .remove(files.map(file => `${folderPath}/${file.name}`));

            if (deleteError) {
              console.error('Error deleting files:', deleteError);
            }
          }
        }
      }
      await deleteMessage(message.id);
    } catch (error) {
      console.error('Error deleting message and attachment:', error);
    }
  };

  useEffect(() => {
    if (highlight) {
      // Scroll the message into view
      const element = document.getElementById(`message-${message.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Set highlight
      setIsHighlighted(true);
      
      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 3000);

      // Cleanup timeout if component unmounts or highlight changes
      return () => clearTimeout(timer);
    }
  }, [highlight, message.id]);

  // Update local state when message.reactions changes
  useEffect(() => {
    setReactions(message.reactions || []);
  }, [message.reactions]);

  return (
    <div 
      id={`message-${message.id}`}
      className={`py-2 transition-colors duration-1000 ${
        isHighlighted ? 'bg-yellow-100 -mx-4 px-4' : ''
      } ${isRAGMessage ? 'bg-gray-50' : ''}`}
    >
      <div className="flex items-start gap-3 py-2">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <ProfilePicture userId={message.user_id} size={40} />
        </div>

        {/* Message Content */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{authorUsername}</span>
            <span className="text-sm text-gray-500">
              {new Date(message.inserted_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {isAuthor && (
              <button
                onClick={handleDeleteMessage}
                className="text-gray-500 hover:text-red-500 focus:outline-none"
                aria-label="Delete message"
              >
                <FaTrash size={14} />
              </button>
            )}
          </div>
          <div className="mt-1 prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                // Customize component rendering
                strong: ({node, ...props}) => <span className="font-bold" {...props} />,
                em: ({node, ...props}) => <span className="italic" {...props} />,
                code: ({node, inline, ...props}) => 
                  inline ? (
                    <code className="px-1.5 py-0.5 rounded bg-gray-100 text-sm font-mono" {...props} />
                  ) : (
                    <code {...props} />
                  ),
                del: ({node, ...props}) => <span className="line-through" {...props} />,
                p: ({node, ...props}) => <div {...props} /> // Prevent nested <p> tags
              }}
            >
              {message.message}
            </ReactMarkdown>
          </div>

          {message.file_url && (
            <div className="mt-2">
              {message.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <img 
                  src={message.file_url} 
                  alt="Attached file" 
                  className="max-h-48 rounded border border-gray-200 object-contain inline-block"
                />
              ) : (
                <a
                  href={message.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
                >
                  <FaPaperclip size={16} />
                  {message.file_url.split('/').pop()}
                </a>
              )}
            </div>
          )}

          {/* Reactions */}
          {Object.entries(reactionCounts).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {Object.entries(reactionCounts).map(([emoji, { count, reacted }]) => (
                <button
                  key={emoji}
                  onClick={() =>
                    reacted ? handleRemoveReaction(emoji) : handleAddReaction({ native: emoji })
                  }
                  className={`inline-flex items-center px-2 py-1 rounded-full border ${
                    reacted ? 'bg-blue-100 border-blue-300' : 'border-gray-300'
                  } hover:bg-blue-50`}
                  aria-label={`Reaction: ${emoji}`}
                >
                  <span className="text-lg" role="img" aria-label={emoji}>
                    {emoji}
                  </span>
                  <span className="ml-1 text-sm">{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Add Reaction Button */}
          <div className="relative mt-2 flex items-center gap-2">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-haspopup="dialog"
              aria-expanded={showEmojiPicker}
              aria-label="Add reaction"
            >
              <FaSmile size={16} />
              <span className="ml-1 text-sm">Add Reaction</span>
            </button>

            {!message.thread_parent_id && !isThreadParent && (
              <button
                onClick={() => onThreadClick?.(message)}
                className={`text-xs flex items-center gap-1 ${
                  highlight ? 'text-indigo-600 hover:text-indigo-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg 
                  className="w-3 h-3" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M3 15l4-4 4 4" />
                  <path d="M7 11V3" />
                  <path d="M21 9h-8" />
                  <path d="M21 15h-8" />
                  <path d="M21 21h-8" />
                </svg>
                {message.reply_count > 0 ? (
                  <span className={highlight ? 'font-medium' : ''}>{message.reply_count} replies</span>
                ) : (
                  <span className={highlight ? 'font-medium' : ''}>Reply in thread</span>
                )}
              </button>
            )}

            {showEmojiPicker && (
              <div className="absolute z-10 mt-2" style={{ fontSize: '0.875em' }}>
                <div className="shadow-lg rounded-lg" style={{ width: '20em' }}>
                  <Picker
                    onEmojiSelect={handleAddReaction}
                    theme="light"
                    showPreview={false}
                    showSkinTones={false}
                    emojiSize={20}
                    emojiButtonSize={28}
                    maxFrequentRows={2}
                    perLine={8}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Message;