/**
 * Carbon Stats Azure Function
 * Provides carbon footprint and energy consumption data for the sustainability dashboard
 *
 * Data sources:
 * - Cloudflare Analytics API (real CDN request data)
 * - GitHub Actions API (real CI/CD usage)
 * - Azure Monitor API (real AI query counts)
 */

// Provider sustainability commitments (static, verified from official sources)
const PROVIDER_STATS = {
  azure: {
    name: 'Microsoft Azure',
    carbonNeutralSince: 2012,
    renewableEnergy: 100,
    renewableEnergySince: 2025,
    carbonNegativeTarget: 2030,
    pueRatio: 1.12,
    energyEfficiencyVsOnPrem: 93,
    carbonEfficiencyVsOnPrem: 98,
    source: 'https://azure.microsoft.com/en-us/global-infrastructure/sustainability/'
  },
  cloudflare: {
    name: 'Cloudflare',
    renewableEnergy: 100,
    carbonReductionSmallBiz: 96,
    carbonReductionEnterprise: 78,
    netZeroSince: 2025,
    source: 'https://www.cloudflare.com/impact/'
  },
  github: {
    name: 'GitHub',
    carbonNeutralSince: 2019,
    renewableEnergy: 100,
    waterPositiveTarget: 2030,
    source: 'https://github.blog/2021-04-22-environmental-sustainability-github/'
  },
  azureOpenAI: {
    name: 'Azure OpenAI',
    model: 'GPT-4o-mini',
    carbonNeutral: true,
    runsOnAzure: true,
    source: 'https://azure.microsoft.com/en-us/products/ai-services/openai-service'
  }
};

// Carbon factors (grams CO2e) - based on industry research
const CARBON_FACTORS = {
  pageViewGrams: 0.2,        // Average static site page view
  aiQueryGrams: 1.5,         // Azure OpenAI API call estimate
  ciMinuteGrams: 0.4,        // GitHub Actions minute (renewable-offset)
  cdnRequestGrams: 0.0001,   // Cloudflare edge request
};

// Configuration
const CONFIG = {
  cloudflare: {
    zoneId: process.env.CLOUDFLARE_ZONE_ID || '623dc74f7c22e80f38af3b02dcfc934d',
    apiToken: process.env.CLOUDFLARE_API_TOKEN
  },
  github: {
    owner: 'baytides',
    repo: 'baynavigator',
    token: process.env.GITHUB_TOKEN
  },
  azure: {
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || '7848d90a-1826-43f6-a54e-090c2d18946f',
    resourceGroup: process.env.AZURE_RESOURCE_GROUP || 'baytides-discounts-rg',
    openAiAccount: process.env.AZURE_OPENAI_ACCOUNT || 'baynavigator-openai'
  }
};

module.exports = async function (context, req) {
  // CORS headers
  context.res = {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    }
  };

  if (req.method === 'OPTIONS') {
    context.res.status = 204;
    return;
  }

  try {
    const stats = await getCarbonStats(context);
    context.res.body = JSON.stringify(stats, null, 2);
  } catch (error) {
    context.log.error('Carbon stats error:', error);
    context.res = {
      status: 500,
      body: JSON.stringify({ error: 'Failed to fetch carbon stats' })
    };
  }
};

/**
 * Fetch Cloudflare analytics for the past 30 days
 */
