// components/MessageInput.js
import { useState, useRef } from 'react';
import { addMessage, uploadFile, addThreadReply } from '~/lib/Store';
import { FaPaperPlane, FaSmile, FaPaperclip } from 'react-icons/fa';
import TextareaAutosize from 'react-textarea-autosize';
import Picker from '@emoji-mart/react';

const MessageInput = ({ channelId, userId, threadParentId, placeholder }) => {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

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
        <div className="flex items-center border border-gray-300 rounded-xl px-2 py-1">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none p-2"
            aria-label="Add emoji"
            aria-haspopup="dialog"
            aria-expanded={showEmojiPicker}
          >
            <FaSmile size={20} />
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-500 hover:text-gray-700 focus:outline-none p-2"
            aria-label="Attach file"
          >
            <FaPaperclip size={20} />
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <div className="flex-1">
            <TextareaAutosize
              className="w-full px-2 py-2 focus:outline-none resize-none"
              placeholder={selectedFile ? `${selectedFile.name} - Add a message...` : "Type your message..."}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
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
            className="text-indigo-600 hover:text-indigo-800 focus:outline-none p-2"
            aria-label="Send message"
          >
            <FaPaperPlane size={20} />
          </button>
        </div>
        
        {showEmojiPicker && (
          <div className="absolute bottom-12 left-0 z-10">
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