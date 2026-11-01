// Build/server use only. Never import this module from browser scripts.
export class CmsError extends Error {}

export async function fetchPublishedWorks(env, fetcher = fetch) {
  const domain = env.MICROCMS_SERVICE_DOMAIN;
  const key = env.MICROCMS_API_KEY;
  if (!domain || !key) throw new CmsError('CMS_ENV_MISSING: 接続用環境変数が未設定です');
  if (domain !== 'suzu-shika-site-astro') throw new CmsError('CMS_DOMAIN_INVALID: 承認済みサービスと一致しません');
  const works = [];
  let total;
  do {
    const url = new URL(`https://${domain}.microcms.io/api/v1/works`);
    url.search = new URLSearchParams({ limit: '100', offset: String(works.length), orders: 'displayOrder' }).toString();
    let response;
    try {
      response = await fetcher(url, {
        method: 'GET', headers: { 'X-MICROCMS-API-KEY': key },
        redirect: 'error', signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new CmsError('CMS_NETWORK: GET通信が失敗しました');
    }
    // Never log raw response bodies, request headers, or underlying exceptions.
    if (!response.ok) throw new CmsError(`CMS_HTTP_${response.status}: GET取得に失敗しました`);
    let data;
    try { data = await response.json(); } catch { throw new CmsError('CMS_JSON: JSON応答が不正です'); }
    if (!data || !Array.isArray(data.contents) || !Number.isSafeInteger(data.totalCount) || data.totalCount < 0 || data.totalCount > 10000)
      throw new CmsError('CMS_RESPONSE: 応答の形式または件数が不正です');
    if (total !== undefined && total !== data.totalCount) throw new CmsError('CMS_CHANGED: 取得中に件数が変化しました');
    total = data.totalCount;
    if (data.offset !== works.length || data.contents.length > 100 || (works.length < total && data.contents.length === 0))
      throw new CmsError('CMS_INCOMPLETE: 一覧取得に欠落があります');
    works.push(...data.contents);
    if (works.length > total) throw new CmsError('CMS_INCOMPLETE: 一覧件数が一致しません');
  } while (works.length < total);
  const ids = new Set();
  const orders = new Set();
  for (const work of works) {
    if (!work || typeof work.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(work.id) || /^\d+$/.test(work.id) || ids.has(work.id))
      throw new CmsError('CMS_ID: 詳細IDが不正または重複しています');
    if (!Number.isSafeInteger(work.displayOrder) || orders.has(work.displayOrder))
      throw new CmsError('CMS_ORDER: 表示順が不正または重複しています');
    ids.add(work.id); orders.add(work.displayOrder);
  }
  return works.sort((a, b) => a.displayOrder - b.displayOrder);
}

export function requirePublishedWorks(works) {
  if (works.length === 0) throw new CmsError('CMS_EMPTY: 公開事例0件のため本番用生成を停止します');
  return works;
}
