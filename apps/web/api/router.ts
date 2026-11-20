// Every /api/* request that has no file of its own is rewritten here (vercel.json); the router reads the original path.
// Imported by relative path with a `.js` specifier so Vercel's builder compiles and traces the files.
import { handle } from '../../../services/api/src/handler.js'

export function GET(request: Request): Promise<Response> {
  return handle(request)
}

export function POST(request: Request): Promise<Response> {
  return handle(request)
}
