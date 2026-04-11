## 2025-05-15 - Inconsistent Filename Sanitization for Exports
**Vulnerability:** Potential Path Traversal during file export via user-provided project/agent names.
**Learning:** Different components implemented varying levels of sanitization for filenames. While some used robust regex whitelisting, others only replaced whitespace, leaving characters like `..` or `/` potentially intact.
**Prevention:** Use a standardized sanitization utility or a shared regex `/[^a-z0-9\s-]/gi` for all user-provided strings used in filename generation.
