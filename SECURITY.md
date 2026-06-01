# Security Policy 🔐

## Supported Versions

| Version | Supported |
| :--- | :--- |
| main | ✅ Security updates |
| < 1.0 | ⚠️ Best-effort |

## Reporting a Vulnerability

* **Contact:** Please report security vulnerabilities via a GitHub Security
  Advisory (preferred) or by contacting the maintainers through the
  organization.
* **Privacy:** Please do not publicly disclose vulnerabilities until a fix is
  released.
* **Response Target:** We aim to acknowledge reports within 48 hours.

## Security Posture

### AI API Keys

Noosphere-Architect is a client-side application. **OpenRouter API Keys** are
stored in ephemeral session memory and are never sent to any server other than
OpenRouter. For maximum security, we recommend using restricted API keys with
specific model/budget limits.

### Data at Rest

The application uses **IndexedDB** for local persistence. To protect your data,
the application supports encryption at rest:

* Use `VITE_ENCRYPTION_KEY` in your `.env` file to provide a secret key.
* This key is used to obfuscate data before it is written to the browser's
  storage.

### Sensitive Data Handling

* **No Secrets in Code:** We use environment variables for configuration.
* **Input Sanitization:** AI-generated content is sanitized for display,
  especially when rendering Markdown.
* **No PII:** The application does not collect or transmit personally
  identifiable information (PII) beyond what is required by the OpenRouter API.

## Hardening Checklist

* [x] Input validation for AI services
* [x] Response sanitization (Markdown/JSON)
* [x] CSRF/XSS protection (inherent to React/modern browser)
* [x] Secure external links (`rel='noopener noreferrer'`)
* [x] Dependencies scanned for vulnerabilities
