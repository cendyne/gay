import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifest from "./manifest";

export interface Env {
  __STATIC_CONTENT: KVNamespace,
  NAMES: string,
}

function fontSize(text: string) : string {
  return '' + Math.min(5 / text.length * 60, 60) +  'px';
}

// https://stackoverflow.com/questions/5251520/how-do-i-escape-some-html-in-javascript
function escapeHtml(s: string) : string {
  let lookup : any = {
      '&': "&amp;",
      '"': "&quot;",
      '\'': "&apos;",
      '<': "&lt;",
      '>': "&gt;"
  };
  return s.replace(/[&"'<>]/g, c => lookup[c] );
}

function html(text: string): string {
  let etext = escapeHtml(text);
  return `<!DOCTYPE html>
<html>
    <head>
        <title>${etext} is gay</title>
        <link href="/main.css" rel="stylesheet" />
    </head>
    <body>
        <div class="bg"></div>
        <div class="says">
            <div class="text"><span id="name" style="font-size: ${fontSize(text)}">${etext}</span></div>
            <div class="text2">is gay</div>
        </div>
    </body>
</html>`;
}

async function asset(request: Request, env: Env, ctx: ExecutionContext) : Promise<Response> {
  // The UX for getAssetFromKV is poor for ES Module workers
  return await getAssetFromKV({request, waitUntil: function(promise) {
    ctx.waitUntil(promise)
  }}, {
    ASSET_NAMESPACE: env.__STATIC_CONTENT,
    ASSET_MANIFEST: manifest,
  });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    let {pathname} = new URL(request.url);

    if (pathname == '/favicon.ico' || pathname == '/apple-touch-icon.png') {
      return new Response('', {
        status: 404
      })
    }

    if (pathname.endsWith('.css') || pathname.endsWith('.png')) {
      try {
        return await asset(request, env, ctx);
      } catch (e : any) {
        console.error('oh no! ', e, e.message);
      }
    }

    let name = pathname.slice(1);
    if (name == '') {
      if (env.NAMES && env.NAMES.length > 0) {
        let names = env.NAMES.split(',')
        name = names[Math.ceil(Math.random() * 8000) % names.length].trim();
        console.log('Randomly choosing name ', name)
      } else {
        name = '____';
      }
    }
    return new Response(html(name), {
      headers: new Headers([
        ["content-type", "text/html"]
      ])
    });
  },
};
