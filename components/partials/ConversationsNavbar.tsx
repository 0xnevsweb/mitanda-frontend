import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import { truncateAddress } from "@/utils";
import { Loader2, MessageCircle, MoreVertical, RefreshCcw, Search, UserPlus2, Users2 } from "lucide-react";
import { ConversationCard } from "../ui/ConversationCard";
import { useParams, useRouter } from "next/navigation";
import { Utils, type Conversation } from "@xmtp/browser-sdk";
import { useXMTP, type ContentTypes } from "@/contexts/XMTPContext";
import { isValidEthereumAddress, isValidInboxId } from "@/helpers/strings";
import { useSettings } from "@/hooks/useSettings";
import { GroupPermissionsOptions } from "@xmtp/browser-sdk";

const CreateDmModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const router = useRouter();
  const { newDm, newDmWithIdentifier } = useConversations();
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState<string>("");
  const [memberIdError, setMemberIdError] = useState<string | null>(null);
  const { environment } = useSettings();
  const utilsRef = useRef<Utils | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      let conversation: Conversation<ContentTypes>;
      if (isValidEthereumAddress(memberId)) {
        conversation = await newDmWithIdentifier({
          identifier: memberId,
          identifierKind: "Ethereum",
        });
      } else {
        conversation = await newDm(memberId);
      }
      onClose();

      router.push(`/chat/${conversation.id}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const utils = new Utils();
    utilsRef.current = utils;
    return () => {
      utils.close();
    };
  }, []);

  useEffect(() => {
    const checkMemberId = async () => {
      if (!memberId) {
        setMemberIdError(null);
        return;
      }

      if (!isValidEthereumAddress(memberId) && !isValidInboxId(memberId)) {
        setMemberIdError("Invalid address or inbox ID");
      } else if (isValidEthereumAddress(memberId) && utilsRef.current) {
        const inboxId = await utilsRef.current.getInboxIdForIdentifier(
          {
            identifier: memberId.toLowerCase(),
            identifierKind: "Ethereum",
          },
          environment,
        );
        if (!inboxId) {
          setMemberIdError("Address not registered on XMTP");
        } else {
          setMemberIdError(null);
        }
      } else {
        setMemberIdError(null);
      }
    };

    void checkMemberId();
  }, [memberId]);

  return (
    <div className="p-6 max-w-md w-full bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">New Direct Message</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address or inbox ID
          </label>
          <input
            type="text"
            className={`w-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 border text-gray-700 ${memberIdError ? "border-red-500" : "border-gray-300"} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="0x... or inbox ID"
          />
          {memberIdError && (
            <p className="mt-1 text-sm text-red-600">{memberIdError}</p>
          )}
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || memberIdError !== null}
            className={`px-4 py-2 text-sm font-medium text-white ${loading || memberIdError ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} rounded-lg transition-colors flex items-center`}
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateGroupModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const router = useRouter();
  const { newGroup } = useConversations();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrlSquare, setImageUrlSquare] = useState("");
  const [addedMembers, setAddedMembers] = useState<string[]>([]);
  const [memberIdError, setMemberIdError] = useState<string | null>(null)
  const { environment } = useSettings();
  const utilsRef = useRef<Utils | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const addedMemberInboxIds = addedMembers.filter((member) =>
        isValidInboxId(member),
      );
      const conversation = await newGroup(addedMemberInboxIds, {
        name,
        description,
        imageUrlSquare,
        permissions: GroupPermissionsOptions.Default,
        customPermissionPolicySet: undefined,
      });

      const addedMemberAddresses = addedMembers.filter((member) =>
        isValidEthereumAddress(member),
      );
      if (addedMemberAddresses.length > 0) {
        await conversation.addMembersByIdentifiers(
          addedMemberAddresses.map((address) => ({
            identifier: address.toLowerCase(),
            identifierKind: "Ethereum",
          })),
        );
      }
      onClose();
      router.push(`/chat/${conversation.id}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const utils = new Utils();
    utilsRef.current = utils;
    return () => {
      utils.close();
    };
  }, []);

  return (
    <div className="p-6 max-w-md w-full bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">New Group Chat</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
          <input
            type="text"
            className="w-full px-4 py-2 border  border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter group description"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
          <input
            type="text"
            className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={imageUrlSquare}
            onChange={(e) => setImageUrlSquare(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Members</label>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
              Added members: {addedMembers.length}
            </span>
          </div>
          {memberIdError && <p className="text-red-500 text-sm">{memberIdError}</p>}
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-2"
            placeholder="Add member by address or inbox ID"
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const input = e.currentTarget;
                const value = input?.value?.trim();

                if (!value) return;

                try {
                  if (!isValidEthereumAddress(value)) {
                    setMemberIdError("Invalid address");
                    return;
                  }

                  if (!utilsRef.current) {
                    return;
                  }

                  const inboxId = await utilsRef.current.getInboxIdForIdentifier(
                    {
                      identifier: value,
                      identifierKind: "Ethereum",
                    },
                    environment
                  );

                  if (!inboxId) {
                    setMemberIdError("Address not registered on XMTP");
                  } else {
                    console.log(value);
                    setAddedMembers([...addedMembers, value]);
                    setMemberIdError(null);
                    if (input) {
                      input.value = '';
                    }
                  }
                } catch (error) {
                  console.error("Error processing address:", error);
                  setMemberIdError("Error processing address");
                }
              }
            }}
          />
          {addedMembers.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {addedMembers.map((member, index) => (
                <div key={index} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded-sm hover:bg-gray-100 border border-gray-100">
                  <span className="text-sm text-gray-700 truncate">{member}</span>
                  <button
                    onClick={() => setAddedMembers(addedMembers.filter((_, i) => i !== index))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} rounded-lg transition-colors flex items-center`}
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConversationsNavbar: React.FC = () => {
  const { id } = useParams();
  const { list, loading, syncing, conversations, stream, syncAll } = useConversations();
  const { client } = useXMTP();
  const stopStreamRef = useRef<(() => void) | null>(null);
  const [showDmModal, setShowDmModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncTap, setSyncTap] = useState("all");

  const startStream = useCallback(async () => {

    stopStreamRef.current = await stream();
  }, [stream]);

  const stopStream = useCallback(() => {
    stopStreamRef.current?.();
    stopStreamRef.current = null;
  }, []);

  const handleSync = useCallback(async () => {
    setSyncTap('conv');
    stopStream();
    await list(undefined, true);
    await startStream();
    setShowSyncMenu(false);
  }, [list, startStream, stopStream]);

  const handleSyncAll = useCallback(async () => {
    setSyncTap('msg');
    stopStream();
    await syncAll();
    await startStream();
    setShowSyncMenu(false);
  }, [syncAll, startStream, stopStream]);

  const hasMounted = useRef(false);

  useEffect(() => {
    const loadConversations = async () => {
      await list(undefined);
      await startStream();
    };
    if (!hasMounted.current) {
      void loadConversations();
      hasMounted.current = true;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conversation => {
      const searchLower = searchTerm.toLowerCase();
      return conversation.id?.toLowerCase().includes(searchLower);
    });
  }, [conversations, searchTerm])

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Modal Backdrops */}
      {(showDmModal || showGroupModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          {showDmModal && <CreateDmModal onClose={() => setShowDmModal(false)} />}
          {showGroupModal && <CreateGroupModal onClose={() => setShowGroupModal(false)} />}
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">XMTP Chat</h1>
            <p className="text-xs text-gray-500">{truncateAddress(client?.inboxId || '')}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDmModal(true)}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full"
              title="New Chat"
            >
              <UserPlus2 size={18} />
            </button>
            <button
              onClick={() => setShowGroupModal(true)}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full"
              title="New Group"
            >
              <Users2 size={18} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSyncMenu(!showSyncMenu)}
                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                title="Sync options"
              >
                <MoreVertical size={18} />
              </button>
              {showSyncMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                  <button
                    onClick={handleSync}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                    disabled={syncing}
                  >
                    {syncing && syncTap === 'conv' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCcw size={16} />
                    )}
                    <span>Sync Conversations</span>
                  </button>
                  <button
                    onClick={handleSyncAll}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                    disabled={syncing}
                  >
                    {syncing && syncTap === 'msg' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCcw size={16} />
                    )}
                    <span>Sync All Messages</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Filter by Conversation ID</span>
          </label>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-500 hover:text-blue-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-500">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
            <p>No conversations found</p>
            <p className="text-sm">{searchTerm ? "Try a different search" : "Start a new chat to begin messaging"}</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationCard conversation={conversation} key={conversation.id} selectedId={id as string} />
          ))
        )}
      </div>
    </div>
  );
};