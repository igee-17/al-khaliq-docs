---
sidebar_position: 3
---

# Google Sign-In

Mobile-native flow: the mobile app obtains a Google **ID token** on-device via the Google Sign-In SDK, and posts it to the backend. The backend verifies the token against Google's JWKS and creates or links the user.

## POST /auth/google

**Rate limit:** global (60/min).

### Request

```json
{ "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijk…" }
```

- `idToken` — the JWT you got from the Google SDK. Do **not** pre-parse or decode it; send the raw string.

### Response — 200 OK

Same `AuthResponseDto` shape as `/auth/login`.

The user's `primaryProvider` will be `GOOGLE` if this is a new account; `EMAIL` if the email already existed (the Google ID is linked, and the user can continue to log in with either method).

### Edge cases

| Case | Status | Message |
|---|---|---|
| Invalid / expired ID token | `401 Unauthorized` | `"Invalid Google token"` — re-run the Google Sign-In flow. |
| Google email not verified | `401 Unauthorized` | `"Google email is not verified"` — shouldn't happen in practice; Google only issues verified emails via this flow. |
| Email already linked to a different Google account | `409 Conflict` | `"Account conflict for this email"` — the user already signed in via a different Google ID. |
| `idToken` missing or non-string | `400 Bad Request` | Validation error. |

### curl (for testing with a live token)

```bash
curl -X POST http://localhost:3000/api/v1/auth/google \
  -H 'Content-Type: application/json' \
  -d '{"idToken":"<your-real-google-id-token>"}'
```

## iOS integration

Use the [GoogleSignIn SDK](https://developers.google.com/identity/sign-in/ios/start-integrating):

```swift
GIDSignIn.sharedInstance.signIn(withPresenting: viewController) { result, error in
  guard let idToken = result?.user.idToken?.tokenString else { return }
  // POST { idToken } to /auth/google
}
```

Client ID: the **iOS** OAuth 2.0 client ID from your Google Cloud console project.

## Android integration

Use [Credential Manager with the Google ID option](https://developer.android.com/identity/sign-in/credential-manager-siwg):

```kotlin
val credential = credentialManager.getCredential(context, request).credential
val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
// POST { idToken } to /auth/google
```

Client ID: the **Android** OAuth 2.0 client ID (requires the SHA-1 of your signing key in the Google Cloud console).

## What happens on the backend

1. The backend verifies the ID token against `https://www.googleapis.com/oauth2/v3/certs` — signature, issuer, expiry.
2. The `audience` must match one of the configured client IDs (iOS, Android, or optional Web). If your SDK uses a different client ID, the token will be rejected.
3. First-time: creates a new user with `primaryProvider=GOOGLE`. Subsequent: looks up by `googleId`, or links to an existing email-based account.
4. Returns tokens identical to the email/password flow.

## Linking behaviour

- If a user signs up with email, verifies, then later uses Google Sign-In with the same email → the existing account is linked to the Google ID.
- If the email is linked to a **different** Google ID already → 409 Conflict. This is rare and usually indicates account takeover attempts.
- Once linked, the user can sign in via either method; both return the same user.
