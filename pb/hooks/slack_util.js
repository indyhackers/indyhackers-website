/// <reference path="../pb_data/types.d.ts" />

// Shared constants + helpers for slack.pb.js.
//
// PocketBase runs each hook handler (routerAdd / onRecord* callbacks) in an
// isolated JSVM runtime that CANNOT see the hook file's module scope. Anything
// a handler needs must therefore be pulled in via require() from inside the
// handler body (same pattern as calendar_sync.js). Keeping these here — instead
// of at the top of slack.pb.js — is what makes them reachable at runtime.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// A small starter list of throwaway/temp-mail domains. Extend as needed.
const DISPOSABLE_DOMAINS = [
    "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
    "temp-mail.org", "throwawaymail.com", "yopmail.com", "getnada.com",
    "trashmail.com", "sharklasers.com", "guerrillamailblock.com", "maildrop.cc",
    "dispostable.com", "fakeinbox.com", "mailnesia.com", "mohmal.com",
    "spam4.me", "tempr.email", "discard.email", "mailcatch.com",
]

const emailDomain = (email) => String(email).toLowerCase().split("@")[1] || ""
const isDisposable = (email) => DISPOSABLE_DOMAINS.includes(emailDomain(email))

// Cloudflare's cf-ipcontinent is a 2-letter code; spell it out for humans.
const CONTINENTS = {
    AF: "Africa", AN: "Antarctica", AS: "Asia", EU: "Europe",
    NA: "North America", OC: "Oceania", SA: "South America",
}
const continentName = (code) => CONTINENTS[String(code || "").toUpperCase()] || String(code || "")

