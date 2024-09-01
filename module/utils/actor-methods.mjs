/**
 * Get equipped items of a specific type from actor data.
 * @param {number} base base attributes
 * @param {number} derived derived attributes
 * @param {Object} check
 * @returns {void} - An array of equipped items.
 */
export function calculateCheck(base, derived, check) {
  check.base = base.value + derived.value ?? 0;
  check.total = check.base + check.rank + check.mod;
}