async function getCloudflareStats(context) {
  if (!CONFIG.cloudflare.apiToken) {
    context.log.warn('Cloudflare API token not configured');
    return null;
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];

    const query = `{
      viewer {
        zones(filter: {zoneTag: "${CONFIG.cloudflare.zoneId}"}) {
          httpRequests1dGroups(limit: 30, filter: {date_gt: "${dateFilter}"}) {
            sum {
              requests
              bytes
              cachedRequests
              cachedBytes
            }
            dimensions {
              date
            }
          }
        }
      }
    }`;

    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.cloudflare.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.errors) {
      context.log.error('Cloudflare API error:', data.errors);
      return null;
    }

    const groups = data.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];

    // Sum up all the daily stats
    const totals = groups.reduce((acc, day) => ({
      requests: acc.requests + (day.sum?.requests || 0),
      bytes: acc.bytes + (day.sum?.bytes || 0),
      cachedRequests: acc.cachedRequests + (day.sum?.cachedRequests || 0),
      cachedBytes: acc.cachedBytes + (day.sum?.cachedBytes || 0)
    }), { requests: 0, bytes: 0, cachedRequests: 0, cachedBytes: 0 });

    return {
      requests: totals.requests,
      bytesTransferred: totals.bytes,
      cachedRequests: totals.cachedRequests,
      cacheHitRate: totals.requests > 0 ? ((totals.cachedRequests / totals.requests) * 100).toFixed(1) : 0,
      daysIncluded: groups.length,
      source: 'cloudflare_api'
    };
  } catch (error) {
    context.log.error('Cloudflare fetch error:', error);
    return null;
  }
}

/**
 * Fetch GitHub Actions workflow run counts
 */
async function getGitHubStats(context) {
  try {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    if (CONFIG.github.token) {
      headers['Authorization'] = `Bearer ${CONFIG.github.token}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/actions/runs?per_page=100`,
      { headers }
    );

    if (!response.ok) {
      context.log.warn('GitHub API error:', response.status);
      return null;
    }

    const data = await response.json();
    const runs = data.workflow_runs || [];

    // Filter to last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRuns = runs.filter(run => new Date(run.created_at) > thirtyDaysAgo);

    // Count by workflow
    const workflowCounts = {};
    recentRuns.forEach(run => {
      workflowCounts[run.name] = (workflowCounts[run.name] || 0) + 1;
    });

    // Estimate minutes based on typical run times
    const estimatedMinutes = recentRuns.length * 2; // ~2 minutes average per run

    return {
      totalRuns: recentRuns.length,
      workflowBreakdown: workflowCounts,
      estimatedMinutes,
      successfulRuns: recentRuns.filter(r => r.conclusion === 'success').length,
      source: 'github_api'
    };
  } catch (error) {
    context.log.error('GitHub fetch error:', error);
    return null;
  }
}

/**
 * Get Azure OpenAI usage via Azure Monitor metrics
 * Note: This requires the function to have managed identity with Monitor Reader role
 */
