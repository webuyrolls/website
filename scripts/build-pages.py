#!/usr/bin/env python3
"""Build the five material pages from index.html.

Each page reuses the homepage's <head>, header, contact section and footer,
and copies its material panel (heading, copy, tags and photo) exactly.
Below that it adds the material's photo gallery from assets/img/gallery/
and its FAQ (with FAQPage structured data) from scripts/faqs.json.

Edit index.html, then run:  python3 scripts/build-pages.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.webuyrolls.com"

PAGES = {
    "Aluminum Foil": ("aluminum-foil", [
        "A roll of virgin aluminum foil on a machine",
        "Pallets of aluminum foil rolls",
        "A pile of surplus aluminum foil rolls",
    ]),
    "Paper": ("paper", [
        "Wrapped rolls of coated paper stacked on pallets",
        "Large rolls of 135 gsm coated paper",
        "Strapped rolls of silicone coated paper",
    ]),
    "Non Woven Fabric": ("nonwoven-fabric", [
        "Wrapped rolls of non-woven medical drape",
        "Stacked rolls of blue non-woven fabric",
        "Large rolls of non-woven fabric strapped together",
    ]),
    "Plastic Film": ("plastic-film", [
        "Strapped rolls of clear PET plastic film",
        "Rolls of holographic and cold stamping foil",
        "Rolls of high grade film on a pallet",
    ]),
    "Pressure Sensitive Adhesive": ("psa-materials", [
        "Boxes of surplus PE tape rolls",
        "A bin of blue PE tape rolls",
        "Wrapped rolls of PET tape",
    ]),
}


# How each material reads mid-sentence, for the FAQ heading
FAQ_NAMES = {
    "aluminum-foil": "aluminum foil",
    "paper": "paper",
    "nonwoven-fabric": "non-woven fabric",
    "plastic-film": "plastic film",
    "psa-materials": "PSA tape and label",
}


def faq_block(slug, faqs):
    """Return (section html, JSON-LD script) for a page's FAQ, from scripts/faqs.json."""
    items = "\n".join(
        """        <details class="faq__item reveal">
          <summary><span class="faq__q">{q}</span><span class="faq__x" aria-hidden="true"></span></summary>
          <p class="faq__a">{a}</p>
        </details>""".format(q=html.escape(f["q"]), a=html.escape(f["a"])) for f in faqs)
    section = """  <section class="faq" aria-labelledby="faq-h">
    <div class="wrap faq__in">
      <header class="faq__head">
        <p class="tag reveal">FAQ</p>
        <h2 class="split" id="faq-h">Selling surplus {name} rolls</h2>
      </header>
      <div class="faq__list">
{items}
      </div>
    </div>
  </section>""".format(name=FAQ_NAMES[slug], items=items)
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": f["q"],
                        "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in faqs],
    }
    script = '<script type="application/ld+json">%s</script>\n' % json.dumps(schema, ensure_ascii=False).replace("</", "<\\/")
    return section, script


def grab(src, pattern):
    m = re.search(pattern, src, re.S)
    if not m:
        raise SystemExit("index.html is missing: " + pattern)
    return m.group(0)


