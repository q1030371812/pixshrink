# DMCA Takedown Complaint — Pixshrink Trademark / Impersonation

> **Purpose.** This template is sent to a hosting / proxy provider
> (most commonly Cloudflare, but the recipient section also works for
> Namecheap, Porkbun, Squarespace, DomainsByProxy, Google Domains, etc.)
> when a typo-squat / homograph domain impersonates Pixshrink.
>
> Fill the placeholders marked `{{LIKE_THIS}}`, save as
> `dmca-<domain>-<date>.txt`, and email it to the address noted in the
> provider's abuse page (Cloudflare: `abuse@cloudflare.com` / `trust-and-safety@cloudflare.com`).
>
> Most providers also accept a web form. Submit the same text there.

---

**Date:** {{DATE_TODAY_YYYY_MM_DD}}

**From:** {{YOUR_FULL_NAME}}
**Title:** Owner, Pixshrink
**Email:** {{YOUR_EMAIL}}
**Phone:** {{YOUR_PHONE_WITH_INTL_PREFIX}}
**Postal address:** {{YOUR_POSTAL_ADDRESS}}
**Trademark holder:** {{YOUR_COMPANY_NAME_EO_REG_NO_IF_APPLICABLE}}

---

## 1. Identification of the copyrighted / trademarked work

- **Registered trademark:**  "Pixshrink" (word mark)
- **First used in commerce:** {{DATE_FIRST_USED_OR_REGISTRATION_NO}}
- **Registration office / number:** {{USPTO_OR_EUTM_REGISTRATION_NUMBER}}
- **Common-law rights asserted since:** {{EARLIEST_KNOWN_PUBLIC_LAUNCH_DATE}}
- **Authoritative brand domain:** https://pixshrink.com

The complainant is the exclusive owner of the "Pixshrink" name and
trademark in connection with online image-compression services. Use of
the mark by any party other than the complainant is unauthorized.

## 2. Identification of the infringing material

The following domain name and the website / assets it serves are
infringing the complainant's trademark and engaging in typo-squatting
and brand impersonation:

- **Infringing domain:** `{{INFRINGING_DOMAIN}}`
- **Resolved IP / fronting provider:** `{{CLOUDFLARE_ANYCAST_IP_OR_ASN_AS14618}}`
- **Infringing URL(s):**
  - `https://{{INFRINGING_DOMAIN}}`
  - `https://{{INFRINGING_DOMAIN}}/login`
  - `https://{{INFRINGING_DOMAIN}}/download/{{...}}`
  - `{{ADDITIONAL_INFRINGING_PATHS}}`
- **TLS issuer / crt.sh ID:** `{{CRT_SH_CERT_ID}}` (issued {{CERT_NOT_BEFORE_DATE}})
- **NS records / registrar (if known):** `{{REGISTRAR_AND_NAMESERVERS}}`
- **Screenshots / evidence archived at:** `{{YOUR_PRIVATE_ZIP_OR_FOLDER_URL}}`