// Profile links are stored as free text, so a user may omit the scheme.
const normalizeUrl = (u) => (/^https?:\/\//i.test(u) ? u : "https://" + u)

// IANA zones that share Indianapolis's clock. Indianapolis has observed Eastern
// Time since 2006, so US/Canada Eastern zones line up with it year-round. An
// allowlist (not offset math — the JSVM has no Intl); the raw zone is shown
// alongside so a reviewer can sanity-check. Note NW-Indiana zones like
// America/Indiana/Knox are Central, so they're deliberately excluded.
const INDY_EASTERN_TZS = [
    "America/Indiana/Indianapolis", "America/Indianapolis", "America/New_York",
    "America/Detroit", "America/Kentucky/Louisville", "America/Kentucky/Monticello",
    "America/Toronto", "America/Montreal",
]

// true/false when a timezone is known, null when it wasn't captured.
const sameTimezoneAsIndy = (tz) => (tz ? INDY_EASTERN_TZS.indexOf(tz) !== -1 : null)

// Human-readable timezone signal: the IANA zone plus how it relates to Indy.
const timezoneLabel = (tz, sameAsIndy) => {
    if (!tz) return ""
    if (sameAsIndy === true) return tz + " — same as Indianapolis"
    if (sameAsIndy === false) return tz + " — different from Indianapolis"
    return tz
}

// Cloudflare's cf-metro-code is the US-only Nielsen DMA (market) code. Full
// DMA→market map (210 markets; Alaska/Hawaii use their standard codes 743–747).
// Sourced from github.com/simzou/nielsen-dma. Unknown codes show the raw number.
const DMA_NAMES = {
    "500": "Portland-Auburn, ME",
    "501": "New York, NY",
    "502": "Binghamton, NY",
    "503": "Macon, GA",
    "504": "Philadelphia, PA",
    "505": "Detroit, MI",
    "506": "Boston, MA (Manchester, NH)",
    "507": "Savannah, GA",
    "508": "Pittsburgh, PA",
    "509": "Ft. Wayne, IN",
    "510": "Cleveland-Akron (Canton), OH",
    "511": "Washington, DC (Hagerstown, MD)",
    "512": "Baltimore, MD",
    "513": "Flint-Saginaw-Bay City, MI",
    "514": "Buffalo, NY",
    "515": "Cincinnati, OH",
    "516": "Erie, PA",
    "517": "Charlotte, NC",
    "518": "Greensboro-High Point-Winston Salem, NC",
    "519": "Charleston, SC",
    "520": "Augusta, GA",
    "521": "Providence, RI-New Bedford, MA",
    "522": "Columbus, GA",
    "523": "Burlington, VT-Plattsburgh, NY",
    "524": "Atlanta, GA",
    "525": "Albany, GA",
    "526": "Utica, NY",
    "527": "Indianapolis, IN",
    "528": "Miami-Fort Lauderdale, FL",
    "529": "Louisville, KY",
    "530": "Tallahassee, FL-Thomasville, GA",
    "531": "Tri-Cities, TN-VA",
    "532": "Albany-Schenectady-Troy, NY",
    "533": "Hartford & New Haven, CT",
    "534": "Orlando-Daytona Beach-Melbourne, FL",
    "535": "Columbus, OH",
    "536": "Youngstown, OH",
    "537": "Bangor, ME",
    "538": "Rochester, NY",
    "539": "Tampa-St. Petersburg (Sarasota), FL",
    "540": "Traverse City-Cadillac, MI",
    "541": "Lexington, KY",
    "542": "Dayton, OH",
    "543": "Springfield-Holyoke, MA",
    "544": "Norfolk-Portsmouth-Newport News, VA",
    "545": "Greenville-New Bern-Washington, NC",
    "546": "Columbia, SC",
    "547": "Toledo, OH",
    "548": "West Palm Beach-Ft. Pierce, FL",
    "549": "Watertown, NY",
    "550": "Wilmington, NC",
    "551": "Lansing, MI",
    "552": "Presque Isle, ME",
    "553": "Marquette, MI",
    "554": "Wheeling, WV-Steubenville, OH",
    "555": "Syracuse, NY",
    "556": "Richmond-Petersburg, VA",
    "557": "Knoxville, TN",
    "558": "Lima, OH",
    "559": "Bluefield-Beckley-Oak Hill, WV",
    "560": "Raleigh-Durham (Fayetteville), NC",
    "561": "Jacksonville, FL",
    "563": "Grand Rapids-Kalamazoo-Battle Creek, MI",
    "564": "Charleston-Huntington, WV",
    "565": "Elmira, NY",
    "566": "Harrisburg-Lancaster-Lebanon-York, PA",
    "567": "Greenville-Spartanburg, SC-Asheville, NC-Anderson,SC",
    "569": "Harrisonburg, VA",
    "570": "Myrtle Beach-Florence, SC",
    "571": "Ft. Myers-Naples, FL",
    "573": "Roanoke-Lynchburg, VA",
    "574": "Johnstown-Altoona, PA",
    "575": "Chattanooga, TN",
    "576": "Salisbury, MD",
    "577": "Wilkes Barre-Scranton, PA",
    "581": "Terre Haute, IN",
    "582": "Lafayette, IN",
    "583": "Alpena, MI",
    "584": "Charlottesville, VA",
    "588": "South Bend-Elkhart, IN",
    "592": "Gainesville, FL",
    "596": "Zanesville, OH",
    "597": "Parkersburg, WV",
    "598": "Clarksburg-Weston, WV",
    "600": "Corpus Christi, TX",
    "602": "Chicago, IL",
    "603": "Joplin, MO-Pittsburg, KS",
    "604": "Columbia-Jefferson City, MO",
    "605": "Topeka, KS",
    "606": "Dothan, AL",
    "609": "St. Louis, MO",
    "610": "Rockford, IL",
    "611": "Rochester, MN-Mason City, IA-Austin, MN",
    "612": "Shreveport, LA",
    "613": "Minneapolis-St. Paul, MN",
    "616": "Kansas City, MO",
    "617": "Milwaukee, WI",
    "618": "Houston, TX",
    "619": "Springfield, MO",
    "622": "New Orleans, LA",
    "623": "Dallas-Ft. Worth, TX",
    "624": "Sioux City, IA",
    "625": "Waco-Temple-Bryan, TX",
    "626": "Victoria, TX",
    "627": "Wichita Falls, TX-Lawton, OK",
    "628": "Monroe, LA-El Dorado, AR",
    "630": "Birmingham (Anniston and Tuscaloosa), AL",
    "631": "Ottumwa, IA-Kirksville, MO",
    "632": "Paducah, KY-Cape Girardeau, MO-Harrisburg, IL",
    "633": "Odessa-Midland, TX",
    "634": "Amarillo, TX",
    "635": "Austin, TX",
    "636": "Harlingen-Weslaco-Brownsville-McAllen, TX",
    "637": "Cedar Rapids-Waterloo-Iowa City & Dubuque, IA",
    "638": "St. Joseph, MO",
    "639": "Jackson, TN",
    "640": "Memphis, TN",
    "641": "San Antonio, TX",
    "642": "Lafayette, LA",
    "643": "Lake Charles, LA",
    "644": "Alexandria, LA",
    "647": "Greenwood-Greenville, MS",
    "648": "Champaign & Springfield-Decatur, IL",
    "649": "Evansville, IN",
    "650": "Oklahoma City, OK",
    "651": "Lubbock, TX",
    "652": "Omaha, NE",
    "656": "Panama City, FL",
    "657": "Sherman, TX-Ada, OK",
    "658": "Green Bay-Appleton, WI",
    "659": "Nashville, TN",
    "661": "San Angelo, TX",
    "662": "Abilene-Sweetwater, TX",
    "669": "Madison, WI",
    "670": "Ft. Smith-Fayetteville-Springdale-Rogers, AR",
    "671": "Tulsa, OK",
    "673": "Columbus-Tupelo-West Point, MS",
    "675": "Peoria-Bloomington, IL",
    "676": "Duluth, MN-Superior, WI",
    "678": "Wichita-Hutchinson, KS Plus",
    "679": "Des Moines-Ames, IA",
    "682": "Davenport, IA-Rock Island-Moline, IL",
    "686": "Mobile, AL-Pensacola (Ft. Walton Beach), FL",
    "687": "Minot-Bismarck-Dickinson(Williston), ND",
    "691": "Huntsville-Decatur (Florence), AL",
    "692": "Beaumont-Port Arthur, TX",
    "693": "Little Rock-Pine Bluff, AR",
    "698": "Montgomery-Selma, AL",
    "702": "La Crosse-Eau Claire, WI",
    "705": "Wausau-Rhinelander, WI",
    "709": "Tyler-Longview(Lufkin & Nacogdoches), TX",
    "710": "Hattiesburg-Laurel, MS",
    "711": "Meridian, MS",
    "716": "Baton Rouge, LA",
    "717": "Quincy, IL-Hannibal, MO-Keokuk, IA",
    "718": "Jackson, MS",
    "722": "Lincoln & Hastings-Kearney, NE",
    "724": "Fargo-Valley City, ND",
    "725": "Sioux Falls (Mitchell), SD",
    "734": "Jonesboro, AR",
    "736": "Bowling Green, KY",
    "737": "Mankato, MN",
    "740": "North Platte, NE",
    "743": "Anchorage, AK",
    "744": "Honolulu, HI",
    "745": "Fairbanks, AK",
    "746": "Biloxi-Gulfport, MS",
    "747": "Juneau, AK",
    "749": "Laredo, TX",
    "751": "Denver, CO",
    "752": "Colorado Springs-Pueblo, CO",
    "753": "Phoenix, AZ",
    "754": "Butte-Bozeman, MT",
    "755": "Great Falls, MT",
    "756": "Billings, MT",
    "757": "Boise, ID",
    "758": "Idaho Falls-Pocatello, ID",
    "759": "Cheyenne, WY-Scottsbluff, NE",
    "760": "Twin Falls, ID",
    "762": "Missoula, MT",
    "764": "Rapid City, SD",
    "765": "El Paso, TX",
    "766": "Helena, MT",
    "767": "Casper-Riverton, WY",
    "770": "Salt Lake City, UT",
    "771": "Yuma, AZ-El Centro, CA",
    "773": "Grand Junction-Montrose, CO",
    "789": "Tucson (Sierra Vista), AZ",
    "790": "Albuquerque-Santa Fe, NM",
    "798": "Glendive, MT",
    "800": "Bakersfield, CA",
    "801": "Eugene, OR",
    "802": "Eureka, CA",
    "803": "Los Angeles, CA",
    "804": "Palm Springs, CA",
    "807": "San Francisco-Oakland-San Jose, CA",
    "810": "Yakima-Pasco-Richland-Kennewick, WA",
    "811": "Reno, NV",
    "813": "Medford-Klamath Falls, OR",
    "819": "Seattle-Tacoma, WA",
    "820": "Portland, OR",
    "821": "Bend, OR",
    "825": "San Diego, CA",
    "828": "Monterey-Salinas, CA",
    "839": "Las Vegas, NV",
    "855": "Santa Barbara-Santa Maria-San Luis Obispo, CA",
    "862": "Sacramento-Stockton-Modesto, CA",
    "866": "Fresno-Visalia, CA",
    "868": "Chico-Redding, CA",
    "881": "Spokane, WA",
}
const metroName = (code) => (code && DMA_NAMES[String(code)]) || ""

// Human-readable reCAPTCHA signal from the stored signals object: the numeric
// v3 score vs. threshold when captured, else the stored pass/fail.
const captchaSignalLabel = (signals) => {
    if (!signals || signals.captcha_ok === "not_configured") return "not configured"
    if (typeof signals.captcha_score === "number") {
        const min = typeof signals.captcha_min_score === "number" ? " (min " + signals.captcha_min_score + ")" : ""
        return signals.captcha_score + min + " — " + (signals.captcha_ok ? "pass" : "below threshold")
    }
    return signals.captcha_ok ? "pass" : "fail"
}

// Sends the Slack invite for an approved record and stamps invited_at (or
// records the error). Guarded by invited_at so it never double-sends.
function sendSlackInvite(record) {
    if (record.getString("status") !== "approved" || record.getString("invited_at")) {
        return
    }

    const token = $os.getenv("SLACK_API_TOKEN")
    const org = $os.getenv("SLACK_SUBDOMAIN")
    if (!token || !org) {
        console.error("[slack] SLACK_API_TOKEN / SLACK_SUBDOMAIN not configured")
        record.set("error", "Slack not configured (missing token/subdomain)")
        $app.save(record)
        return
    }

    const email = record.getString("email")
    const res = $http.send({
        url: "https://" + org + ".slack.com/api/users.admin.invite",
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Bearer " + token,
        },
        body: "email=" + encodeURIComponent(email) + "&resend=true",
        timeout: 15,
    })

    let outcome = "unknown"
    if (res.statusCode !== 200) {
        outcome = "http_" + res.statusCode
        console.error("[slack] invite HTTP " + res.statusCode + ": " + res.raw)
    } else {
        const data = res.json || {}
        if (data.ok || data.error === "already_invited" || data.error === "already_in_team") {
            outcome = data.ok ? "sent" : data.error
        } else {
            outcome = data.error || "unknown_error"
            console.error("[slack] invite error for " + email + ": " + outcome)
        }
    }

    if (outcome === "sent" || outcome === "already_invited" || outcome === "already_in_team") {
        record.set("invited_at", new Date().toISOString())
        record.set("error", "")
    } else {
        record.set("error", outcome)
    }
    $app.save(record)
}

