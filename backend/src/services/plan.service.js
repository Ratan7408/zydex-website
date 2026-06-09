import { config } from '../config/index.js';
import { PLAN_DEFINITIONS, normalizeMagnusPlanName } from '../constants/plans.js';
import { magnusService } from './magnus.service.js';
import prisma from '../utils/prisma.js';

function magnusIdForSlug(slug, magnusPlans) {
  const def = PLAN_DEFINITIONS.find((p) => p.slug === slug);
  if (!def) return null;

  if (slug === 'zydex' && config.magnus.defaultPlanId) {
    const byId = magnusPlans.find((p) => Number(p.id) === config.magnus.defaultPlanId);
    if (byId) return byId.id;
  }
  if (slug === 'premium' && config.magnus.premiumPlanId) {
    const byId = magnusPlans.find((p) => Number(p.id) === config.magnus.premiumPlanId);
    if (byId) return byId.id;
  }

  const target = normalizeMagnusPlanName(def.magnusName);
  const match = magnusPlans.find((p) => normalizeMagnusPlanName(p.name) === target);
  return match?.id ?? null;
}

/** Ensure Zydex + Zydex Premium signup plans exist with benefit descriptions. */
export async function ensureDefaultPlans() {
  let magnusPlans = [];
  try {
    magnusPlans = await magnusService.getPlans();
  } catch (err) {
    console.warn('ensureDefaultPlans: Magnus plans unavailable:', err.message);
  }

  for (const def of PLAN_DEFINITIONS) {
    const magnusPlanId = magnusIdForSlug(def.slug, magnusPlans);
    if (!magnusPlanId) {
      console.warn(
        `Signup plan not linked: ${def.name} — Magnus plan "${def.magnusName}" not found`
      );
      continue;
    }

    const benefits = JSON.stringify(def.benefits);
    const magnusId = Number(magnusPlanId);

    // Clear slug from other rows so the unique constraint never blocks the keeper.
    await prisma.signupPlan.updateMany({
      where: { slug: def.slug, NOT: { magnusPlanId: magnusId } },
      data: { slug: null },
    });

    const bySlug = await prisma.signupPlan.findFirst({ where: { slug: def.slug } });
    const byMagnus = await prisma.signupPlan.findFirst({
      where: { magnusPlanId: magnusId },
      orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
    });
    const keeper = bySlug || byMagnus;

    if (keeper) {
      await prisma.signupPlan.update({
        where: { id: keeper.id },
        data: {
          slug: def.slug,
          magnusPlanId: magnusId,
          name: def.name,
          description: def.description,
          benefits,
          sortOrder: def.sortOrder,
          active: true,
        },
      });

      await prisma.signupPlan.updateMany({
        where: { magnusPlanId: magnusId, id: { not: keeper.id } },
        data: { active: false, slug: null },
      });
    } else {
      await prisma.signupPlan.create({
        data: {
          slug: def.slug,
          magnusPlanId: magnusId,
          name: def.name,
          description: def.description,
          benefits,
          sortOrder: def.sortOrder,
          active: true,
        },
      });
      console.log(`Signup plan created: ${def.name} → Magnus "${def.magnusName}" (ID ${magnusPlanId})`);
    }
  }
}
