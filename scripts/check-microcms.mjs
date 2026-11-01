import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { CmsError, fetchPublishedWorks } from '../src/lib/microcms.mjs';
try {
  if (existsSync('.env')) loadEnvFile('.env');
  console.log(JSON.stringify({
    serviceDomainConfigured: Boolean(process.env.MICROCMS_SERVICE_DOMAIN),
    apiKeyConfigured: Boolean(process.env.MICROCMS_API_KEY),
  }));
  const works = await fetchPublishedWorks(process.env);
  console.log(JSON.stringify({ operation: 'GET', success: true, publicCount: works.length,
    productionBuildReady: works.length > 0 }));
} catch (error) {
  console.error(error instanceof CmsError ? error.message : 'CMS_CHECK_FAILED: 検証処理に失敗しました');
  process.exitCode = 1;
}
