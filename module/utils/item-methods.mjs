/**
 * Get equipped items of a specific type from actor data.
 * @param {Object} actorData - The actor data object.
 * @param {string} itemType - The type of items to filter (e.g., 'weapon', 'armor', 'shield', 'accessory').
 * @returns {Array} - An array of equipped items.
 */
export function getEquippedItems(actorData, itemType) {
  return actorData.itemTypes[itemType].reduce((obj, equip) => {
    if (equip.system.equipped) obj.push(equip);
    return obj;
  }, []);
}
