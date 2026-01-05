/**
 * Fetch Carbon Stats Script
 * Runs daily via GitHub Actions to update public/data/carbon-stats.json
 */

const fs = require('fs');
const path = require('path');

// Carbon factors (grams CO2e)
const CARBON_FACTORS = {
  pageViewGrams: 0.2,
  aiQueryGrams: 1.5,
  ciMinuteGrams: 0.4,
  cdnRequestGrams: 0.0001,
};

// Provider stats
const PROVIDER_STATS = {
  azure: {
    name: 'Microsoft Azure',
    carbonNeutralSince: 2012,
    renewableEnergy: 100,
    renewableEnergySince: 2025,
    carbonNegativeTarget: 2030,
  },
  cloudflare: {
    name: 'Cloudflare',
    renewableEnergy: 100,
    netZeroSince: 2025,
  },
  github: {
    name: 'GitHub',
    carbonNeutralSince: 2019,
    renewableEnergy: 100,
  },
  azureOpenAI: {
    name: 'Azure OpenAI',
    model: 'GPT-4o-mini',
    carbonNeutral: true,
  }
};

async function getCloudflareStats() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!token || !zoneId) {
    console.log('Cloudflare credentials not configured');
    return null;
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];

    const query = `{
      viewer {
        zones(filter: {zoneTag: "${zoneId}"}) {
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
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('Cloudflare API error:', data.errors);
      return null;
    }

    const groups = data.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];

    const totals = groups.reduce((acc, day) => ({
      requests: acc.requests + (day.sum?.requests || 0),
      bytes: acc.bytes + (day.sum?.bytes || 0),
      cachedRequests: acc.cachedRequests + (day.sum?.cachedRequests || 0),
    }), { requests: 0, bytes: 0, cachedRequests: 0 });

    return {
      requests: totals.requests,
      bytesTransferred: totals.bytes,
      cachedRequests: totals.cachedRequests,
      cacheHitRate: totals.requests > 0 ? ((totals.cachedRequests / totals.requests) * 100).toFixed(1) : '0',
      daysIncluded: groups.length,
      source: 'cloudflare_api'
    };
  } catch (error) {
    console.error('Cloudflare fetch error:', error.message);
    return null;
  }
}

async function getGitHubStats() {
  try {
    const response = await fetch(
      'https://api.github.com/repos/baytides/baynavigator/actions/runs?per_page=100',
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      console.log('GitHub API error:', response.status);
      return null;
    }

    const data = await response.json();
    const runs = data.workflow_runs || [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRuns = runs.filter(run => new Date(run.created_at) > thirtyDaysAgo);

    const workflowCounts = {};
    recentRuns.forEach(run => {
      workflowCounts[run.name] = (workflowCounts[run.name] || 0) + 1;
    });

    const estimatedMinutes = recentRuns.length * 2;

    return {
      totalRuns: recentRuns.length,
      workflowBreakdown: workflowCounts,
      estimatedMinutes,
      successfulRuns: recentRuns.filter(r => r.conclusion === 'success').length,
      source: 'github_api'
    };
  } catch (error) {
    console.error('GitHub fetch error:', error.message);
    return null;
  }
}

async function main() {
  console.log('Fetching carbon stats...');

  const [cloudflareStats, githubStats] = await Promise.all([
    getCloudflareStats(),
    getGitHubStats()
  ]);

  // Use real data where available, fall back to estimates
  const usage = {
    cdnRequests: cloudflareStats?.requests ?? 50000,
    cdnBytesTransferred: cloudflareStats?.bytesTransferred ?? 0,
    cdnCacheHitRate: cloudflareStats?.cacheHitRate ?? null,
    aiQueries: 500, // Estimated - Azure metrics require managed identity
    ciRuns: githubStats?.totalRuns ?? 30,
    ciMinutes: githubStats?.estimatedMinutes ?? 120,
    ciWorkflows: githubStats?.workflowBreakdown ?? null
  };

  const dataSources = {
    cloudflare: cloudflareStats ? 'live' : 'estimated',
    github: githubStats ? 'live' : 'estimated',
    azure: 'estimated' // Would need managed identity to access from Actions
  };

  // Calculate emissions
  const grossEmissions = {
    cdn: usage.cdnRequests * CARBON_FACTORS.cdnRequestGrams,
    ai: usage.aiQueries * CARBON_FACTORS.aiQueryGrams,
    ci: usage.ciMinutes * CARBON_FACTORS.ciMinuteGrams
  };

  const totalGrossGrams = Object.values(grossEmissions).reduce((a, b) => a + b, 0);
  const renewableOffset = 100;
  const netEmissionsGrams = totalGrossGrams * (1 - renewableOffset / 100);

  const stats = {
    generated: new Date().toISOString(),
    period: 'last_30_days',
    dataFreshness: dataSources,

    summary: {
      totalGrossEmissionsKg: (totalGrossGrams / 1000).toFixed(3),
      renewableEnergyPercent: renewableOffset,
      netEmissionsKg: netEmissionsGrams.toFixed(3),
      greenRating: 'A+',
      carbonNeutral: true,
    },

    usage,

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

    providers: PROVIDER_STATS,
    carbonFactors: CARBON_FACTORS,

    comparison: {
      paperFormGrams: 10,
      drivingMileGrams: 400,
      equivalentMilesDriven: (totalGrossGrams / 400).toFixed(2),
      equivalentPaperPages: Math.round(totalGrossGrams / 10),
    },

    notes: [
      'All infrastructure providers use 100% renewable energy',
      'Azure has been carbon neutral since 2012',
      'GitHub Actions runners are powered by renewable energy',
      'Cloudflare operates a carbon-neutral network',
      'Usage data is updated daily via GitHub Actions'
    ]
  };

  // Ensure output directory exists
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write stats file
  const outputPath = path.join(outputDir, 'carbon-stats.json');
  fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));

  console.log('Carbon stats updated successfully!');
  console.log(`- Cloudflare: ${dataSources.cloudflare} (${usage.cdnRequests} requests)`);
  console.log(`- GitHub: ${dataSources.github} (${usage.ciRuns} runs)`);
  console.log(`- Total gross emissions: ${stats.summary.totalGrossEmissionsKg} kg CO₂e`);
}

main().catch(console.error);
