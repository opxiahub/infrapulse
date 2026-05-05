import { useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-surface-600 p-3 bg-surface-900 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about your infrastructure..."
          disabled={disabled}
          className="flex-1 input-field resize-none min-h-[44px] max-h-[120px] text-sm"
          rows={1}
          style={{
            height: 'auto',
            minHeight: '44px'
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="btn-primary min-h-11 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <div className="hidden sm:block text-[10px] text-gray-600 mt-1.5">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
