# Mailpit Invitation Delivery Contract

## Scope

This contract defines the local real-stack proof shape for Sprint 23 invitation emails captured by Mailpit. Mailpit is proof infrastructure only; Zitadel remains the credential authority and user-service remains the invitation and active-role authority.

## Delivery Preconditions

- `mailpit` is healthy in the selected compose lane.
- `user-service` receives `SMTP_HOST=mailpit`, `SMTP_PORT=1025`, `SMTP_SECURE=false`, `RESEND_FROM_EMAIL`, and `CAUPPO_PUBLIC_APP_URL` from the selected env file.
- Host-run contract tests may use no-op delivery; compose-backed Sprint 23 proof must capture the email in Mailpit.

## Captured Message Requirements

Each created invitation email must be visible in Mailpit with:

- `To` matching `staff_invitations.email`.
- `From` matching `USER_SERVICE_RESEND_FROM_EMAIL`.
- Subject identifying a Cauppo invitation and the offered role.
- Text and HTML bodies containing the same invitation URL.
- Expiry text matching the invitation `expires_at` value.
- No password-creation, hosted-login-first, `/select-role`, or legacy `/invite/{token}` wording.

## Invitation URL

The only valid invitation link format is:

```text
{USER_SERVICE_CAUPPO_PUBLIC_APP_URL}/invitation/{staff_invitations.token}
```

Examples:

```text
http://app.cauppo.localhost/invitation/abc123
```

Invalid legacy examples:

```text
http://app.cauppo.localhost/invite/abc123
http://app.cauppo.localhost/select-role
```

## Verification Expectations

A real-stack proof must:

- Create an invitation through an authorized owner or manager flow.
- Query Mailpit and find exactly the invitation email addressed to the invitee.
- Extract a link whose path starts with `/invitation/`.
- Use the extracted token to validate and then accept or decline through user-service.
- Preserve the settled continuation contract: accepted invitations return user-service-owned authoritative route resolution, not a hard-coded destination.
