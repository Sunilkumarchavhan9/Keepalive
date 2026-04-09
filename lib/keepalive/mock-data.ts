import type {
  ChatSummary,
  Message,
  MessageFilter,
  MessageQueryResult,
} from "@photon-ai/imessage-kit";

function ago(days: number, hours = 0): Date {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000);
}

const chats: ChatSummary[] = [
  {
    chatId: "chat-bridget-nvidia",
    displayName: "Bridget at NVIDIA",
    isGroup: false,
    unreadCount: 1,
    lastMessageAt: ago(4),
  },
  {
    chatId: "chat-danny",
    displayName: "Danny",
    isGroup: false,
    unreadCount: 0,
    lastMessageAt: ago(11),
  },
  {
    chatId: "chat-kartik",
    displayName: "Kartik",
    isGroup: false,
    unreadCount: 1,
    lastMessageAt: ago(2, 6),
  },
  {
    chatId: "chat-aarav",
    displayName: "Aarav",
    isGroup: false,
    unreadCount: 0,
    lastMessageAt: ago(11),
  },
  {
    chatId: "chat-riya",
    displayName: "Riya",
    isGroup: false,
    unreadCount: 0,
    lastMessageAt: ago(8),
  },
  {
    chatId: "chat-uncle-raj",
    displayName: "Uncle Raj",
    isGroup: false,
    unreadCount: 0,
    lastMessageAt: ago(20),
  },
];

const messages: Message[] = [
  {
    id: "m-1",
    guid: "guid-1",
    text: "Can you send over the deck when you get a chance?",
    sender: "bridget@nvidia.com",
    senderName: "Bridget",
    chatId: "chat-bridget-nvidia",
    isGroupChat: false,
    service: "iMessage",
    isRead: false,
    isFromMe: false,
    isReaction: false,
    reactionType: null,
    isReactionRemoval: false,
    associatedMessageGuid: null,
    attachments: [],
    date: ago(4),
  },
  {
    id: "m-2",
    guid: "guid-2",
    text: "Absolutely. I will send the deck after I clean up the metrics slide.",
    sender: "me",
    senderName: "Me",
    chatId: "chat-bridget-nvidia",
    isGroupChat: false,
    service: "iMessage",
    isRead: true,
    isFromMe: true,
    isReaction: false,
    reactionType: null,
    isReactionRemoval: false,
    associatedMessageGuid: null,
    attachments: [],
    date: ago(5),
  },
  {
    id: "m-3",
    guid: "guid-3",
    text: "Thanks again for joining. Can you send the workshop notes?",
    sender: "+15550000001",
    senderName: "Danny",
    chatId: "chat-danny",
    isGroupChat: false,
    service: "iMessage",
    isRead: true,
    isFromMe: false,
    isReaction: false,
    reactionType: null,
    isReactionRemoval: false,
    associatedMessageGuid: null,
    attachments: [],
    date: ago(11),
  },
  {
    id: "m-4",
    guid: "guid-4",
    text: "Yep, I will send the notes tonight.",
    sender: "me",
    senderName: "Me",
    chatId: "chat-danny",
    isGroupChat: false,
    service: "iMessage",
    isRead: true,
    isFromMe: true,
    isReaction: false,
    reactionType: null,
    isReactionRemoval: false,
    associatedMessageGuid: null,
    attachments: [],
    date: ago(12),
  },
  {
    id: "m-5",
    guid: "guid-5",
    text: "Did you get a chance to look at the intro doc?",
    sender: "+15550000002",
    senderName: "Kartik",
    chatId: "chat-kartik",
    isGroupChat: false,
    service: "iMessage",
    isRead: false,
    isFromMe: false,
    isReaction: false,
    reactionType: null,
    isReactionRemoval: false,
    associatedMessageGuid: null,
    attachments: [],
    date: ago(2, 6),
  },
  {
    id: "m-6",
    guid: "guid-6",
    text: "Will do, I will send it after lunch.",
    sender: "me",
    senderName: "Me",
    chatId: "chat-kartik",
    isGroupChat: false,
    service: "iMessage",
    isRead: true,
    isFromMe: true,
    isReaction: false,
    reactionType: null,
    isReactionRemoval: false,
    associatedMessageGuid: null,
    attachments: [],
    date: ago(3),
  },
  {
    id: "m-7",
    guid: "guid-7",
    text: "You said you would send me the notes when you were back.",
    sender: "+15550000003",
    senderName: "Aarav",
    chatId: "chat-aarav",
    isGroupChat: false,
    service: "iMessage",
    isRead: true,
    isFromMe: false,
    isReaction: false,
    reactionType: null,
    isReactionRemoval: false,
    associatedMessageGuid: null,
    attachments: [],
    date: ago(11),
  },
  {
    id: "m-8",
    guid: "guid-8",
    text: "Want to meet this week?",
    sender: "+15550000004",
    senderName: "Riya",
    chatId: "chat-riya",
    isGroupChat: false,
    service: "iMessage",
    isRead: true,
    isFromMe: false,
    isReaction: false,
    reactionType: null,
    isReactionRemoval: false,
    associatedMessageGuid: null,
    attachments: [],
    date: ago(8),
  },
  {
    id: "m-9",
    guid: "guid-9",
    text: "Hey beta, just checking how you are doing.",
    sender: "+15550000005",
    senderName: "Uncle Raj",
    chatId: "chat-uncle-raj",
    isGroupChat: false,
    service: "iMessage",
    isRead: true,
    isFromMe: false,
    isReaction: false,
    reactionType: null,
    isReactionRemoval: false,
    associatedMessageGuid: null,
    attachments: [],
    date: ago(20),
  },
];

export function listMockChats(search?: string): ChatSummary[] {
  if (!search) {
    return chats;
  }

  const query = search.toLowerCase();
  return chats.filter((chat) =>
    (chat.displayName ?? chat.chatId).toLowerCase().includes(query)
  );
}

export function getMockMessages(
  filter: MessageFilter = {}
): MessageQueryResult {
  const filtered = messages
    .filter((message) => {
      if (filter.chatId && message.chatId !== filter.chatId) {
        return false;
      }

      if (filter.sender && message.sender !== filter.sender) {
        return false;
      }

      if (filter.excludeOwnMessages && message.isFromMe) {
        return false;
      }

      if (filter.unreadOnly && message.isRead) {
        return false;
      }

      if (filter.search) {
        const haystack = `${message.senderName ?? ""} ${message.text ?? ""}`.toLowerCase();
        if (!haystack.includes(filter.search.toLowerCase())) {
          return false;
        }
      }

      return true;
    })
    .sort((left, right) => right.date.getTime() - left.date.getTime());

  const limited = filtered.slice(0, filter.limit ?? filtered.length);

  return {
    messages: limited,
    total: filtered.length,
    unreadCount: filtered.filter((message) => !message.isRead).length,
  };
}
