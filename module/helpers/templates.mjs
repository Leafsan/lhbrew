/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    "systems/lhtrpgbrew/templates/actor/parts/actor-stats.html",
    "systems/lhtrpgbrew/templates/actor/parts/actor-effects.html",
    "systems/lhtrpgbrew/templates/actor/parts/actor-inventory.html",
    "systems/lhtrpgbrew/templates/actor/parts/actor-biography.html",
    "systems/lhtrpgbrew/templates/actor/parts/actor-bio-connections.html",
    "systems/lhtrpgbrew/templates/actor/parts/actor-bio-unions.html",
    "systems/lhtrpgbrew/templates/actor/parts/actor-skills-basic.html",
    "systems/lhtrpgbrew/templates/actor/parts/actor-skills-combat.html",
    "systems/lhtrpgbrew/templates/actor/parts/actor-skills-general.html",

    "systems/lhtrpgbrew/templates/actor/parts/inventory/inventory-itemlist-equipped.html",
    "systems/lhtrpgbrew/templates/actor/parts/inventory/inventory-itemlist.html",

    "systems/lhtrpgbrew/templates/actor/parts/monster-skills.html",
    "systems/lhtrpgbrew/templates/actor/parts/monster-effects.html",

    //Items partials
    "systems/lhtrpgbrew/templates/item/parts/item-effects.html",
    "systems/lhtrpgbrew/templates/item/parts/item-header.html",
  ]);
};
