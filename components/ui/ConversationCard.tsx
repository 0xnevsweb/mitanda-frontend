import { type Conversation, type Dm, type Group } from "@xmtp/browser-sdk";
import { useEffect, useState } from "react";
import type { ContentTypes } from "@/contexts/XMTPContext";
import { formatTimeFromBigInt, truncateAddress } from "@/utils";
import { useRouter } from "next/navigation";

const isGroupConversation = (
  conversation: Conversation<ContentTypes>,
): conversation is Group<ContentTypes> => {
  return conversation.metadata?.conversationType === "group";
};

const isDmConversation = (
  conversation: Conversation<ContentTypes>,
): conversation is Dm<ContentTypes> => {
  return conversation.metadata?.conversationType === "dm";
};

export type ConversationCardProps = {
  conversation: Conversation<ContentTypes>;
  selectedId: string;
};

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  selectedId
}) => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lastMessage, setLastMessage] = useState<any>("");

  useEffect(() => {
    void conversation.messages().then((messages) => {
      if (messages.length)
        setLastMessage(messages[messages.length - 1])
    });
  }, [conversation.id]);

  useEffect(() => {
    if (isGroupConversation(conversation)) {
      setName(conversation.name ?? "");
    }
    if (isDmConversation(conversation)) {
      setName(conversation.id);
    }
  }, [conversation.id]);

  return (
    <div
      key={conversation.id}
      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 ${selectedId === conversation.id
        ? 'bg-blue-50 border-l-4 border-l-blue-500'
        : ''
        }`}
      onClick={() => { router.push(`/chat/${conversation.id}`) }}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            {name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 truncate">
              {name.length > 24 ? truncateAddress(name || '') : name}
            </h3>
            {lastMessage && (
              <span className="text-xs text-gray-500">
                {formatTimeFromBigInt(lastMessage.sentAtNs)}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center gap-2">
            <p className="text-sm text-gray-600 truncate w-full">
              {typeof lastMessage.content === 'string' ? lastMessage.content : ''}
            </p>
            {/* {lastMessage && (
              <span className="text-xs text-gray-500">
                {formatTimeFromBigInt(lastMessage.sentAtNs)}
              </span>
            )} */}
          </div>

        </div>
      </div>
    </div>
  );
};
