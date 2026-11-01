import { handle } from '../../server/app.js';

// Cloudflare Pages Function: every /api/* request lands here.
export async function onRequest(context) {
  return handle(context.request, context.env);
}
