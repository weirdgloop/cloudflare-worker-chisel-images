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
        function not_found() {
            return new Response('Bucket/Object not found', { status: 404 });
        }
        function fbytes(bytes: number): string {
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
        async function get_imgur_stuff(key: string) {
            let object_key = 'images/' + key;
            let clean_object_key = object_key;
            if (object_key.includes('.')) {
                clean_object_key = object_key.split('.').slice(0,-1).join('')
            }
            let imgs = await env.IMGUR_BACKUP.list({ prefix: clean_object_key })
            if (imgs === null || imgs === undefined || imgs.objects.length === 0) {
                return [];
            }
            if (imgs.objects.length === 1 && object_key === imgs.objects[0].key) {
                return imgs.objects;
            }
            let filtered_imgs: R2Object[], filtered_img_test: (o: R2Object) => Boolean, object_key_comparison:string|string[];
            object_key_comparison = object_key.split('.');
            filtered_img_test = (o: R2Object) => o.key.split('.').slice(0,-1).join('') === clean_object_key;
            filtered_imgs = imgs.objects.filter(filtered_img_test);
            if (filtered_imgs.length === 1) {
                return filtered_imgs;
            }
            if (object_key.slice(-1) === '/') {
                filtered_img_test = (o: R2Object) => o.key.slice(0,object_key.length) === object_key;
            } else {
                filtered_img_test = (o: R2Object) => o.key.slice(0,object_key.length + 1) === object_key + '/'
            }
            filtered_imgs = imgs.objects.filter(filtered_img_test)
            return filtered_imgs;
        }
        let obj;
        if (url.pathname.slice(1, 6) === 'imgur') {
            if (env.IMGUR_BACKUP === null) {
                return not_found()
            }
            let imgs = await get_imgur_stuff(url.pathname.slice(7))
            if (imgs.length === 0) {
                return not_found()
            } else if (imgs.length === 1) {
                obj = await env.IMGUR_BACKUP.get(imgs[0].key)
            } else {
                let entries = []
                for (let obj_info of imgs) {
                    let k = '/imgur/' + obj_info.key.slice(7);
                    entries.push(`<li><a class="img-link" href="${k}">${k}</a> - <span class="img-size">${fbytes(obj_info.size)}</span></li>`);
                }
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
        }
        else {
            let object_key = url.pathname.slice(1);

            if (env.CHISEL_IMAGES === null) {
                return not_found()
            }
            obj = await env.CHISEL_IMAGES.get(object_key);
        }
        if (obj === null || obj === undefined) {
            return not_found()
        }
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set('etag', obj.httpEtag);
        return new Response(obj.body, { headers });
    }
};
