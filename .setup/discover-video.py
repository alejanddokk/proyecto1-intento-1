import re
import urllib.request

url = 'https://www.rockstargames.com/VI/media/videos'
request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(request, timeout=25) as response:
    html = response.read().decode()
print('MP4:', '\n'.join(sorted(set(re.findall(r'[^\s<>"\x27]*\.mp4[^\s<>"\x27]*', html))))[:8000])
print('Scripts:', '\n'.join(re.findall(r'<script[^>]+src="([^"]+)', html))[:4000])
