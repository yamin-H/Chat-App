
export type ClientEventType =
    | 'message:send'
    | 'message:read'
    | 'typing:start'
    | 'typing:stop'
    | 'presence:query';

export interface ClientEvent{
    type: ClientEventType;
    payload: any;
};

export type ServerEventType =
    | 'message:new'
    | 'message:ack'
    | 'message:deleted'
    | 'receipt:update'
    | 'typing:indicator'
    | 'presence:update'
    | 'error'
    | 'connected';

export interface ServerEvent{
    type: ServerEvent;
    payload: any;
};

export interface SendMessagePayload {
    chatId:          string
    content?:        string
    type:            string
    mediaUrl?:       string
    replyToId?:      string
    clientMessageId: string   
}

export interface TypingPayload {
    chatId: string
}

export interface ReadPayload {
    chatId: string
}

export interface PresenceQueryPayload {
    userIds: string[]
}