import type {
  Conversation,
  DecodedMessage,
  SafeListMessagesOptions,
} from "@xmtp/browser-sdk";
import { useState } from "react";
import { useXMTP, type ContentTypes } from "@/contexts/XMTPContext";

type PendingMessage = {
  id: string;
  content: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt: Date;
  senderInboxId: string;
};

export const useConversation = (conversation?: Conversation<ContentTypes>) => {
  const { client } = useXMTP();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [messages, setMessages] = useState<DecodedMessage<ContentTypes>[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

  // Generate a temporary ID for pending messages
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const getMessages = async (
    options?: SafeListMessagesOptions,
    syncFromNetwork: boolean = false,
  ) => {
    if (!client) {
      return;
    }

    setMessages([]);
    setLoading(true);

    if (syncFromNetwork) {
      await sync();
    }

    try {
      const msgs = (await conversation?.messages(options)) ?? [];
      setMessages(msgs);
      return msgs;
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    if (!client) {
      return;
    }

    setSyncing(true);

    try {
      await conversation?.sync();
    } finally {
      setSyncing(false);
    }
  };

  const send = async (content: string) => {
    if (!client || !content.trim()) {
      return;
    }

    // Create a pending message
    const tempMessage: PendingMessage = {
      id: generateTempId(),
      content,
      status: 'pending',
      sentAt: new Date(),
      senderInboxId: client.inboxId || '',
    };

    // Add to pending messages
    setPendingMessages(prev => [...prev, tempMessage]);

    try {
      // Send the message
      await conversation?.send(content);
      
      // Update status to sent
      setPendingMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id ? {...msg, status: 'sent'} : msg
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Update status to failed
      setPendingMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id ? {...msg, status: 'failed'} : msg
        )
      );
    }
  };

  const resendMessage = async (messageId: string) => {
    const messageToResend = pendingMessages.find(msg => msg.id === messageId);
    if (!messageToResend) return;

    // Update status back to pending
    setPendingMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? {...msg, status: 'pending'} : msg
      )
    );

    try {
      await conversation?.send(messageToResend.content);
      
      // Update status to sent
      setPendingMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? {...msg, status: 'sent'} : msg
        )
      );
    } catch (error) {
      console.error('Failed to resend message:', error);
      // Keep status as failed
    }
  };

  const streamMessages = async () => {
    const noop = () => {};
    if (!client) {
      return noop;
    }

    const onMessage = (
      error: Error | null,
      message: DecodedMessage<ContentTypes> | undefined,
    ) => {
      if (message) {
        // Check if this message corresponds to any pending message
        setPendingMessages(prev => 
          prev.filter(msg => msg.content !== message.content)
        );
        
        // Add to messages if not already there
        if (!messages.some(m => m.id === message.id)) {
          setMessages(prev => [...prev, message]);
        }
      }
    };

    const stream = await conversation?.stream(onMessage);

    return stream
      ? () => {
          void stream.return(undefined);
        }
      : noop;
  };

  return {
    getMessages,
    loading,
    messages,
    pendingMessages,
    send,
    resendMessage,
    streamMessages,
    sync,
    syncing,
  };
};