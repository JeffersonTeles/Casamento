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
    // Expande short URLs (s.shopee.com.br, shp.ee, etc.) seguindo o redirect manualmente
    let fetchUrl = url;
    if (/^https?:\/\/(s\.shopee\.com\.br|shp\.ee)\b/i.test(parsedUrl.hostname)) {
      try {
        const headRes = await fetch(url, {
          method: 'GET',
          redirect: 'manual',
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
        });
        const loc = headRes.headers.get('location');
        if (loc) {
          fetchUrl = new URL(loc, url).toString();
          parsedUrl = new URL(fetchUrl);
        }
      } catch {
        // Continua com a URL original
      }
    }

    const res = await fetch(fetchUrl, {
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

    // Se não achou metadados (SPAs tipo Shopee, ML, Amazon), tenta Microlink como fallback
    if (!title || !image) {
      try {
        const mlRes = await fetch(
          `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(7000) }
        );
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          if (mlData.status === 'success' && mlData.data) {
            const d = mlData.data;
            const finalTitle = title || d.title || '';
            const finalImage = image || d.image?.url || '';
            return response.status(200).json({
              title: finalTitle,
              image: finalImage,
              description: description || d.description || '',
              domain,
              url,
              source: 'microlink',
            });
          }
        }
      } catch {
        // Silencia — devolve o que tiver
      }
    }

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
