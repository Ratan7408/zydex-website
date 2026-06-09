/** Normalize Magnus plan names for matching (e.g. "Zydex Premium" → "zydexpremium"). */
export function normalizeMagnusPlanName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/** Default portal plan definitions (linked to Magnus plan IDs at bootstrap). */
export const PLAN_DEFINITIONS = [
  {
    slug: 'zydex',
    magnusName: 'zydex',
    name: 'Zydex',
    description: 'USA CLI 0.19',
    sortOrder: 0,
    benefits: [
      'All local ANI pass',
      'Standard USA CLI route',
      'No FaaS route',
    ],
  },
  {
    slug: 'premium',
    magnusName: 'zydexpremium',
    name: 'Zydex Premium',
    description: 'USA CLI 0.28',
    sortOrder: 1,
    benefits: [
      'Wells Fargo pass',
      'All banks pass',
      'All local ANI pass',
      'BOS USA — everything passes on the route',
    ],
  },
];

export function parsePlanBenefits(benefits) {
  if (!benefits) return [];
  if (Array.isArray(benefits)) return benefits;
  try {
    const parsed = JSON.parse(benefits);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(benefits)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export function formatPlanRow(plan) {
  return {
    id: plan.id,
    magnusPlanId: plan.magnusPlanId,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    benefits: parsePlanBenefits(plan.benefits),
    sortOrder: plan.sortOrder,
  };
}
