# Security Policy

## Responsible Usage

BEACON provides OSINT, situational-awareness, and cybersecurity monitoring tools. Some routes can perform reconnaissance-style lookups or scanner-adjacent work. That means the rules are boring and mandatory.

By using this software, you agree to the following:

1. **Defensive use only.** Use BEACON for education, owned infrastructure, authorized monitoring, and defensive analysis.
2. **Authorized targets only.** Do not scan, probe, or interact with networks/systems you do not own or have explicit permission to test.
3. **No public scanner exposure.** Keep scanner/recon backends behind authentication, VPN, or Tailscale. Public unauthenticated scanner endpoints are how you invite goblins into the walls.
4. **Legal compliance.** You are responsible for complying with applicable local, state, national, and international law.
5. **No malicious use.** Offensive cyber operations, unauthorized harvesting, stalking, or abuse are prohibited.

The maintainers are not responsible for misuse or damage caused by this software.

## Reporting a Vulnerability

If you discover a vulnerability in BEACON itself, do not disclose it publicly first.

Open a private report if GitHub security advisories are enabled, or contact the repository maintainer directly. Include:

- affected component/path
- steps to reproduce
- impact
- suggested fix or mitigation, if known

## Upstream Attribution

BEACON began as a fork/customization of OSIRIS. Original MIT license attribution is preserved in `LICENSE`.
