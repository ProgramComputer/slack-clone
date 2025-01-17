// components/MessageInput.js
import { useState, useRef, useCallback } from 'react';
import { addMessage, uploadFile, addThreadReply, queryMessages } from '~/lib/Store';
import { FaPaperPlane, FaSmile, FaPaperclip, FaBold, FaItalic, FaCode, FaStrikethrough } from 'react-icons/fa';
import TextareaAutosize from 'react-textarea-autosize';
import Picker from '@emoji-mart/react';
import { useRAGMessages } from '~/lib/hooks/useRAGMessages';
import { extractTextFromFile } from '~/lib/Store';
import { supabase } from '~/lib/Store';

const MessageInput = ({ 
  channelId, 
  userId, 
  threadParentId, 
  placeholder, 
  otherParticipantId,
  onRAGMessage,
  onRAGResponse 
}) => {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const { addAgentMessage: addRAGMessage, addAgentResponse: addRAGResponse } = useRAGMessages();
  const [isLoading, setIsLoading] = useState(false);

  const insertFormatting = useCallback((startChar, endChar = startChar) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = messageText.substring(start, end);
    const beforeText = messageText.substring(0, start);
    const afterText = messageText.substring(end);

    // Check if selection is already formatted
    const isFormatted = 
      beforeText.endsWith(startChar) && 
      afterText.startsWith(endChar) &&
      selectedText.length > 0;

    if (isFormatted) {
      // Remove formatting
      setMessageText(
        beforeText.slice(0, -startChar.length) + 
        selectedText + 
        afterText.slice(endChar.length)
      );
    } else {
      // Add formatting
      setMessageText(
        beforeText + startChar + selectedText + endChar + afterText
      );
    }

    // Restore focus
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = isFormatted
        ? start - startChar.length
        : end + startChar.length + endChar.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [messageText]);

  const handleKeyDown = useCallback((e) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'b':
          e.preventDefault();
          insertFormatting('**');
          break;
        case 'i':
          e.preventDefault();
          insertFormatting('_');
          break;
        case '`':
          e.preventDefault();
          insertFormatting('`');
          break;
        case 'd':
          e.preventDefault();
          insertFormatting('~~');
          break;
      }
    }
  }, [insertFormatting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (messageText.trim() === '' && !selectedFile) return;

    let fileUrl = null;
    let extractedText = null;
    if (selectedFile) {
      const { data, error } = await uploadFile(selectedFile, userId);
      extractedText = data.extractedText;
      if (!error) {
        fileUrl = data.publicUrl;
      }
    }

    // Check if this is an agent message
    const isRAGMessage = messageText.trim().toLowerCase().startsWith('@rag');
    
    if (isRAGMessage) {
      setIsLoading(true);
      try {
        // Add the user's agent message locally
        setMessageText('');
        
        // Use thread-specific handlers if in a thread
        if (threadParentId && onRAGMessage && onRAGResponse) {
          onRAGMessage(messageText, userId);
        } else {
          addRAGMessage(messageText, userId);
        }

        // Determine context for RAG query
        let queryContext = messageText.replace('@rag', '').trim();
        
        // If current message has a file, append its context
        if (extractedText) {
          queryContext += `\n\nContext from attached file:\n${extractedText}`;
        }

        // Query the RAG system
        const response = await queryMessages(
          queryContext,
          threadParentId ? threadParentId : otherParticipantId,
          threadParentId ? true : false
        );
        
        if (response) {
          // Add the agent's response locally
          const responseText = typeof response === 'string' ? response : response.response;
          // Add userID to allow deleting the message
          if (threadParentId && onRAGMessage && onRAGResponse) {
            onRAGResponse(responseText, userId);
          } else {
            addRAGResponse(responseText, userId);
          }
        } else {
          // Handle error case
          const errorMessage = "I'm sorry, I couldn't process your request at this time.";
          if (threadParentId && onRAGMessage && onRAGResponse) {
            onRAGResponse(errorMessage, userId);
          } else {
            addRAGResponse(errorMessage, userId);
          }
        }
      } catch (error) {
        console.error('Error processing agent message:', error);
        const errorMessage = "I'm sorry, an error occurred while processing your request.";
        if (threadParentId && onRAGMessage && onRAGResponse) {
          onRAGResponse(errorMessage, userId);
        } else {
          addRAGResponse(errorMessage, userId);
        }
      } finally {
        setIsLoading(false);
      }

      setSelectedFile(null);
      return;
    }

    let id = null;
    if (threadParentId) {
      id = await addThreadReply(messageText, fileUrl, channelId, userId, threadParentId);
    } else {
      id = await addMessage(messageText, fileUrl, channelId, userId);
    }
    id = id?.id;
    // Generate embedding for the message
    if (id) {
      const fullMessageText = extractedText ? `${messageText} ${extractedText}` : messageText;
      
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embedding`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            type: 'INSERT',
            record: {
              id: Number(id),
              message: fullMessageText,
            }
          })
        });
      } catch (error) {
        console.error('Error generating embedding:', error);
      }
    }

    setMessageText('');
    setSelectedFile(null);
    // Reset the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAddEmoji = (emoji) => {
    const emojiChar = emoji.unified ? String.fromCodePoint(...emoji.unified.split('-').map(u => '0x' + u)) : emoji.native;
    setMessageText((prev) => prev + (emojiChar || emoji));
    setShowEmojiPicker(false);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col border border-gray-300 rounded-xl">
          <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-200">
            <button
              type="button"
              onClick={() => insertFormatting('**')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              aria-label="Bold"
              title="Bold (Ctrl+B)"
            >
              <FaBold size={16} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('_')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              aria-label="Italic"
              title="Italic (Ctrl+I)"
            >
              <FaItalic size={16} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('`')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              aria-label="Code"
              title="Code (Ctrl+`)"
            >
              <FaCode size={16} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('~~')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              aria-label="Strikethrough"
              title="Strikethrough (Ctrl+D)"
            >
              <FaStrikethrough size={16} />
            </button>
            <div className="h-5 w-px bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              aria-label="Add emoji"
              aria-haspopup="dialog"
              aria-expanded={showEmojiPicker}
            >
              <FaSmile size={16} />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              aria-label="Attach file"
            >
              <FaPaperclip size={16} />
            </button>
          </div>

          <div className="flex items-center px-2 py-1">
            <div className="flex-1">
              <TextareaAutosize
                ref={textareaRef}
                className="w-full px-2 py-2 focus:outline-none resize-none"
                placeholder={selectedFile ? `${selectedFile.name} - Add a message...` : placeholder || "Type your message..."}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                minRows={1}
                maxRows={5}
              />
              {selectedFile && (
                <div className="flex items-center gap-2 px-2 py-1 text-sm text-gray-600">
                  <FaPaperclip size={12} />
                  <span>{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`p-2 text-indigo-600 hover:text-indigo-800 focus:outline-none transition-opacity ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              aria-label="Send message"
            >
              <FaPaperPlane size={16} />
            </button>
          </div>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        
        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 z-10 mb-2">
            <Picker
              onEmojiSelect={handleAddEmoji}
              theme="light"
              showPreview={false}
              showSkinTones={false}
              data={async () => {
                const response = await fetch(
                  'https://cdn.jsdelivr.net/npm/@emoji-mart/data'
                );
                return response.json();
              }}
            />
          </div>
        )}
      </form>
    </div>
  );
};

export default MessageInput;