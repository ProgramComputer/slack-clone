// components/MessageInput.js
import { useState, useRef, useCallback } from 'react';
import { addMessage, uploadFile, addThreadReply, queryUserMessages } from '~/lib/Store';
import { FaPaperPlane, FaSmile, FaPaperclip, FaBold, FaItalic, FaCode, FaStrikethrough } from 'react-icons/fa';
import TextareaAutosize from 'react-textarea-autosize';
import Picker from '@emoji-mart/react';
import { useAgentMessages } from '~/lib/hooks/useAgentMessages';

const MessageInput = ({ channelId, userId, threadParentId, placeholder, otherParticipantId }) => {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const { addAgentMessage, addAgentResponse } = useAgentMessages();
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
    if (selectedFile) {
      const { data, error } = await uploadFile(selectedFile, userId);
      if (!error) {
        fileUrl = data.publicUrl;
      }
    }

    // Check if this is an agent message
    const isAgentMessage = messageText.trim().startsWith('@agent');
    
    if (isAgentMessage) {
      setIsLoading(true);
      try {
        // Add the user's agent message locally
      setMessageText('');
        addAgentMessage(messageText, userId);
        // Query the RAG system with otherParticipantId for DMs
        const text = JSON.parse(JSON.stringify(messageText))
        const response = await queryUserMessages(
          text.replace('@agent', '').trim(), 
          otherParticipantId
        );
        
        if (response) {
          // Add the agent's response locally
          const responseText = typeof response === 'string' ? response : response.response;
          // Add userID to allow deleting the message
          addAgentResponse(responseText, userId);
        } else {
          // Handle error case
          addAgentResponse("I'm sorry, I couldn't process your request at this time.", userId);
        }
      } catch (error) {
        console.error('Error processing agent message:', error);
        addAgentResponse("I'm sorry, an error occurred while processing your request.", userId);
      } finally {
        setIsLoading(false);
      }

      setSelectedFile(null);
      return;
    }

    if (threadParentId) {
      await addThreadReply(messageText, fileUrl, channelId, userId, threadParentId);
    } else {
      await addMessage(messageText, fileUrl, channelId, userId);
    }

    setMessageText('');
    setSelectedFile(null);
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