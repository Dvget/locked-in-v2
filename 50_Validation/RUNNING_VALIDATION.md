# Running Validation

## Source of truth

Legacy GitHub Issue #19 and the legacy branch remain the authoritative detailed running-validation record until V2 has its own validated implementation.

## Migration rule

Preserve validated behavior first.

Current high-level understanding:
- distance/GPS: strong;
- pace: acceptable;
- elevation: unresolved / needs improvement.

When V2 Running is implemented:
1. compare the same runs/data against legacy;
2. validate distance;
3. validate pace;
4. validate elevation separately;
5. document findings here;
6. do not fix one metric by accidentally regressing another.

## Diagnostic export

Raw/diagnostic tracking export should remain available during this phase.
