# Production TDMC weight experiment (7 cases)

This script **does not import oldAlgorithm**. It runs `rankPlacesTDMC` from `src/lib/algorithm/tdmcAlgorithm.ts`, the same ranking function imported by the live AI integration `src/lib/ai/algorithm.ts`.

## Prepare

1. Check `comparison/weight_profiles_7cases.json`: these 7 case profiles are based on the thesis test profiles and use Bangkok, Chiang Mai and Phuket as the common evaluation provinces. Correct any case-specific details against the actual survey data *before* citing results in the thesis.
2. Provide `comparison/ground_truth_pool.csv` with columns `profile_id,province,att_id,relevant_score`, with **2 representing relevant**, as required by current `groundTruth.ts`. Existing binary 0/1 labeling is NOT interchangeable. The experiment stops if a profile/province has no relevant GT.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in local `.env` (never commit secrets). Reads attraction data only, does not write to Supabase.

## Run

```bash
npx tsx src/lib/algorithm/compareProductionWeights7Cases.ts
```

Optional paths: `TDMC_WEIGHT_PROFILES`, `TDMC_GROUND_TRUTH`.
Outputs: `comparison/production_weights_7cases/per_case_province.csv`, `summary.csv`, `summary.json`, `weight_comparison.svg`.

## Interpretation

- Uses 7 production weight configurations already exported from `tdmcAlgorithm.ts` (does not overwrite production defaults).
- Computes Top-30 Precision, Recall, F1 and diversity with the project's existing `evaluateRecommendations` function.
- Case-balanced averages: average province values within each case, then average across seven cases.
- The graph is **descriptive**, not proof of an optimal set of weights. Because Ground Truth is derived from related profile attributes, acknowledge circular evaluation. A truly independent Ground Truth should be used to select final weights.
- No claim that it has run on your Supabase data until you execute the script and inspect its outputs.
- The current production `rankPlacesTDMC` builds a fixed accuracy-sorted pool and includes diversity as a reported metric but not a direct term in `tdmcScore`. The experiment deliberately preserves that behavior.