The infringing site reproduces the "Pixshrink" mark, the
[pixshrink.com](https://pixshrink.com) user interface, and/or
advertises itself as Pixshrink or "PixShrink", in order to divert
users and harvest credentials / install malware.

## 3. Exact match / typo-squat / homograph relationship

The infringing domain differs from the complainant's domain
`pixshrink.com` in a manner that is a clear consumer-confusion attack:

- **Character substitution:** `{{LIST_EACH_LETTER_SUBSTITUTION_FOR_EXAMPLE_0_FOR_O_1_FOR_L}}`
- **Insertion:** `{{LIST_INSERTED_CHARACTERS}}`
- **Omission:** `{{LIST_DROPPED_CHARACTERS}}`
- **Order swap / transposition:** `{{LIST_TRANSPOSITIONS}}`
- **Homograph (non-ASCII lookalike):** `{{LIST_UNICODE_PUNYCODE_LABEL_IF_APPLICABLE}}`
- **TLD swap / combo-squat:** `{{TOP_LEVEL_DOMAIN_DIFFERENCE}}`

The result is that an ordinary user misspelling or mis-typing
`pixshrink.com` lands on the infringing site. This is the textbook
definition of a typo-squat under the Anticybersquatting Consumer
Protection Act, 15 U.S.C. § 1125(d), and an unlawful use of a
registered mark under 15 U.S.C. § 1114 / Lanham Act § 32.

## 4. Contact information of the complaining party

See header above. The complainant can be reached by email at
{{YOUR_EMAIL}} or by phone at {{YOUR_PHONE_WITH_INTL_PREFIX}}.

## 5. Good-faith statement (mandatory under 17 U.S.C. § 512(c)(3)(A)(v))

I have a good-faith belief that use of the material in the manner
complained of is not authorized by the copyright / trademark owner,
its agents, or the law.

I further state, under penalty of perjury, that the information in
this notice is accurate and that I am authorized to act on behalf of
the owner of the exclusive right allegedly infringed.

## 6. Signature and authority

Signed in good faith,

```
__________________________________________________
{{YOUR_FULL_NAME}}
Owner / Authorized representative of {{YOUR_COMPANY_NAME}}
Date: {{DATE_TODAY_YYYY_MM_DD}}
```

---

## 7. Submission channels (delete those you do not use)

### A. Cloudflare (most common case)

- Email: `abuse@cloudflare.com`
- CC: `trust-and-safety@cloudflare.com`
- Web form: https://abuse.cloudflare.com/
- Required portal reference: https://www.cloudflare.com/trust-hub/

> Cloudflare is a proxy, not a registrar. They can disable proxying
> ("grey-cloud" the DNS record) and forward the complaint to the
> underlying registrar / host. Include the DNS A/AAAA record and the
> true origin IP if you have it (e.g. via `censys.io`, `shodan.io`,
> `crt.sh`, `securitytrails.com`).

### B. Registrar (Porkbun / Namecheap / GoDaddy / Squarespace, etc.)

> Find the sponsoring registrar at `whois {{INFRINGING_DOMAIN}}` or
> RDAP. Send the same letter to:

- `abuse@porkbun.com`        (Porkbun / Rebel.com)
- `abuse@namecheap.com`      (Namecheap)
- `domainabuse@godaddy.com`  (GoDaddy)
- `abuse@squarespace.com`    (Squarespace Domains)
- ICANN: `domain-dispute@icann.org` (escalation only)

### C. Domain registry (for new gTLDs)

For `.app`, `.dev`, `.xyz`, `.top`, etc., find the registry operator
(e.g. `identity.digital`, `google.com` for `.dev`) and submit to its
abuse address. Registries can place a `clientHold` on the name.

### D. Search engines (supplemental)

- Google Search Console → "Remove URLs that violate copyright"
- Bing Content Removal Tool
- These do not take the site down but they de-rank it.

## 8. Escalation timeline

| Day | Action |
|-----|--------|
| **+0** | Email this template + attach screenshots + crt.sh JSON. |
| **+3** | If no acknowledgement: re-mail, escalate to registrar. |
| **+7** | File UDRP / URS complaint at the relevant registry (`.com` → `forum.arbitratorsafelist.org`). Cost ~ $1,500–$2,000 for 50+-year mark. |
| **+14** | If proxy still refusing: notify ICANN Contractual Compliance (registry accreditation complaint). |
| **+30** | Optional: send cease-and-desist under seal to the operator via a skip-traced WHOIS; consider domain-acquisition offer in lieu of litigation. |

## 9. Evidence checklist (attach to every submission)

- [ ] `whois.txt` for `{{INFRINGING_DOMAIN}}` (text dump from whois.domaintools.com)
- [ ] `crt.sh.txt` showing the offending certificate (URL: `https://crt.sh/?q={{INFRINGING_DOMAIN}}`)
- [ ] Screenshot of the landing page (full URL bar visible)
- [ ] `curl -I https://{{INFRINGING_DOMAIN}}` HTTP headers
- [ ] DNS A/AAAA records (`dig +short A {{INFRINGING_DOMAIN}}`)
- [ ] Diff of the login form vs the real `https://pixshrink.com`
- [ ] Copy of the trademark registration certificate (PDF)

---

> **Notice to the provider.** Failure to act on a verified
> trademark-infringement complaint may constitute a precondition for
> secondary liability for contributory trademark infringement and may
> separately violate your contractual obligations with your upstream
> registrar and registry.
