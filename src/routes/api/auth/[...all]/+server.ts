import { auth } from '$lib/server/auth';

export const GET = async ({ request }) => auth.handler(request);
export const POST = async ({ request }) => auth.handler(request);
export const PATCH = async ({ request }) => auth.handler(request);
export const PUT = async ({ request }) => auth.handler(request);
export const DELETE = async ({ request }) => auth.handler(request);
