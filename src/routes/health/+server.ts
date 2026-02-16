/**
 * Health check for Docker / Traefik and for debugging 404.
 * GET /health returns 200 so you can verify the app responds inside the container.
 */
export const GET = () => new Response('OK', { status: 200 });
