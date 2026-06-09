import { Check } from 'lucide-react';

export function PlanSelector({ plans, value, onChange, disabled }) {
  if (!plans.length) return null;

  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        const selected = String(value) === String(plan.magnusPlanId);
        const isPremium =
          plan.slug === 'premium' ||
          /zydexpremium/i.test(String(plan.name).replace(/[\s_-]+/g, ''));

        return (
          <button
            key={plan.id || plan.magnusPlanId}
            type="button"
            disabled={disabled}
            onClick={() => onChange(String(plan.magnusPlanId))}
            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
              selected
                ? 'border-lime-500 bg-lime-50 dark:bg-lime-950/30 shadow-md'
                : 'border-emerald-200 dark:border-zydex-border bg-white dark:bg-emerald-950/20 hover:border-lime-400'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-emerald-950 dark:text-emerald-50">{plan.name}</p>
                  {isPremium && (
                    <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-lime-500 text-zydex-bg">
                      Premium
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">{plan.description}</p>
                )}
                {plan.benefits?.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {plan.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-200"
                      >
                        <Check className="shrink-0 mt-0.5 text-lime-600 dark:text-lime-400" size={16} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div
                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selected ? 'border-lime-500 bg-lime-500' : 'border-emerald-300 dark:border-emerald-600'
                }`}
              >
                {selected && <Check size={12} className="text-zydex-bg" strokeWidth={3} />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
