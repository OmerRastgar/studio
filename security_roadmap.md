# Kong Gateway Security Roadmap

This document outlines the planned security enhancements and features for the Kong Gateway. These features are targeted for future implementation to harden the infrastructure, improve observability, and ensure compliance.

## 1. Authentication & Identity Management
- [ ] **Google/Microsoft OIDC Integration**
    -   *Goal*: Enable users to sign in using their existing Google or Microsoft accounts.
    -   *Implementation*: Use `kong-oidc` plugin. Map external emails to internal roles.
- [ ] **JWT Plugin**
    -   *Goal*: Secure protected routes by verifying JSON Web Tokens (JWT).
    -   *Implementation*: Enable `jwt` plugin on routes requiring authentication.
- [ ] **OAuth 2.0 Support**
    -   *Goal*: Add full OAuth 2.0 provider support for third-party services.
    -   *Implementation*: Use `oauth2` plugin to handle token issuance and validation.
- [ ] **Basic / Key Auth**
    -   *Goal*: Support simple credential-based access for legacy systems or simple service-to-service communication.
    -   *Implementation*: Use `basic-auth` or `key-auth` plugins.

## 2. Access Control & Authorization
- [ ] **Access Control Lists (ACL)**
    -   *Goal*: Restrict access to specific consumer groups or roles.
    -   *Implementation*: Use `acl` plugin in conjunction with authentication plugins to enforce group-based policies.
- [ ] **Open Policy Agent (OPA) Integration**
    -   *Goal*: Enforce fine-grained, policy-based authorization.
    -   *Implementation*: Continue leveraging the OPA plugin to offload complex authorization decisions (e.g., RBAC, Attribute-Based Access Control) to the OPA server.

## 3. Network & Traffic Security
- [ ] **Rate Limiting**
    -   *Goal*: Protect dependencies from being overwhelmed and mitigate DoS attacks.
    -   *Implementation*:
        -   *Global*: 100 req/min (General traffic).
        -   *Auth Routes*: 5 req/min (Brute-force protection).
- [ ] **Bot Detection**
    -   *Goal*: Prevent malicious bots and scrapers from accessing the API.
    -   *Implementation*: Use the `bot-detection` plugin to block requests from known bad User-Agents.
- [ ] **IP Restriction**
    -   *Goal*: Block known malicious IPs or restrict access to trusted networks (e.g., VPNs).
    -   *Implementation*: Use `ip-restriction` plugin to allow/deny specific CIDR blocks.
- [ ] **CORS Handling**
    -   *Goal*: Secure Cross-Origin Resource Sharing to prevent unauthorized browser-based requests.
    -   *Implementation*: Configure `cors` plugin globally or per-route with strict `access-control-allow-origin` settings.
- [ ] **Header Injection / Removal**
    -   *Goal*: Enforce security headers (HSTS, CSP) and hide internal infrastructure details.
    -   *Implementation*:
        -   *Response Transformer*: Add `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`.
        -   *Request Transformer*: Strip `X-Powered-By` or internal routing headers.

## 4. Encryption & Secrets
- [ ] **ACME for SSL (Let's Encrypt)**
    -   *Goal*: Automate SSL certificate provisioning and renewal.
    -   *Implementation*: Use `acme` plugin to interface with Let's Encrypt for automatic HTTPS enforcement.
- [ ] **Mutual TLS (mTLS)**
    -   *Goal*: Require client certificates for high-security routes (Zero Trust).
    -   *Implementation*: Enable mTLS on the Kong listener and specifically sensitive Services.
- [ ] **Secrets Management (Vault)**
    -   *Goal*: Securely manage sensitive credentials (API keys, Certs) without hardcoding them.
    -   *Implementation*: Integrate Kong with HashiCorp Vault using the `vault-auth` or secrets management integration.