async function getAzureOpenAIStats(context) {
  try {
    // Try to get Azure access token via managed identity
    const tokenResponse = await fetch(
      'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2019-08-01&resource=https://management.azure.com/',
      {
        headers: { 'Metadata': 'true' }
      }
    );

    if (!tokenResponse.ok) {
      context.log.warn('Could not get Azure managed identity token');
      return null;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get metrics for the last 30 days
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const resourceId = `/subscriptions/${CONFIG.azure.subscriptionId}/resourceGroups/${CONFIG.azure.resourceGroup}/providers/Microsoft.CognitiveServices/accounts/${CONFIG.azure.openAiAccount}`;

    const metricsUrl = `https://management.azure.com${resourceId}/providers/microsoft.insights/metrics?api-version=2023-10-01&metricnames=TotalCalls&timespan=${startTime}/${endTime}&interval=P1D&aggregation=Total`;

    const metricsResponse = await fetch(metricsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!metricsResponse.ok) {
      context.log.warn('Azure metrics API error:', metricsResponse.status);
      return null;
    }

    const metricsData = await metricsResponse.json();
    const timeseries = metricsData.value?.[0]?.timeseries?.[0]?.data || [];

    const totalCalls = timeseries.reduce((sum, point) => sum + (point.total || 0), 0);

    return {
      totalCalls,
      daysIncluded: timeseries.length,
      source: 'azure_monitor'
    };
  } catch (error) {
    context.log.error('Azure metrics fetch error:', error);
    return null;
  }
}

async function getCarbonStats(context) {
  const now = new Date();

  // Fetch real data from all sources in parallel
  const [cloudflareStats, githubStats, azureStats] = await Promise.all([
    getCloudflareStats(context),
    getGitHubStats(context),
    getAzureOpenAIStats(context)
  ]);

  // Use real data where available, fall back to estimates
  const usage = {
    cdnRequests: cloudflareStats?.requests ?? 50000,
    cdnBytesTransferred: cloudflareStats?.bytesTransferred ?? 0,
    aiQueries: azureStats?.totalCalls ?? 500,
    ciRuns: githubStats?.totalRuns ?? 30,
    ciMinutes: githubStats?.estimatedMinutes ?? 120
  };

  // Track data sources
  const dataSources = {
    cloudflare: cloudflareStats ? 'live' : 'estimated',
    github: githubStats ? 'live' : 'estimated',
    azure: azureStats ? 'live' : 'estimated'
  };

  // Calculate emissions (all offset by renewable energy commitments)
  const grossEmissions = {
    cdn: usage.cdnRequests * CARBON_FACTORS.cdnRequestGrams,
    ai: usage.aiQueries * CARBON_FACTORS.aiQueryGrams,
    ci: usage.ciMinutes * CARBON_FACTORS.ciMinuteGrams
  };

  const totalGrossGrams = Object.values(grossEmissions).reduce((a, b) => a + b, 0);

  // All providers use 100% renewable energy, so net emissions are offset
  const renewableOffset = 100;
  const netEmissionsGrams = totalGrossGrams * (1 - renewableOffset / 100);

  return {
    generated: now.toISOString(),
    period: 'last_30_days',
    dataFreshness: dataSources,

    // Summary metrics for dashboard
    summary: {
      totalGrossEmissionsKg: (totalGrossGrams / 1000).toFixed(3),
      renewableEnergyPercent: renewableOffset,
      netEmissionsKg: netEmissionsGrams.toFixed(3),
      greenRating: 'A+',
      carbonNeutral: true,
    },

    // Real usage data
    usage: {
      cdnRequests: usage.cdnRequests,
      cdnBytesTransferred: usage.cdnBytesTransferred,
      cdnCacheHitRate: cloudflareStats?.cacheHitRate ?? null,
      aiQueries: usage.aiQueries,
      ciRuns: usage.ciRuns,
      ciMinutes: usage.ciMinutes,
      ciWorkflows: githubStats?.workflowBreakdown ?? null
    },

    // Emissions by source (before offset)
    emissionsBySource: {
      cdn: {
        grams: grossEmissions.cdn.toFixed(1),
        percent: totalGrossGrams > 0 ? ((grossEmissions.cdn / totalGrossGrams) * 100).toFixed(1) : '0'
      },
      ai: {
        grams: grossEmissions.ai.toFixed(1),
        percent: totalGrossGrams > 0 ? ((grossEmissions.ai / totalGrossGrams) * 100).toFixed(1) : '0'
      },
      ci: {
        grams: grossEmissions.ci.toFixed(1),
        percent: totalGrossGrams > 0 ? ((grossEmissions.ci / totalGrossGrams) * 100).toFixed(1) : '0'
      }
    },

    // Provider information
    providers: PROVIDER_STATS,

    // Carbon factors used
    carbonFactors: CARBON_FACTORS,

    // Comparison data
    comparison: {
      paperFormGrams: 10,
      drivingMileGrams: 400,
      bayNavigatorVisitGrams: CARBON_FACTORS.pageViewGrams,
      equivalentMilesDriven: (totalGrossGrams / 400).toFixed(2),
      equivalentPaperPages: Math.round(totalGrossGrams / 10),
    },

    // Notes
    notes: [
      'All infrastructure providers use 100% renewable energy',
      'Azure has been carbon neutral since 2012',
      'GitHub Actions runners are powered by renewable energy',
      'Cloudflare operates a carbon-neutral network',
      'Azure OpenAI runs on carbon-neutral Azure infrastructure',
      'Usage data is refreshed hourly from live APIs'
    ]
  };
}
