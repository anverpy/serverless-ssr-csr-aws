#!/usr/bin/env python3
import json
import time
import urllib.request
import re
import os

CONFIG_FILE = '/home/andv/js_proj/.localstack-config.json'

def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {}
    with open(CONFIG_FILE) as f:
        return json.load(f)

config = load_config()
API_ID = config.get('apiId', 'REPLACE_API_ID')
STAGE = config.get('stage', 'dev')
S3_BUCKET = config.get('bucket', 'csr-app')
LS_PORT = config.get('port', '4566')

LS_HOST = f"http://localhost:{LS_PORT}"
SSR_URL = f"{LS_HOST}/restapis/{API_ID}/{STAGE}/_user_request_/ssr"
CSR_URL = f"http://{S3_BUCKET}.s3-website.us-east-1.localhost.localstack.cloud:{LS_PORT}/"
USER_AGENT = "Googlebot/2.1 (+http://www.google.com/bot.html)"

def fetch_html(url):
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=8) as res:
            body = res.read().decode('utf-8')
            status = res.status
    except Exception as e:
        return None, 0, str(e)
    ttfb = int((time.time() - start) * 1000)
    return body, ttfb, None

def analyze(html):
    return {
        "bytes": len(html.encode('utf-8')),
        "h1_count": len(re.findall(r'<h1[\s>]', html, re.I)),
        "h2_count": len(re.findall(r'<h2[\s>]', html, re.I)),
        "has_meta_desc": bool(re.search(r'<meta[^>]+name=["\']description["\']', html, re.I)),
        "has_schema": bool(re.search(r'itemscope|schema\.org', html, re.I)),
        "product_cards": len(re.findall(r'class=["\'][^"\']*product-card[^"\']*["\']', html, re.I)),
        "empty_root": bool(re.search(r'<div id=["\']root["\']\s*><\/div>', html, re.I)),
        "has_title": bool(re.search(r'<title>[^<]+<\/title>', html, re.I))
    }

def print_row(cols, widths):
    print(" │ ".join(str(c).ljust(w) for c, w in zip(cols, widths)))

print("\n\033[1;36m=== SSR vs CSR: SEO Crawler Analysis ===\033[0m\n")

print(f"Fetching SSR: {SSR_URL}")
ssr_html, ssr_ttfb, err1 = fetch_html(SSR_URL)
if err1: print(f"SSR Error: {err1}")

print(f"Fetching CSR: {CSR_URL}")
csr_html, csr_ttfb, err2 = fetch_html(CSR_URL)
if err2: print(f"CSR Error: {err2}")

if err1 or err2:
    print("\n\033[1;31mSetup incomplete. Run bash setup.sh first.\033[0m")
    exit(1)

ssr_st = analyze(ssr_html)
csr_st = analyze(csr_html)

print("\n\033[1m=== Comparativa SSR vs CSR ===\033[0m\n")
widths = [22, 12, 12, 15]
print_row(["Métrica", "SSR", "CSR", "Ventaja"], widths)
print_row(["-"*22, "-"*12, "-"*12, "-"*15], widths)
print_row(["TTFB", f"{ssr_ttfb}ms", f"{csr_ttfb}ms", "SSR" if ssr_ttfb < csr_ttfb else "CSR"], widths)
print_row(["Size (KB)", f"{ssr_st['bytes']/1024:.1f}", f"{csr_st['bytes']/1024:.1f}", "CSR" if csr_st['bytes'] < ssr_st['bytes'] else "SSR"], widths)
print_row(["Products Visible", ssr_st['product_cards'], csr_st['product_cards'], "SSR" if ssr_st['product_cards'] > csr_st['product_cards'] else "-"], widths)
print_row(["H1 Tags", ssr_st['h1_count'], csr_st['h1_count'], "SSR" if ssr_st['h1_count'] > csr_st['h1_count'] else "-"], widths)
print_row(["Schema.org", "Yes" if ssr_st['has_schema'] else "No", "Yes" if csr_st['has_schema'] else "No", "SSR" if ssr_st['has_schema'] else "-"], widths)
print_row(["Meta Desc", "Yes" if ssr_st['has_meta_desc'] else "No", "Yes" if csr_st['has_meta_desc'] else "No", "-"], widths)
print_row(["Empty <div id=root>", "No", "Yes" if csr_st['empty_root'] else "No", "SSR (Full HTML)"], widths)

report = {
    "ssr": {"ttfb": ssr_ttfb, **ssr_st},
    "csr": {"ttfb": csr_ttfb, **csr_st}
}
os.makedirs('/home/andv/js_proj/seo-report', exist_ok=True)
with open('/home/andv/js_proj/seo-report/report.json', 'w') as f:
    json.dump(report, f, indent=2)

print("\n\033[1;32m✔ Report saved to seo-report/report.json\033[0m\n")
