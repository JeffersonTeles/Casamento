/**
 * api/link-preview.js
 * Serverless function (Vercel) que busca metadados Open Graph de uma URL.
 * Roda server-side para evitar bloqueio de CORS nos browsers.
 *
 * Uso: GET /api/link-preview?url=https://exemplo.com.br/produto
 */

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'Parâmetro "url" obrigatório.' });
  }

  // Valida se é uma URL válida antes de tentar buscar
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return response.status(400).json({ error: 'Protocolo inválido. Use http ou https.' });
    }
  } catch {
    return response.status(400).json({ error: 'URL inválida.' });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WeddingPlannerBot/1.0; +https://casamento.vercel.app)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    // Limita leitura a 500 KB para evitar abuso
    const reader = res.body.getReader();
    let html = '';
    let bytesRead = 0;
    const MAX_BYTES = 500_000;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.length;
      html += new TextDecoder().decode(value);
      if (bytesRead >= MAX_BYTES) break;
    }

    /**
     * Extrai o valor de uma <meta> tag pelo nome ou propriedade.
     * Tenta as duas ordens possíveis de atributos.
     */
    function getMeta(...keys) {
      for (const key of keys) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [
          new RegExp(
            `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"'<>]+)["']`,
            'i'
          ),
          new RegExp(
            `<meta[^>]+content=["']([^"'<>]+)["'][^>]+(?:property|name)=["']${escaped}["']`,
            'i'
          ),
        ];
        for (const pattern of patterns) {
          const m = html.match(pattern);
          if (m && m[1]) return m[1].trim();
        }
      }
      return '';
    }

    const title =
      getMeta('og:title', 'twitter:title') ||
      (html.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1] || '').trim();

    const image = getMeta('og:image', 'twitter:image:src', 'twitter:image');
    const description = getMeta('og:description', 'twitter:description', 'description');
    const domain = parsedUrl.hostname.replace(/^www\./, '');

    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return response.status(200).json({ title, image, description, domain, url });
  } catch (err) {
    // Retorna 200 com campos vazios para o front-end tratar graciosamente
    return response.status(200).json({
      title: '',
      image: '',
      description: '',
      domain: parsedUrl.hostname.replace(/^www\./, ''),
      url,
      error: err.message,
    });
  }
}
