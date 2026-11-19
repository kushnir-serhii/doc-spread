// Catch-all for /api/*: every route lives in services/api. The router strips the `/api` prefix itself.
// Imported by relative path with a `.js` specifier so Vercel's builder compiles and traces the files.
import { handle } from '../../../services/api/src/handler.js'

export function GET(request: Request): Promise<Response> {
  return handle(request)
}

export function POST(request: Request): Promise<Response> {
  return handle(request)
}