def main():
    src = (ROOT / "index.html").read_text()
    head = grab(src, r"<head>.*?</head>")
    header = grab(src, r'<header class="top".*?</header>')
    contact = grab(src, r'  <section class="contact" id="contact">.*?</section>')
    footer = grab(src, r'<footer class="foot">.*?</footer>')

    # Header and footer links that point at homepage sections must go back to the homepage
    header = header.replace('href="#hero"', 'href="/"')
    header = re.sub(r'href="#(handle|why)"', r'href="/#\1"', header)
    footer = footer.replace('href="#hero"', 'href="#top"')

    faqs = json.loads((ROOT / "scripts" / "faqs.json").read_text())

    panels = re.findall(r'<details class="acc__item[^"]*"[^>]*>.*?</details>', src, re.S)
    found = 0
    for panel in panels:
        title = re.search(r'<span class="acc__t">([^<]+)</span>', panel).group(1)
        if title not in PAGES:
            continue
        slug, alts = PAGES[title]
        photo = re.search(r'<div class="acc__media"[^>]*><img src="([^"]+)"[^>]*width="(\d+)" height="(\d+)"', panel)
        copy = re.search(r'<p class="acc__copy">(.*?)</p>', panel, re.S).group(1)
        chips = re.search(r'<ul class="chips">.*?</ul>', panel, re.S).group(0)
        desc = html.unescape(re.sub(r"<[^>]+>", "", copy))[:155].rsplit(" ", 1)[0] + "…" if len(copy) > 155 else html.unescape(copy)
        name = html.unescape(title)

        page_head = head
        page_head = re.sub(r"<title>.*?</title>", "<title>%s | We Buy Rolls</title>" % title, page_head)
        page_head = re.sub(r'(<meta name="description" content=")[^"]*', r"\g<1>" + html.escape(desc, quote=True), page_head)
        for prop in ("og:title", "twitter:title"):
            page_head = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*' % prop, r"\g<1>%s | We Buy Rolls" % title, page_head)
        for prop in ("og:description", "twitter:description"):
            page_head = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*' % prop, r"\g<1>" + html.escape(desc, quote=True), page_head)
        page_head = re.sub(r'(<meta property="og:url" content=")[^"]*', r"\g<1>%s/%s" % (SITE, slug), page_head)
        page_head = re.sub(r'(<link rel="canonical" href=")[^"]*', r"\g<1>%s/%s" % (SITE, slug), page_head)
        page_head = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', "", page_head, flags=re.S)
        faq, faq_schema = faq_block(slug, faqs[slug])
        page_head = page_head.replace("</head>", faq_schema + "</head>")

        gallery = "\n".join(
            '        <figure class="gallery__item frame reveal"><img src="assets/img/gallery/%s-%d.jpg" alt="%s" width="1200" height="900" loading="lazy"></figure>'
            % (slug, i + 1, alt) for i, alt in enumerate(alts))

        page = """<!DOCTYPE html>
<!-- Generated by scripts/build-pages.py from index.html. Edit index.html and rerun the script; changes made here are overwritten. -->
<html lang="en">
{head}
<body class="page-mat">
<a class="skip" href="#main">Skip to main content</a>

{header}

<main id="main">

  <section class="mat-hero" id="hero">
    <div class="bg bg--mat" aria-hidden="true"><img src="{photo}" alt="" width="{pw}" height="{ph}" fetchpriority="high"></div>
    <div class="wrap mat-hero__in">
      <a class="tag mat-back reveal" href="/#handle">&larr; What we handle</a>
      <h1 class="split">{title}</h1>
      <p class="mat-copy reveal">{copy}</p>
      {chips}
    </div>
  </section>

  <section class="gallery" aria-label="{name} photos">
    <div class="wrap">
      <div class="gallery__grid">
{gallery}
      </div>
    </div>
  </section>

{faq}

{contact}

</main>

{footer}

<script src="assets/js/site.js"></script>
</body>
</html>
""".format(head=page_head, header=header, photo=photo.group(1), pw=photo.group(2), ph=photo.group(3),
           title=title, copy=copy, chips=chips.replace('<ul class="chips">', '<ul class="chips mat-chips reveal">'),
           name=html.escape(name, quote=True), gallery=gallery, faq=faq, contact=contact, footer=footer)
        (ROOT / (slug + ".html")).write_text(page)
        found += 1
        print("wrote", slug + ".html")

    if found != len(PAGES):
        raise SystemExit("expected %d material panels in index.html, found %d" % (len(PAGES), found))

    build_404(head, header, footer)


def build_404(head, header, footer):
    """404.html: same head, header and footer, with links back into the site.
    Vercel serves it for any unknown URL, possibly at a nested path, so asset links are absolute."""
    page_head = re.sub(r"<title>.*?</title>", "<title>Page not found | We Buy Rolls</title>", head)
    page_head = re.sub(r'<meta name="robots" content="[^"]*">\n?', "", page_head)
    page_head = re.sub(r'<link rel="canonical"[^>]*>\n?', "", page_head)
    page_head = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', "", page_head, flags=re.S)
    page_head = page_head.replace("<head>", '<head>\n<meta name="robots" content="noindex">', 1)
    nav = header.replace('href="#contact"', 'href="/#contact"')
    links = "\n".join('          <li><a href="/%s">%s</a></li>' % (slug, title) for title, (slug, _) in PAGES.items())
    page = """<!DOCTYPE html>
<!-- Generated by scripts/build-pages.py from index.html. Edit index.html and rerun the script; changes made here are overwritten. -->
<html lang="en">
{head}
<body class="page-404">
<a class="skip" href="#main">Skip to main content</a>

{header}

<main id="main">
  <section class="nf" id="hero">
    <div class="grid-lines" aria-hidden="true"></div>
    <img class="nf__roll" src="assets/img/roll.png" alt="" width="1005" height="1016" aria-hidden="true">
    <div class="wrap nf__in">
      <p class="tag">Error 404</p>
      <h1>This roll has gone missing.</h1>
      <p class="nf__p">The page you're looking for doesn't exist or has moved. Try one of these instead, or give us a call.</p>
      <div class="nf__cta">
        <a class="btn" href="/">Back to home</a>
        <a class="btn btn--line" href="tel:+12035165235">+1 203-516-5235</a>
      </div>
      <nav class="nf__links" aria-label="Materials we buy">
        <p class="tag">Materials we buy</p>
        <ul>
{links}
        </ul>
      </nav>
    </div>
  </section>
</main>

{footer}

<script src="assets/js/site.js"></script>
</body>
</html>
""".format(head=page_head, header=nav, footer=footer, links=links)
    page = re.sub(r'(src|href|data-src)="assets/', r'\1="/assets/', page)
    (ROOT / "404.html").write_text(page)
    print("wrote 404.html")


if __name__ == "__main__":
    main()
