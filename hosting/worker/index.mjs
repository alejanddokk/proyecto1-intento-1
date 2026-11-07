import { handleApi } from '../server/api.mjs';
import { assets } from '../generated/assets.mjs';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src https://www.rockstargames.com; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;
    if (url.pathname.startsWith('/api/')) {
      response = await handleApi(request, env);
    } else if (!['GET', 'HEAD'].includes(request.method)) {
      response = new Response('Método no permitido', { status: 405 });
    } else {
      const path = url.pathname === '/' ? '/index.html' : url.pathname;
      const asset = assets[path];
      if(asset){
        const cached=asset.etag&&request.headers.get('If-None-Match')===asset.etag;
        const headers={'Content-Type':asset.type,'Cache-Control':asset.etag?'public, max-age=0, must-revalidate':'no-cache',...(asset.etag?{ETag:asset.etag}:{})};
        const body=request.method==='HEAD'||cached?null:asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body;
        response=new Response(body,{status:cached?304:200,headers});
      }else response=new Response('Página no encontrada',{status:404});
    }
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    if (url.protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
    return new Response(response.body, { status: response.status, headers });
  },
};
