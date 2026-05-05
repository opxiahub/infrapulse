import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-neon-blue/20' : 'bg-neon-green/20'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-neon-blue" />
        ) : (
          <Bot className="w-4 h-4 text-neon-green" />
        )}
      </div>

      <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block max-w-[85%] rounded-lg px-4 py-2.5 ${
          isUser 
            ? 'bg-neon-blue/10 text-gray-100 border border-neon-blue/30' 
            : 'bg-surface-800 text-gray-200 border border-surface-600'
        }`}>
          <div className="text-sm whitespace-pre-wrap break-words">{content}</div>
        </div>
        {timestamp && (
          <div className="text-[10px] text-gray-600 mt-1 px-2">
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
