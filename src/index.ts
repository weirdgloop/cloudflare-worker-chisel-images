/**
 * R2 access worker
 * allows GET access to items in the chisel-images bucket and imgur-backup
 * 405s if not GET
 * 404s if no such file
 * 
 * https://developers.cloudflare.com/workers/
 */

export interface Env {
    // binding to R2. https://developers.cloudflare.com/workers/runtime-apis/r2/
    CHISEL_IMAGES: R2Bucket;
    IMGUR_BACKUP: R2Bucket;
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        if (request.method !== 'GET') {
            return new Response('Method Not Allowed', {
                status: 405,
                headers: {
                    Allow: 'GET'
                }
            })
        }
        const url = new URL(request.url);
        /*
        if the url is 'https://r2.weirdgloop.org/imgs/wowee.png'
        pathname is '/imgs/wowee.png'
        .slice(1) is 'imgs/wowee.png'
        */
       function fbytes(bytes:number):string {
            let suf = 'B', b = bytes;
            if (b >= 1024) {
                b /= 1024;
                suf = 'KiB';
            }
            if (b >= 1024) {
                b /= 1024;
                suf = 'MiB';
            }
            return `${b.toPrecision(4)}${suf}`;
       }
       let obj;
        if (url.pathname.slice(1,6) === 'imgur') {
            let object_key = 'images/'+url.pathname.slice(7);
            if (/^images\/[a-z0-9]+\/$/i.test(object_key)) {
                let entries = [];
                let album, cursor=undefined;
                while (true) {
                    album = await env.IMGUR_BACKUP.list({prefix:object_key, cursor:cursor});
                    if (album === null || album === undefined || album.objects.length === 0) {
                        break;
                    }
                    for (let obj_info of album.objects) {
                        let k = '/imgur/'+obj_info.key.slice(7);
                        entries.push(`<li><a class="img-link" href="${k}">${k}</a> - <span class="img-size">${fbytes(obj_info.size)}</span></li>`);
                    }
                    if (!album.truncated) break;
                    cursor = album.cursor;
                }
                if (entries.length === 0)
                    return new Response('Album Not Found', {status:404});
                let html = `<!DOCTYPE html>
                <body>
                    <ul>${entries.join('\n')}</ul>
                </body>`;
                return new Response(html, {
                    headers: {
                        'content-type': 'text/html;charset=UTF-8'
                    }
                });
            }
            if (env.IMGUR_BACKUP === null) {
                return new Response('Bucket/Object Not Found', {status:404});
            }
            obj = await env.IMGUR_BACKUP.get(object_key);
        }
        else {
            let object_key = url.pathname.slice(1);

            if (env.CHISEL_IMAGES === null) {
                return new Response('Bucket/Object Not Found', {status:404});
            }
            obj = await env.CHISEL_IMAGES.get(object_key);
        }
        if (obj === null || obj === undefined) {
            return new Response('Bucket/Object Not Found', {status:404});
        }
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set('etag', obj.httpEtag);
        return new Response(obj.body, {headers});
    }
};
