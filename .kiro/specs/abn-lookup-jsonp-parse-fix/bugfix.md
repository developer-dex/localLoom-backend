# Bugfix Requirements Document

## Introduction

The `POST /api/v1/tradies/abn-lookup` endpoint fails with HTTP 500 when called with a real ABN (e.g. `46002510054`) while a valid `ABN_LOOKUP_GUID` is configured. The underlying `AbnLookupService.lookup` method (in `localloom-backend/src/services/abn-lookup.service.ts`) builds an outbound request to the Australian Business Register (ABR) API at `https://abr.business.gov.au/json/AbnDetails.aspx` with a `callback=` query parameter. ABR responds with a JSONP envelope of the form `callback({...})` whenever a `callback` parameter is present in the request, but the service then calls `JSON.parse(text)` directly on this envelope. `JSON.parse` throws `SyntaxError: Unexpected token 'c', "callback({"... is not valid JSON`, which is caught and rethrown as `ABN lookup failed: ...`, surfacing to the client as a 500 response.

This bug effectively breaks ABN validation in any environment that has a real ABR GUID configured (i.e. all non-dev environments), preventing tradies from completing ABN-based onboarding or verification flows.

The fix is to ensure `AbnLookupService.lookup` issues a request whose response can be parsed as JSON (preferred: drop the `callback=` parameter so ABR returns plain JSON), and to make the response handling robust to non-2xx HTTP responses and to ABR `Message` payloads (e.g. invalid GUID, invalid ABN). Existing behavior for the no-GUID dev path and for already-correct responses must be preserved.

## Bug Analysis

### Current Behavior (Defect)

When `ABN_LOOKUP_GUID` is configured and the ABR API returns its standard JSONP envelope, the service fails to parse the response and the endpoint returns 500 to the caller.

1.1 WHEN `AbnLookupService.lookup` is invoked with a syntactically valid ABN AND `ABN_LOOKUP_GUID` is configured AND ABR returns a JSONP-wrapped body of the form `callback({...})` THEN `JSON.parse(text)` throws `SyntaxError: Unexpected token 'c', "callback({"... is not valid JSON` and the method rejects with `Error: ABN lookup failed: <SyntaxError message>`.

1.2 WHEN the controller `TradieController.abnLookup` (mounted at `POST /api/v1/tradies/abn-lookup`) receives the rejection from clause 1.1 THEN the request fails and the client receives an HTTP 500 response, even when the ABN is valid and active in ABR.

1.3 WHEN ABR responds with a non-2xx HTTP status (e.g. network/auth error returned as JSONP error or HTML) THEN the service does not check `response.ok` and attempts to parse the body as JSON, yielding an opaque `ABN lookup failed: <parse error>` instead of an error reflecting the actual upstream failure.

1.4 WHEN ABR returns a JSON body containing a `Message` field (e.g. invalid GUID, ABN not found, malformed ABN) wrapped in the JSONP envelope THEN parsing fails before the `Message` branch is reached, so the caller never sees the upstream `Message` and instead sees a generic JSON parse error.

### Expected Behavior (Correct)

The service must successfully parse ABR responses for valid ABNs and surface meaningful errors otherwise, without changing the public shape of `AbnLookupResult`.

2.1 WHEN `AbnLookupService.lookup` is invoked with a syntactically valid ABN AND `ABN_LOOKUP_GUID` is configured AND ABR returns a successful response describing the ABN THEN the method SHALL return an `AbnLookupResult` whose fields (`abn`, `abnStatus`, `entityName`, `entityType`, `state`, `postcode`, `isActive`) are populated from the ABR JSON payload, regardless of whether ABR's wire format is plain JSON or a JSONP envelope.

2.2 WHEN the controller `TradieController.abnLookup` receives the resolved value from clause 2.1 THEN the endpoint SHALL respond with HTTP 200 and the standard `ApiResponse.success` envelope containing the lookup result and message `'ABN lookup successful'`.

2.3 WHEN ABR responds with a non-2xx HTTP status THEN the service SHALL throw `Error('ABN lookup failed: <reason>')` where `<reason>` reflects the upstream failure (HTTP status and/or status text), and SHALL NOT attempt to interpret the body as a successful lookup.

2.4 WHEN ABR returns a payload (plain JSON or JSONP-wrapped) whose decoded object contains a non-empty `Message` field THEN the service SHALL throw `Error('ABN lookup failed: <Message>')` so the caller sees the upstream-reported reason (e.g. invalid GUID, ABN not found).

