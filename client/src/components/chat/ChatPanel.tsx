import { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Loader2, AlertTriangle } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sourceType: 'aws' | 'gcp' | 'azure' | 'k8s';
  sourceId: number | null;
  sourceLabel: string;
  sourceSubtitle: string;
  namespace?: string;
}

export function ChatPanel({
  isOpen,
  onClose,
  sourceType,
  sourceId,
  sourceLabel,
  sourceSubtitle,
  namespace,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Reset chat when provider changes
    if (isOpen) {
      let welcomeContent: string;
      if (sourceType === 'k8s') {
        welcomeContent = `👋 Hello! I'm your Kubernetes assistant for **${sourceLabel}**.\n\nI'm grounded on the scanned **${namespace || 'selected'}** namespace metadata in ${sourceSubtitle}. Ask me about:\n\n• Workloads, pods, jobs, and cronjobs\n• Services, ingresses, and exposed backends\n• Images, replica counts, readiness, and restart counts\n• ConfigMaps, secrets, PVCs, and node metadata\n• Relationships between scanned namespace resources\n\nWhat would you like to know?`;
      } else if (sourceType === 'gcp') {
        welcomeContent = `👋 Hello! I'm your infrastructure assistant for **${sourceLabel}** (${sourceSubtitle}).\n\nI can help you understand your GCP infrastructure configuration and metadata. Ask me about:\n\n• Resource counts and lists\n• Configuration details (machine types, Cloud SQL tiers, etc.)\n• Network settings (VPCs, subnets, firewall rules)\n• Labels and management status (IaC vs manual)\n• Resource relationships\n\nWhat would you like to know?`;
      } else if (sourceType === 'azure') {
        welcomeContent = `👋 Hello! I'm your infrastructure assistant for **${sourceLabel}** (${sourceSubtitle}).\n\nI can help you understand your Azure infrastructure configuration and metadata. Ask me about:\n\n• Resource counts and lists\n• Configuration details (VM sizes, SKUs, endpoints, etc.)\n• Network settings (VNets, subnets, NSGs, public IPs)\n• Tags and management status (IaC vs manual)\n• Resource relationships\n\nWhat would you like to know?`;
      } else {
        welcomeContent = `👋 Hello! I'm your infrastructure assistant for **${sourceLabel}** (${sourceSubtitle}).\n\nI can help you understand your infrastructure configuration and metadata. Ask me about:\n\n• Resource counts and lists\n• Configuration details (instance types, runtime, etc.)\n• Network settings (VPCs, subnets, IPs)\n• Tags and management status\n• Resource relationships\n\nWhat would you like to know?`;
      }
      setMessages([{
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date().toISOString()
      }]);
      setError(null);
    }
  }, [isOpen, sourceType, sourceId, sourceLabel, sourceSubtitle, namespace]);

  const handleSendMessage = async (message: string) => {
    if (!sourceId) {
      setError(sourceType === 'k8s' ? 'No cluster selected' : 'No provider selected');
      return;
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          sourceType,
          providerId: sourceType !== 'k8s' ? sourceId : undefined,
          clusterId: sourceType === 'k8s' ? sourceId : undefined,
          namespace: sourceType === 'k8s' ? namespace : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message');
      
      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 h-[82dvh] bg-surface-900 border-t border-surface-600 rounded-t-lg shadow-2xl flex flex-col z-50 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[420px] sm:h-[600px] sm:border sm:rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-surface-600 bg-surface-800 rounded-t-lg sm:rounded-t-lg">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-5 h-5 text-neon-green shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-gray-100">Infrastructure Assistant</h3>
            <p className="text-[10px] text-gray-500 truncate">{sourceLabel} • {sourceSubtitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-10 w-10 rounded border border-surface-600 bg-surface-900 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors shrink-0"
          title="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 overscroll-contain">
        {messages.map((msg, idx) => (
          <ChatMessage
            key={idx}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}
        
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-neon-red/10 border border-neon-red/30 rounded text-neon-red text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={loading || !sourceId} />
    </div>
  );
}
