// Called by pg_cron/pg_net every 30 s while the `extract` queue has messages (022 slice 4). A file of its own wins over
// the `/api/:path*` rewrite in vercel.json. Relative import with a `.js` specifier, like api/router.ts.
import { handleExtract } from '../../../../services/api/src/pipeline/extract-handler.js'

export function POST(request: Request): Promise<Response> {
  return handleExtract(request)
}
