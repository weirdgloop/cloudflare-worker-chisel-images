/**
 * R2 access worker
 * allows GET access to items in the chisel-images bucket
 * 405s if not GET
 * 404s if no such file
 * 
 * https://developers.cloudflare.com/workers/
 */

export interface Env {
    // binding to R2. https://developers.cloudflare.com/workers/runtime-apis/r2/
    CHISEL_IMAGES: R2Bucket;
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
        let object_key = url.pathname.slice(1);

        if (env.CHISEL_IMAGES === null) {
            return new Response('Bucket/Object Not Found', {status:404});
        }
        let obj = await env.CHISEL_IMAGES.get(object_key);
        if (obj === null) {
            return new Response('Bucket/Object Not Found', {status:404});
        }
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set('etag', obj.httpEtag);
        return new Response(obj.body, {headers});
    }
};
