import { HttpException } from '../../common/exceptions';

// ─── Error codes ─────────────────────────────────────────────────────────────

export const ChatErrorCode = {
  ValidationError: 'CHAT_VALIDATION_ERROR',
  Unauthorized: 'CHAT_UNAUTHORIZED',
  Forbidden: 'CHAT_FORBIDDEN',
  NotFound: 'CHAT_NOT_FOUND',
  Conflict: 'CHAT_CONFLICT',
  RateLimited: 'CHAT_RATE_LIMITED',
  PayloadTooLarge: 'CHAT_PAYLOAD_TOO_LARGE',
  UploadFailed: 'CHAT_UPLOAD_FAILED',
  AutosubscribeFailed: 'CHAT_AUTOSUBSCRIBE_FAILED',
  JoinForbidden: 'CHAT_JOIN_FORBIDDEN',
} as const;

export type ChatErrorCodeValue = (typeof ChatErrorCode)[keyof typeof ChatErrorCode];

// ─── Base exception ──────────────────────────────────────────────────────────

export class ChatException extends HttpException {
  public readonly code: ChatErrorCodeValue;

  constructor(statusCode: number, code: ChatErrorCodeValue, message: string) {
    super(statusCode, message);
    this.code = code;
    Object.setPrototypeOf(this, ChatException.prototype);
  }
}

// ─── Subclasses ──────────────────────────────────────────────────────────────

export class ChatValidationException extends ChatException {
  constructor(message = 'Invalid chat request') {
    super(400, ChatErrorCode.ValidationError, message);
    Object.setPrototypeOf(this, ChatValidationException.prototype);
  }
}

export class ChatUnauthorizedException extends ChatException {
  constructor(message = 'Authentication required') {
    super(401, ChatErrorCode.Unauthorized, message);
    Object.setPrototypeOf(this, ChatUnauthorizedException.prototype);
  }
}

export class ChatForbiddenException extends ChatException {
  constructor(message = 'Access denied') {
    super(403, ChatErrorCode.Forbidden, message);
    Object.setPrototypeOf(this, ChatForbiddenException.prototype);
  }
}

export class ChatNotFoundException extends ChatException {
  constructor(message = 'Conversation not found') {
    super(404, ChatErrorCode.NotFound, message);
    Object.setPrototypeOf(this, ChatNotFoundException.prototype);
  }
}

export class ChatConflictException extends ChatException {
  constructor(message = 'Chat resource conflict') {
    super(409, ChatErrorCode.Conflict, message);
    Object.setPrototypeOf(this, ChatConflictException.prototype);
  }
}

export class ChatRateLimitedException extends ChatException {
  constructor(message = 'Too many chat requests') {
    super(429, ChatErrorCode.RateLimited, message);
    Object.setPrototypeOf(this, ChatRateLimitedException.prototype);
  }
}

export class ChatPayloadTooLargeException extends ChatException {
  constructor(message = 'Payload exceeds size limit') {
    super(413, ChatErrorCode.PayloadTooLarge, message);
    Object.setPrototypeOf(this, ChatPayloadTooLargeException.prototype);
  }
}

export class ChatUploadFailedException extends ChatException {
  constructor(message = 'Attachment upload failed') {
    super(400, ChatErrorCode.UploadFailed, message);
    Object.setPrototypeOf(this, ChatUploadFailedException.prototype);
  }
}

// ─── Socket ack mapper ───────────────────────────────────────────────────────

/** Maps any thrown error into a Socket.IO ack failure body. */
export function mapErrorToSocketAck(err: unknown): { success: false; error: { code: string; message: string } } {
  if (err instanceof ChatException) {
    return { success: false, error: { code: err.code, message: err.message } };
  }
  return {
    success: false,
    error: {
      code: ChatErrorCode.UploadFailed,
      message: (err as Error)?.message ?? 'Internal error',
    },
  };
}