// Notifies the board about a pending request (email + optional Slack webhook),
// reusing the same best-effort pattern as new-job notifications.
function notifyBoard(record) {
    // Everything the /admin/slack-invites review card shows, so a reviewer can
    // triage straight from the notification.
    const email = record.getString("email")
    const name = [record.getString("first_name"), record.getString("last_name")]
        .filter(Boolean).join(" ") || "(no name given)"
    const country = record.getString("country") || "unknown"
    const cityRegion = record.getString("city_region")
    const ip = record.getString("ip")
    const connection = record.getString("indiana_connection")
    const linkedin = record.getString("linkedin")
    const github = record.getString("github")
    const cocAgreed = record.getBool("coc_agreed")

    // Stored risk signals used for the auto-approval decision (geo lives here too).
    // A JSON field comes back from record.get() as raw JSON in the JSVM, not a
    // live JS object, so signals.* would read as undefined (the notification
    // showed reCAPTCHA "fail" and blank geo/US-visitor even though the stored
    // record was correct). Parse the string form so the values are usable.
    let signals = {}
    try {
        signals = JSON.parse(record.getString("signals") || "{}")
    } catch (_) {
        signals = {}
    }
    const geo = signals.geo || {}
    const usVisitor = signals.is_us ? "Yes" : "No"
    const disposable = signals.disposable ? "Yes" : "No"
    const captcha = captchaSignalLabel(signals)
    const hasGeo = !!(geo.city || geo.region || geo.continent || (geo.lat && geo.lon))
    const regionText = geo.region && geo.region_code
        ? geo.region + " (" + geo.region_code + ")"
        : (geo.region || geo.region_code || "")
    const approxLocation = hasGeo
        ? [
            [geo.city, regionText].filter(Boolean).join(", "),
            [continentName(geo.continent), country].filter(Boolean).join(" · "),
          ].filter(Boolean).join(" · ")
        : ""
    const postal = geo.postal || ""
    const metroCode = geo.metro_code
        ? (geo.metro_name ? geo.metro_code + " — " + geo.metro_name : geo.metro_code)
        : ""
    const coords = geo.lat && geo.lon ? geo.lat + ", " + geo.lon : ""
    const mapUrl = geo.lat && geo.lon
        ? "https://www.google.com/maps?q=" + encodeURIComponent(geo.lat) + "," + encodeURIComponent(geo.lon)
        : ""
    const timezone = timezoneLabel(geo.timezone, geo.same_tz_as_indy)

    const base = ($os.getenv("SITE_URL") || $app.settings().meta.appURL || "").replace(/\/+$/, "")
    const adminUrl = base ? base + "/admin/slack-invites" : ""

    try {
        const settings = $app.settings()
        const recipient =
            $os.getenv("SLACK_REVIEW_EMAIL") ||
            $os.getenv("JOB_NOTIFY_EMAIL") ||
            settings.meta.senderAddress
        if (recipient) {
            const esc = (v) =>
                String(v == null ? "" : v)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;")
            const row = (label, value) =>
                value ? "<li><strong>" + esc(label) + ":</strong> " + esc(value) + "</li>" : ""
            const linkRow = (label, url) =>
                url
                    ? '<li><strong>' + esc(label) + ':</strong> <a href="' + esc(normalizeUrl(url)) + '">' + esc(url) + "</a></li>"
                    : ""

            let html = "<h2>A new Slack invite request needs review</h2><ul>"
            html += row("Name", name)
            html += row("Email", email)
            html += row("Based in", cityRegion)
            html += row("Approx. location (IP)", approxLocation)
            if (coords) {
                html += "<li><strong>Coordinates:</strong> " + esc(coords) +
                    (mapUrl ? ' (<a href="' + esc(mapUrl) + '">map</a>)' : "") + "</li>"
            }
            html += row("Time zone", timezone)
            html += row("Postal code", postal)
            html += row("Metro code", metroCode)
            html += row("IP", ip)
            html += linkRow("LinkedIn", linkedin)
            html += linkRow("GitHub", github)
            html += row("Code of conduct", cocAgreed ? "agreed" : "not agreed")
            html += row("US visitor (auto-approval)", usVisitor)
            html += row("reCAPTCHA", captcha)
            html += row("Disposable email", disposable)
            html += "</ul>"
            if (connection) {
                html += "<p><strong>Connection to Indiana:</strong><br>" + esc(connection) + "</p>"
            }
            html += adminUrl
                ? '<p>Approve or reject it on the <a href="' + esc(adminUrl) + '">Slack invites admin screen</a>.</p>'
                : "<p>Approve or reject it on the Slack invites admin screen.</p>"

            const message = new MailerMessage({
                from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
                to: [{ address: recipient }],
                subject: "Slack invite request pending: " + email,
                html: html,
            })
            $app.newMailClient().send(message)
            console.log("[slack] pending-request email sent to " + recipient)
        }
    } catch (err) {
        console.error("[slack] pending-request email failed: " + err)
    }

    try {
        const webhook = $os.getenv("SLACK_WEBHOOK_URL")
        if (webhook) {
            const slackEsc = (v) =>
                String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            const line = (label, value) => (value ? "*" + label + ":* " + slackEsc(value) : "")
            const linkLine = (label, url) =>
                url ? "*" + label + ":* <" + normalizeUrl(url) + "|" + slackEsc(url) + ">" : ""

            const lines = [
                ":envelope_with_arrow: *New Slack invite request pending review*",
                line("Name", name),
                line("Email", email),
                line("Based in", cityRegion),
                line("Approx. location (IP)", approxLocation),
                coords ? "*Coordinates:* " + slackEsc(coords) + (mapUrl ? " (<" + mapUrl + "|map>)" : "") : "",
                line("Time zone", timezone),
                line("Postal code", postal),
                line("Metro code", metroCode),
                line("IP", ip),
                line("Connection to Indiana", connection),
                linkLine("LinkedIn", linkedin),
                linkLine("GitHub", github),
                line("Code of conduct", cocAgreed ? "agreed" : "not agreed"),
                line("US visitor (auto-approval)", usVisitor),
                line("reCAPTCHA", captcha),
                line("Disposable email", disposable),
                adminUrl
                    ? "Review it: <" + adminUrl + "|Slack invites admin>"
                    : "Approve or reject it on the Slack invites admin screen.",
            ].filter(Boolean)

            const res = $http.send({
                url: webhook,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: lines.join("\n") }),
                timeout: 15,
            })
            if (res.statusCode < 200 || res.statusCode >= 300) {
                console.error("[slack] webhook returned " + res.statusCode + ": " + res.raw)
            }
        }
    } catch (err) {
        console.error("[slack] pending-request webhook failed: " + err)
    }
}

module.exports = {
    EMAIL_RE,
    DISPOSABLE_DOMAINS,
    emailDomain,
    isDisposable,
    sameTimezoneAsIndy,
    metroName,
    sendSlackInvite,
    notifyBoard,
}
