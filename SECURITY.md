# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please:

1. **Do NOT** open a public issue
2. Email security details to: **info [at] baytides [dot] org**
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: 1 month

### What to Expect

- Acknowledgment of your report
- Regular updates on fix progress
- Credit in release notes (if desired)
- Notification when fix is deployed

## Security Measures

### Infrastructure Security

- ✅ **HTTPS Only**: All traffic encrypted with TLS 1.2+
- ✅ **Managed Identities**: Passwordless authentication to Azure services
- ✅ **Network Isolation**: Firewall rules on Redis and Key Vault
- ✅ **API Gateway**: All API access through API Management with subscription keys
- ✅ **DDoS Protection**: Azure Front Door with built-in protection
- ✅ **Rate Limiting**: 10,000 requests/day per subscription key

### Application Security

- ✅ **Input Validation**: All user inputs sanitized
- ✅ **Output Encoding**: XSS prevention via encoding
- ✅ **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options
- ✅ **CORS**: Strict origin policies
- ✅ **Secrets Management**: All secrets in Azure Key Vault
- ✅ **Least Privilege**: Minimal RBAC permissions

### Data Security

- ✅ **Encryption at Rest**: Cosmos DB and Storage encrypted
- ✅ **Encryption in Transit**: TLS 1.2+ for all connections
- ✅ **No PII Storage**: We don't collect personal information
- ✅ **Data Validation**: Schema validation on all data operations
- ✅ **Backup**: Cosmos DB continuous backup enabled

### Monitoring & Response

- ✅ **Real-time Monitoring**: Application Insights telemetry
- ✅ **Automated Alerts**: Errors and anomalies trigger notifications
- ✅ **Audit Logs**: All access logged and retained
- ✅ **Incident Response**: 24-hour response plan

## Security Checklist for Contributors

When contributing code, ensure:

- [ ] No hardcoded secrets or API keys
- [ ] All external inputs validated
- [ ] All outputs properly encoded
- [ ] Dependencies up to date (no known vulnerabilities)
- [ ] Authentication/authorization implemented correctly
- [ ] Error messages don't leak sensitive information
- [ ] HTTPS used for all external requests
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection (where applicable)

## Responsible Disclosure

We follow responsible disclosure practices:

1. Security researchers given time to report privately
2. We acknowledge and work on fixes before public disclosure
3. Coordinated disclosure once fix is deployed
4. Credit given to researchers (unless anonymous preferred)

## Bug Bounty

Currently, we do not offer a bug bounty program as this is an open-source community project sponsored by a nonprofit organization. However, we deeply appreciate security research and will:

- Publicly acknowledge contributions
- Fast-track fixes for reported issues
- Give prominent credit in release notes

## Security Updates

Security updates are released as soon as fixes are available:

- **Critical**: Immediate deployment
- **High**: Within 48 hours
- **Medium/Low**: Next scheduled release

## Contact

- **General Contact**: info [at] baytides [dot] org
- **Project Maintainer**: [@baytides](https://github.com/baytides)

---

*Last Updated: December 19, 2025*
