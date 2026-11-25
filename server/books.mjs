export async function serveBook(){return new Response('Public textbook downloads have been disabled. Attach your own book locally.',{status:410,headers:{'Cache-Control':'no-store'}})}
