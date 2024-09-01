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

// const { weapons } = actorData.itemTypes.weapon.reduce(
//   (obj, equip) => {
//     if (!equip.system.equipped) return obj;
//     else obj.weapons.push(equip);
//     return obj;
//   },
//   { weapons: [] }
// );

// // Get equipped weapons
// const weapons = getEquippedItems(actorData, "weapon");

// // Get equipped armor
// const armors = getEquippedItems(actorData, "armor");

// // Get equipped shields
// const shields = getEquippedItems(actorData, "shield");

// // Get equipped accessories
// const accessories = getEquippedItems(actorData, "accessory");
