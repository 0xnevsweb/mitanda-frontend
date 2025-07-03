'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Send,
    MessageCircle,
    Settings,
    Check,
    X,
} from 'lucide-react';
import { formatTimeFromBigInt, truncateAddress } from '@/utils';
import { useParams, useRouter } from 'next/navigation';
import { Dm, Group, Conversation as XmtpConversation } from "@xmtp/browser-sdk";
import { ContentTypes, useXMTP } from '@/contexts/XMTPContext';
import { useConversations } from '@/hooks/useConversations';
import { useConversation } from '@/hooks/useConversation';

type ConversationProps = {
    conversation: XmtpConversation<ContentTypes>;
};

type DisplayMessage = {
    id: string;
    content: string | boolean;
    senderInboxId: string;
    sentAtNs: bigint;
    isPending?: boolean;
    status?: 'pending' | 'sent' | 'failed';
};


const Conversation: React.FC<ConversationProps> = ({ conversation }) => {
    const { client } = useXMTP();
    const {
        messages,
        pendingMessages,
        getMessages,
        loading: conversationLoading,
        streamMessages,
        send,
        resendMessage,
    } = useConversation(conversation);
    const stopStreamRef = useRef<(() => void) | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [newMessage, setNewMessage] = useState("");

    // Combine real messages and pending messages for display
    const allMessages = useMemo<DisplayMessage[]>(() => {
        const realMessages: DisplayMessage[] = messages.map(msg => ({
            id: msg.id,
            content: typeof msg.content === 'string' ? msg.content : false,
            senderInboxId: msg.senderInboxId,
            sentAtNs: msg.sentAtNs,
            isPending: false,
        }));

        const pending: DisplayMessage[] = pendingMessages.map(msg => ({
            id: msg.id,
            content: msg.content,
            senderInboxId: msg.senderInboxId,
            sentAtNs: BigInt(msg.sentAt.getTime()) * 1_000_000n,
            isPending: true,
            status: msg.status,
        }));

        return [...realMessages, ...pending].sort((a, b) =>
            Number(a.sentAtNs - b.sentAtNs)
        );
    }, [messages, pendingMessages]);

    const hasMounted = useRef(false);

    const startStream = useCallback(async () => {
        stopStreamRef.current = await streamMessages();
    }, [streamMessages]);

    const stopStream = useCallback(() => {
        stopStreamRef.current?.();
        stopStreamRef.current = null;
    }, []);

    const handleSend = async () => {
        if (newMessage.length === 0) {
            return;
        }

        send(newMessage);
        setNewMessage("");
    };


    useEffect(() => {
        if (!hasMounted.current) {
            const loadMessages = async () => {
                stopStream();
                await getMessages(undefined, true);
                await startStream();
            };
            void loadMessages();
            hasMounted.current = true;
        }

        return () => {
            stopStream();
        };
    }, []);

    const groupMessages = (messagesToGroup: DisplayMessage[]): DisplayMessage[][] => {
        if (messagesToGroup.length === 0) return [];

        const groups: DisplayMessage[][] = [];
        let currentGroup: DisplayMessage[] = [messagesToGroup[0]];

        for (let i = 1; i < messagesToGroup.length; i++) {
            const prevMessage = messagesToGroup[i - 1];
            const currentMessage = messagesToGroup[i];

            const prevMilliseconds = Number(prevMessage.sentAtNs / 1_000_000n);
            const prevDate = new Date(prevMilliseconds);

            const currentMilliseconds = Number(currentMessage.sentAtNs / 1_000_000n);
            const currentDate = new Date(currentMilliseconds);

            // Group messages if they're from the same sender within 5 minutes
            if (currentMessage.senderInboxId === prevMessage.senderInboxId &&
                (currentDate.getTime() - prevDate.getTime()) < 5 * 60 * 1000) {
                currentGroup.push(currentMessage);
            } else {
                groups.push(currentGroup);
                currentGroup = [currentMessage];
            }
        }

        groups.push(currentGroup);
        return groups;
    };

    const renderStatusIndicator = (status: 'pending' | 'sent' | 'failed', messageId: string) => {
        switch (status) {
            case 'pending':
                return <div className="w-3 h-3 rounded-full border-1 border-white border-t-transparent animate-spin" />;
            case 'sent':
                return <Check size={12} className="text-blue-300" />;
            case 'failed':
                return (
                    <div className="flex items-center">
                        <X size={12} className="text-red-500" />
                        <button
                            onClick={() => resendMessage(messageId)}
                            className="ml-1 text-xs text-red-500 hover:text-red-700"
                            aria-label="Retry sending message"
                        >
                            Retry
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [allMessages]);


    return (
        <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversationLoading ? (
                    <div className='flex items-center justify-center mt-32'>
                        <div className="text-center text-gray-500">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p>Loading messages...</p>
                        </div>
                    </div>
                ) : allMessages.length === 0 ? (
                    <div className='flex items-center justify-center mt-32'>
                        <div className="text-center text-gray-500">
                            <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
                            <p>No messages yet</p>
                            <p className="text-sm">Start the conversation!</p>
                        </div>
                    </div>
                ) : (
                    groupMessages(allMessages).map((messageGroup, groupIndex) => (
                        <div
                            key={`group-${groupIndex}`}
                            className={`flex ${messageGroup[0].senderInboxId === client?.inboxId
                                ? 'justify-end'
                                : 'justify-start'
                                }`}
                        >
                            {
                                messageGroup[0].senderInboxId !== client?.inboxId && <div className="w-10 h-10 bg-blue-500 mr-1 mt-auto rounded-full flex items-center justify-center text-white font-semibold">
                                    {truncateAddress(messageGroup[0].senderInboxId || '').slice(0, 2).toUpperCase()}
                                </div>
                            }

                            <div className={`space-y-0.5 flex flex-col ${messageGroup[0].senderInboxId === client?.inboxId ? 'items-end' : 'items-start'}`}>
                                {messageGroup.map((message, msgIndex) => {
                                    const isUserMessage = message.senderInboxId === client?.inboxId;
                                    const isFirstMessage = msgIndex === 0;
                                    const isLastMessage = msgIndex === messageGroup.length - 1;
                                    const isPending = message.isPending;

                                    // Determine rounded corners
                                    let roundedClasses = '';
                                    if (messageGroup.length === 1) {
                                        roundedClasses = isUserMessage ? 'rounded-xl rounded-br-none' : 'rounded-xl rounded-bl-none';
                                    } else if (isFirstMessage) {
                                        roundedClasses = isUserMessage ? 'rounded-t-xl rounded-bl-xl' : 'rounded-t-xl rounded-br-xl';
                                    } else if (isLastMessage) {
                                        roundedClasses = isUserMessage ? 'rounded-bl-xl rounded-tl-xl rounded-tr-lg' : 'rounded-br-xl rounded-tr-xl rounded-tl-sm';
                                    } else {
                                        roundedClasses = isUserMessage ? 'rounded-md rounded-l-xl' : 'rounded-md rounded-r-xl'
                                    }

                                    if (typeof message.content !== 'string')
                                        return

                                    return (
                                        <div
                                            key={message.id}
                                            className={`max-w-xs lg:max-w-md w-fit px-4 py-2 ${isUserMessage
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 text-gray-800'
                                                } ${roundedClasses} ${isPending ? 'opacity-90' : ''}`}
                                        >
                                            <p className="break-words">{message.content}</p>
                                            {isLastMessage && (
                                                <div className={`flex items-center mt-1 space-x-1 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                                                    {isUserMessage && message.status && (
                                                        <div className="mr-1">
                                                            {renderStatusIndicator(message.status, message.id)}
                                                        </div>
                                                    )}
                                                    <p className={`text-xs ${isUserMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                                        {formatTimeFromBigInt(message.sentAtNs)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Message input"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </>
    );
};

const ChatContent = () => {
    const router = useRouter();
    const { id } = useParams();
    const { getConversationById } = useConversations();
    const [conversation, setConversation] = useState<
        Group<ContentTypes> | Dm<ContentTypes> | undefined
    >(undefined);

    useEffect(() => {
        const loadConversation = async () => {
            if (id) {
                const conversation = await getConversationById(id as string);
                if (conversation) {
                    setConversation(conversation);
                } else {
                    router.push('/chat/home')
                }
            }
        };
        void loadConversation();
    }, [id]);

    return (<>
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
            {id !== 'home' && conversation ? (
                <>
                    {/* Chat Header */}
                    <div className="p-4 border-b bg-white flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {truncateAddress(conversation.id || '').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-800">
                                    {truncateAddress(conversation.id || '')}
                                </h2>
                                <p className="text-sm text-gray-500">XMTP conversation</p>
                            </div>
                        </div>

                        <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full">
                            <Settings size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <Conversation conversation={conversation} />
                </>
            ) : (
                id === 'home' &&
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
                        <h2 className="text-xl font-semibold text-gray-600 mb-2">Welcome to XMTP Chat</h2>
                        <p className="text-gray-500">Select a conversation to start messaging</p>
                    </div>
                </div>
            )}
        </div>
    </>
    );
};

export default ChatContent;