import prisma from './prisma';

export interface IntegrationConfig {
  openRouterApiKey: string;
  openRouterModel: string;
  hunterApiKey: string;
  hunterAutoEnrich: boolean;
}

const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';

function toBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export async function getIntegrationConfig(): Promise<IntegrationConfig> {
  const envConfig: IntegrationConfig = {
    openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openRouterModel: process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
    hunterApiKey: process.env.HUNTER_API_KEY || '',
    hunterAutoEnrich: toBoolean(process.env.HUNTER_AUTO_ENRICH, false),
  };

  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'openrouter_api_key',
            'openrouter_model',
            'hunter_api_key',
            'hunter_auto_enrich',
          ],
        },
      },
    });
    const map: Record<string, string> = {};
    settings.forEach((setting) => {
      map[setting.key] = setting.value;
    });

    return {
      openRouterApiKey: map.openrouter_api_key || envConfig.openRouterApiKey,
      openRouterModel:
        map.openrouter_model || envConfig.openRouterModel || DEFAULT_OPENROUTER_MODEL,
      hunterApiKey: map.hunter_api_key || envConfig.hunterApiKey,
      hunterAutoEnrich: toBoolean(
        map.hunter_auto_enrich,
        envConfig.hunterAutoEnrich
      ),
    };
  } catch {
    return envConfig;
  }
}