2.5 WHEN ABR returns a payload that cannot be decoded as JSON (after JSONP unwrapping if applicable) THEN the service SHALL throw `Error('ABN lookup failed: <reason>')` with a message that does not leak the literal `callback(` prefix as the cause; the underlying parse error MAY be included as detail.

### Unchanged Behavior (Regression Prevention)

Existing correct behavior of the service and its callers must not regress.

3.1 WHEN `ABN_LOOKUP_GUID` is not configured (empty string) THEN `AbnLookupService.lookup` SHALL CONTINUE TO short-circuit without performing any HTTP request and return the existing dev-mode mock `AbnLookupResult` (`abnStatus: 'Active'`, `entityName: 'Mock Business Pty Ltd'`, `entityType: 'Australian Private Company'`, `state: 'VIC'`, `postcode: '3000'`, `isActive: true`) for the cleaned ABN.

3.2 WHEN `lookup` is called with an ABN containing whitespace THEN the service SHALL CONTINUE TO strip all whitespace via `abn.replace(/\s/g, '')` before using the value in any request or mock response.

3.3 WHEN `lookup` resolves successfully (live or dev mode) THEN it SHALL CONTINUE TO return an object matching the `AbnLookupResult` interface with the same field names and types it currently exposes; no field SHALL be renamed, removed, or change type.

3.4 WHEN the route `POST /api/v1/tradies/abn-lookup` is invoked THEN it SHALL CONTINUE TO require an authenticated user, run the `abnLookupSchema` body validation, and delegate to `TradieService.abnLookup` which calls `AbnLookupService.lookup`; routing, middleware order, and the controller response envelope SHALL remain unchanged.

3.5 WHEN `AbnLookupService.lookup` fails for any reason THEN it SHALL CONTINUE TO log the failure via `logger.error` with a message starting with `ABN lookup failed for <cleanAbn>: ` before rethrowing, preserving existing log-based observability.

## Bug Condition

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X = (abn: string, guid: string, abrResponse: HttpResponse)
  OUTPUT: boolean

  // The bug is triggered when the service takes the live (non-mock) path
  // and ABR returns a body that is not directly parseable by JSON.parse,
  // or returns a non-2xx status that the current code ignores.
  RETURN (guid <> "")
     AND (
           bodyIsJsonpWrapped(X.abrResponse.body)        // e.g. "callback({...})"
        OR (NOT X.abrResponse.ok)                        // non-2xx HTTP status
        OR containsUpstreamMessage(X.abrResponse.body)   // ABR { "Message": "..." } inside JSONP
     )
END FUNCTION
```

### Fix-Checking Property

```pascal
// Property: Fix Checking - JSONP and upstream errors are handled correctly
FOR ALL X WHERE isBugCondition(X) DO
  result ← AbnLookupService.lookup'(X.abn)   // F' = fixed implementation

  IF bodyIsJsonpWrapped(X.abrResponse.body)
     AND X.abrResponse.ok
     AND NOT containsUpstreamMessage(X.abrResponse.body)
  THEN
    ASSERT result matches AbnLookupResult
       AND result.abn        = decoded(X.abrResponse.body).Abn
       AND result.abnStatus  = decoded(X.abrResponse.body).AbnStatus
       AND result.isActive   = (decoded(X.abrResponse.body).AbnStatus = "Active")
       AND no_exception_thrown
  ELSE
    ASSERT lookup' throws Error
       AND error.message starts with "ABN lookup failed: "
       AND error.message does NOT contain "Unexpected token 'c'"
       AND error.message does NOT contain "callback({"
  END IF
END FOR
```

### Preservation Property

```pascal
// Property: Preservation Checking - non-buggy inputs are unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT AbnLookupService.lookup(X.abn)  =  AbnLookupService.lookup'(X.abn)
END FOR

// Specifically:
//   - guid = ""                     → both return the dev-mode mock object
//   - guid <> "" AND abrResponse.ok AND body is plain JSON without "Message"
//                                   → both return the same AbnLookupResult
```

### Counterexample (Reproduction)

```
Input:  abn = "46002510054", guid = "<valid ABR GUID>"
ABR responds: 200 OK, body = 'callback({"Abn":"46002510054","AbnStatus":"Active",...})'

Current (F):  throws Error("ABN lookup failed: Unexpected token 'c', \"callback({\"... is not valid JSON")
              endpoint returns HTTP 500
Fixed   (F'): returns { abn: "46002510054", abnStatus: "Active", isActive: true, ... }
              endpoint returns HTTP 200 with ApiResponse.success envelope
```
