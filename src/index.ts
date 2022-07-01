/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace;
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace;
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    TEST_BUCKET: R2Bucket;
}

const getBucketNamed = (env:Env, name:string):R2Bucket|null => {
    switch (name) {
        case 'test-bucket':
            return env.TEST_BUCKET;
    }
    return null;
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
        if the url is 'https://r2.weirdgloop.org/test-bucket/imgs/wowee.png'
        pathname is '/test-bucket/imgs/wowee.png'
        split(/, 3) is ['', 'test-bucket', 'imgs/wowee.png']
        */
        let split_url = url.pathname.split('/', 3);
        let bucket_name = split_url[1];
        let object_key = split_url[2];
        let bucket = getBucketNamed(env, bucket_name);

        if (bucket === null) {
            return new Response('Bucket/Object Not Found', {status:404});
        }
        let obj = await bucket.get(object_key);
        if (obj === null) {
            return new Response('Bucket/Object Not Found', {status:404});
        }
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set('etag', obj.httpEtag);
        return new Response(obj.body, {headers});
    }
};
