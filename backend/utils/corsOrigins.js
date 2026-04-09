const normalizeOrigin = (origin = '') => origin.trim().replace(/\/$/, '');

const toVercelPreviewPattern = (origin) => {
  try {
    const { protocol, hostname } = new URL(origin);

    if (protocol !== 'https:' || !hostname.endsWith('.vercel.app')) {
      return null;
    }

    const baseSubdomain = hostname.replace(/\.vercel\.app$/, '');
    const escapedBase = baseSubdomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return new RegExp(`^https://${escapedBase}(?:-[^.]+)?\\.vercel\\.app$`);
  } catch {
    return null;
  }
};

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const exactAllowedOrigins = new Set(configuredOrigins);
const vercelPreviewPatterns = configuredOrigins
  .map(toVercelPreviewPattern)
  .filter(Boolean);

const isAllowedOrigin = (origin = '') => {
  const normalizedOrigin = normalizeOrigin(origin);

  if (exactAllowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  return vercelPreviewPatterns.some((pattern) => pattern.test(normalizedOrigin));
};

const getAllowedOriginsForSocket = () => {
  if (configuredOrigins.length === 0) {
    return ['http://localhost:3000', 'http://localhost:3001'];
  }

  return configuredOrigins;
};

export {
  configuredOrigins,
  getAllowedOriginsForSocket,
  isAllowedOrigin,
  normalizeOrigin,
};
