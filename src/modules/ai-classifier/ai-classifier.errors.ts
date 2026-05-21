import { HttpException } from '../../common/exceptions/http.exception';

export const AiClassifierErrorCode = {
  ValidationError: 'AI_CLASSIFIER_VALIDATION_ERROR',
  Unauthorized: 'AI_CLASSIFIER_UNAUTHORIZED',
  RateLimited: 'AI_CLASSIFIER_RATE_LIMITED',
  ProviderError: 'AI_CLASSIFIER_PROVIDER_ERROR',
  ProviderTimeout: 'AI_CLASSIFIER_PROVIDER_TIMEOUT',
  InvalidModelResponse: 'AI_CLASSIFIER_INVALID_MODEL_RESPONSE',
  CatalogUnavailable: 'AI_CLASSIFIER_CATALOG_UNAVAILABLE',
} as const;

export type AiClassifierErrorCodeValue =
  (typeof AiClassifierErrorCode)[keyof typeof AiClassifierErrorCode];

export class AiClassifierException extends HttpException {
  public readonly code: AiClassifierErrorCodeValue;

  constructor(statusCode: number, code: AiClassifierErrorCodeValue, message: string) {
    super(statusCode, message);
    this.code = code;
    Object.setPrototypeOf(this, AiClassifierException.prototype);
  }
}

export class AiCatalogUnavailableError extends AiClassifierException {
  constructor(message = 'Service catalog is not available') {
    super(503, AiClassifierErrorCode.CatalogUnavailable, message);
    Object.setPrototypeOf(this, AiCatalogUnavailableError.prototype);
  }
}

export class AiProviderTimeoutError extends AiClassifierException {
  constructor(message = 'Upstream AI provider timed out') {
    super(504, AiClassifierErrorCode.ProviderTimeout, message);
    Object.setPrototypeOf(this, AiProviderTimeoutError.prototype);
  }
}

export class AiProviderError extends AiClassifierException {
  constructor(message = 'Upstream AI provider returned an error') {
    super(502, AiClassifierErrorCode.ProviderError, message);
    Object.setPrototypeOf(this, AiProviderError.prototype);
  }
}

export class AiInvalidModelResponseError extends AiClassifierException {
  constructor(message = 'AI provider returned an invalid response') {
    super(502, AiClassifierErrorCode.InvalidModelResponse, message);
    Object.setPrototypeOf(this, AiInvalidModelResponseError.prototype);
  }
}
