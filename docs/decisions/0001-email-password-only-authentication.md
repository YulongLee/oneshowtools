# Email and password are the only public authentication method

Date: 2026-07-30

OneShowTools intentionally uses verified email registration and password
sign-in as its only public authentication method. Google OAuth and other social
providers are not exposed by the web application, production API, or Worker
deployment.

This keeps platform identity, recovery, session management, and operator
support centered on one stable email-owned account. Existing additive provider
identity tables remain in the database for migration compatibility, but no
public route creates or links social identities.

Any future authentication-provider change requires a new product decision,
account-linking policy, security review, integration tests, and an independently
controlled release.
