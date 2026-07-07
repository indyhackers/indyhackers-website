/// <reference path="../pb_data/types.d.ts" />

// Shared helpers for jobs.pb.js. PocketBase runs each hook handler in an
// isolated JSVM runtime that can't see the hook file's module scope, so these
// are require()'d from inside each handler (same pattern as slack_util.js).

// ---------------------------------------------------------------------------
// Rich-text sanitizer for the `editor` (HTML) job fields.
//
// DEFENSE IN DEPTH ONLY. The authoritative XSS control is the render-time
// DOMPurify pass in the Vue components (JobListing.vue et al.) — do NOT drop
// that on account of this. But the jobs collection is publicly creatable
// (account-less submission) and the /api/jobs/manage route lets the holder of
// an edit token change the body, so untrusted HTML reaches the database. This
// strips the dangerous constructs before anything is stored or served (e.g. to
// the Atom feed or any future consumer that forgets to sanitize).
//
// Allowlist approach: keep only the small tag set TipTap's StarterKit emits,
// drop every attribute except a scheme-checked href on <a>, and remove
// <script>/<style>/<iframe>/... together with their contents. Unknown tags are
// unwrapped (inner text kept, tag markup dropped).
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = {
    p: 1, br: 1, hr: 1, strong: 1, b: 1, em: 1, i: 1, u: 1, s: 1, strike: 1, del: 1,
    ul: 1, ol: 1, li: 1, blockquote: 1, pre: 1, code: 1,
    h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, a: 1,
}

function attrEscape(v) {
    return String(v)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

// Returns a safe href string, or null to drop the attribute. Decodes numeric
// entities and strips control/whitespace before testing the scheme so tricks
// like "java&#115;cript:" or "java\tscript:" can't smuggle a dangerous scheme.
function safeHref(raw) {
    const url = String(raw == null ? '' : raw).trim()
    const probe = url
        .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
        .replace(/[\s\u0000-\u001f]+/g, '')
        .toLowerCase()
    if (/^(https?:|mailto:)/.test(probe)) return url // absolute http(s)/mailto
    if (/^[/#?]/.test(probe)) return url // root-relative / anchor / query
    // A bare relative path ("careers/123") is fine; anything with an explicit
    // scheme we didn't allowlist (javascript:, data:, vbscript:, …) is dropped.
    if (/^[a-z][a-z0-9+.-]*:/i.test(probe)) return null
    return url
}

function sanitizeRichText(html) {
    let out = String(html == null ? '' : html)

    // 1) Remove dangerous elements together with their contents.
    out = out.replace(
        /<(script|style|iframe|object|embed|svg|math|noscript|template)\b[\s\S]*?<\/\1\s*>/gi,
        ''
    )

    // 2) Strip HTML comments / declarations (could hide markup on re-parse).
    out = out.replace(/<!--[\s\S]*?-->/g, '').replace(/<![\s\S]*?>/g, '')

    // 3) Walk every remaining tag: allowlist the name, scrub the attributes.
    out = out.replace(/<(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (m, slash, name, attrs) => {
        const tag = name.toLowerCase()
        if (!ALLOWED_TAGS[tag]) return '' // unwrap: drop tag markup, keep text
        if (slash) return '</' + tag + '>'
        if (tag === 'a') {
            const hm = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attrs)
            const href = hm ? safeHref(hm[2] || hm[3] || hm[4]) : null
            return href
                ? '<a href="' + attrEscape(href) + '" rel="nofollow ugc noopener noreferrer">'
                : '<a>'
        }
        return '<' + tag + '>' // known formatting tag, all attributes removed
    })

    return out
}

// Sanitize the editor fields on a jobs record in place.
function sanitizeJobHtml(record) {
    for (const field of ['description', 'how_to_apply']) {
        const raw = record.getString(field)
        if (raw) record.set(field, sanitizeRichText(raw))
    }
}

// Whether the current request is from a superuser or a user in the admin role.
// Used to decide who may create a job that skips the moderation queue.
function requestIsPrivileged(e) {
    try {
        if (typeof e.hasSuperuserAuth === 'function' && e.hasSuperuserAuth()) return true
    } catch (_) {
        /* fall through to role check */
    }
    const auth = e.auth
    if (!auth) return false
    try {
        $app.expandRecord(auth, ['roles'], null)
        return (auth.expandedAll('roles') || []).some((r) => r.get('name') === 'admin')
    } catch (_) {
        return false
    }
}

module.exports = {
    sanitizeRichText,
    sanitizeJobHtml,
    requestIsPrivileged,
}
