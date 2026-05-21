import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/interfaces';
import { ChatErrorCode } from './chat.errors';

// ─── Sliding window bucket ───────────────────────────────────────────────────

export interface RateBucketOptions {
  limit: number;
  windowMs: number;
}

/**
 * In-memory sliding-window rate limiter keyed by userId.
 * Each user has a buffer of timestamps; `consume()` drops entries older than
 * the window, then admits the event iff the buffer length is below the limit.
 */
export class ChatSlidingWindowBucket {
  private readonly buckets = new Map<string, number[]>();

  constructor(private readonly opts: RateBucketOptions) {}

  /** Returns true if the event is admitted (within limit), false if over the limit. */
  consume(userId: string): boolean {
    const now = Date.now();
    const cutoff = now - this.opts.windowMs;
    const arr = this.buckets.get(userId) ?? [];
    while (arr.length > 0 && arr[0] < cutoff) arr.shift();
    if (arr.length >= this.opts.limit) {
      this.buckets.set(userId, arr);
      return false;
    }
    arr.push(now);
    this.buckets.set(userId, arr);
    return true;
  }
}

// ─── Module singletons ───────────────────────────────────────────────────────

/** 60 messages / user / 60s — shared across REST and Socket.IO transports. */
export const sharedSendBucket = new ChatSlidingWindowBucket({ limit: 60, windowMs: 60_000 });

/** 30 uploads / user / 60s — REST-only. */
export const sharedUploadBucket = new ChatSlidingWindowBucket({ limit: 30, windowMs: 60_000 });

// ─── Express middleware factories ────────────────────────────────────────────

/**
 * Rate-limit middleware for send-message endpoints.
 * Reads `req.user.userId`, consumes from `sharedSendBucket`, and short-circuits
 * with HTTP 429 when the limit is exceeded.
 */
export const chatSendRateLimiter = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const userId = req.user?.userId;
  if (!userId) {
    next();
    return;
  }
  if (!sharedSendBucket.consume(userId)) {
    res.status(429).json({
      error: { code: ChatErrorCode.RateLimited, message: 'Too many chat requests' },
    });
    return;
  }
  next();
};

/**
 * Rate-limit middleware for upload endpoints.
 * Runs before multer so no file is written when the limit is already exceeded.
 */
export const chatUploadRateLimiter = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const userId = req.user?.userId;
  if (!userId) {
    next();
    return;
  }
  if (!sharedUploadBucket.consume(userId)) {
    res.status(429).json({
      error: { code: ChatErrorCode.RateLimited, message: 'Too many upload requests' },
    });
    return;
  }
  next();
};
