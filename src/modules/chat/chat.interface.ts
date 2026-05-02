export interface CreateConversationDto {
  tradieId: string;
}

export interface SendMessageDto {
  conversationId: string;
  content: string;
  type?: string;
  attachments?: string[];
}
