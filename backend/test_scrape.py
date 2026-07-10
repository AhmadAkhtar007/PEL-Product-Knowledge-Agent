import urllib.request
import re
import sys

def search_image(query):
    url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        # Since duckduckgo HTML search often doesn't show direct high-res images easily,
        # let's try a different approach or just see if there's any img tag.
        imgs = re.findall(r'<img[^>]+src="([^">]+)"', html)
        for img in imgs:
            if img.startswith('//'):
                img = 'https:' + img
            if 'http' in img and 'duckduckgo' not in img:
                return img
        return None
    except Exception as e:
        return str(e)

print(search_image("PEL refrigerator PR-1950"))
