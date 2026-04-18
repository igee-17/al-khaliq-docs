---
sidebar_position: 4
---

# Sign in with Apple

iOS-native flow: the app uses `ASAuthorizationAppleIDProvider` to get an **identityToken** (a JWT signed by Apple) and posts it to the backend. The backend verifies it against Apple's JWKS.

## POST /auth/apple

**Rate limit:** global (60/min).

### Request

```json
{
  "identityToken": "eyJraWQiOiJZdXlYb1kiLCJhbGciOiJSUzI1NiJ9…",
  "name": "Alice Example"
}
```

- `identityToken` — the JWT from `ASAuthorizationAppleIDCredential.identityToken` (decoded from `Data` to a UTF-8 `String`).
- `name` — **only send this on the very first authorisation for the Apple ID.** Apple returns the user's name only once in their lifetime per app. Subsequent sign-ins: omit it or pass `null`.

### Response — 200 OK

Same `AuthResponseDto` shape as `/auth/login`. `primaryProvider` is `APPLE` for new accounts.

### Edge cases

| Case | Status | Message |
|---|---|---|
| Invalid / expired identityToken | `401 Unauthorized` | `"Invalid Apple identity token"` — re-run the SIWA flow. |
| `identityToken` missing or non-string | `400 Bad Request` | Validation error. |
| Email collision with a different Apple ID | `409 Conflict` | `"Account conflict for this email"`. |
| User chose "Hide my email" | `200 OK` | Apple sends a private relay address like `random@privaterelay.appleid.com`. The backend stores that; emails to the address are forwarded to the real inbox. |

### Private relay addresses

Users who pick "Hide my email" get a private relay. Your UI should never say "Check your `@privaterelay.appleid.com` inbox" — just "check your email". The backend still uses it as a stable identifier.

### Missing email (rare)

If Apple doesn't return an email at all (extremely rare — typically a broken token), the backend synthesises one from the Apple sub:

```
<appleSub>@privaterelay.appleid.com
```

This keeps the row valid; the user can update their email later via a profile-edit endpoint (not yet built).

## iOS integration

```swift
import AuthenticationServices

let provider = ASAuthorizationAppleIDProvider()
let request = provider.createRequest()
request.requestedScopes = [.fullName, .email]
let controller = ASAuthorizationController(authorizationRequests: [request])
controller.delegate = self
controller.performRequests()

// In the delegate:
func authorizationController(
  controller: ASAuthorizationController,
  didCompleteWithAuthorization authorization: ASAuthorization
) {
  guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
        let tokenData = credential.identityToken,
        let identityToken = String(data: tokenData, encoding: .utf8) else { return }

  // First authorisation only — capture the name here. Subsequent: credential.fullName is nil.
  let name = [credential.fullName?.givenName, credential.fullName?.familyName]
    .compactMap { $0 }.joined(separator: " ")

  // POST { identityToken, name: name.isEmpty ? nil : name } to /auth/apple
}
```

## Android / web?

Sign in with Apple on non-iOS requires the web OAuth redirect flow with a Services ID + private key. **Not supported by this backend yet** — only the iOS-native flow. Post a request to support Android/web SIWA if you need it.

## What happens on the backend

1. Fetches Apple's JWKS from `https://appleid.apple.com/auth/keys`.
2. Verifies the token's signature, issuer (`https://appleid.apple.com`), and audience (must match your configured bundle ID).
3. First-time: creates a user with `primaryProvider=APPLE` and the `name` you passed (if any).
4. Subsequent: looks up by `appleId` and refreshes lastLogin. If `name` is passed again, it's ignored.
5. Returns tokens.
