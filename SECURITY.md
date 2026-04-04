
# Security Policy

The security of AI Agent Architect is a top priority. We appreciate the efforts of security researchers and the community to help us maintain a secure application.

## Supported Versions

We are committed to providing security updates for the latest major version of AI Agent Architect. Please ensure you are using the most recent release to benefit from the latest security patches.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, we encourage you to report it to us privately to protect our users' information. Please do not disclose the vulnerability publicly until it has been addressed.

**How to Report:**

1.  **Email us** directly at `security@example.com` (this is a placeholder; replace with a real contact if available). Please use a clear subject line, such as "Security Vulnerability Report: AI Agent Architect".
2.  **Provide detailed information** about the vulnerability, including:
    -   A clear description of the vulnerability and its potential impact.
    -   Steps to reproduce the vulnerability, including any URLs, parameters, or code snippets.
    -   Information about the environment where you discovered the vulnerability (e.g., browser version, operating system).
3.  **Allow a reasonable amount of time** for us to investigate and address the issue before any public disclosure.

We will make our best effort to respond to your report in a timely manner, acknowledge your contribution, and keep you informed of our progress.

### Scope

This security policy applies to the AI Agent Architect application code and its infrastructure.

### Out of Scope

-   Vulnerabilities in third-party dependencies should be reported to the respective project maintainers.
-   Social engineering, phishing, or physical attacks.
-   Denial of Service (DoS) attacks. Please do not perform any testing that could disrupt our services.

## Security Practices

-   **API Key Management:** The application relies on a client-side API key stored in an environment variable. In a production environment, this key should be handled securely. The client-side approach used in this application is suitable for development and prototyping. For a production-grade application, API calls should be proxied through a backend server to protect the API key.
-   **Dependencies:** We strive to keep our dependencies up-to-date to incorporate the latest security patches.

Thank you for helping keep AI Agent Architect secure.
