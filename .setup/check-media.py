import urllib.request

urls = [
    'https://media-rockstargames-com.akamaized.net/VI/downloads/videos/GTAVI_Trailer_1/GTAVI_Trailer_1.mp4',
    'https://www.rockstargames.com/VI/_next/static/media/Jason_Duval_Video_Clip.10.gc09c9y-j9.mp4',
]
for url in urls:
    try:
        request = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=20) as response:
            print(url, response.status, dict((key, response.headers.get(key)) for key in ['Content-Type', 'Content-Length', 'Accept-Ranges']))
    except Exception as error:
        print(url, str(error))
