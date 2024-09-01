import { LHTRPG } from "../helpers/config.mjs";
import { calculateCheck } from "../utils/actor-methods.mjs";
import { getEquippedItems } from "../utils/item-methods.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class LHTrpgActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /**
   * Make adjustments before Character creation, like an actor type default picture
   */
  async _preCreate(createData, options, user) {
    await super._preCreate(createData, options, user);

    // add actor default picture depending on type
    if (this.img === "icons/svg/mystery-man.svg") {
      const updateData = {};
      updateData[
        "img"
      ] = `systems/lhtrpgbrew/assets/ui/actors_icons/${this.type}.svg`;
      await this.updateSource(updateData);
    }
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /** @override */
  applyActiveEffects() {
    // The Active Effects do not have access to their parent at preparation time so we wait until this stage to determine whether they are suppressed or not.
    this.effects.forEach((e) => e.determineSuppression());
    return super.applyActiveEffects();
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const system = actorData.system;
    const itemlist = actorData.items;
    const flags = actorData.flags.lhtrpg || {};
    let itemNumber = 0;

    if (actorData.type === "character") {
      // Attributes and HP/MP
      this._computeAttributesAndHPMP(actorData);

      // Abilities Scores
      this._computeChecks(actorData);

      // Battle statuses
      this._computeBattleStatuses(actorData);

      // Inventory space
      this._computeInventoryMaxSpace(actorData);

      // item count inventory
      itemlist.forEach((item) => {
        if (item.system.equipped !== undefined) {
          if (item.system.equipped == false) {
            itemNumber += 1;
          }
        }
      });
      system.inventory.space = itemNumber;
    }

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (
      actorData.type !== "character" ||
      actorData.type !== "monster" ||
      actorData.type !== "prop" ||
      actorData.type !== "npc"
    )
      return;

    // Make modifications to data here. For example:
    const data = actorData;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const system = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(system);

    return system;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(system) {
    if (this.type !== "character") return;

    if (system.attributes) {
      for (let [k, v] of Object.entries(system.attributes)) {
        system[k] = foundry.utils.deepClone(v);
      }
    }

    if (system["battle-status"].power) {
      for (let [k, v] of Object.entries(system["battle-status"].power)) {
        system[k] = foundry.utils.deepClone(v);
      }
    }

    system.itemData = {};
    system.skillData = {};

    if (this.items) {
      this.items.forEach(function (key, _id) {
        if (key.type === "skill") {
          system.skillData[key._id] = foundry.utils.deepClone(key.system);
        } else {
          system.itemData[key._id] = foundry.utils.deepClone(key.system);
        }
      });
    }
  }

  /**
   * Autocalc the Abilities/Checks Scores
   * @param actorData
   */
  _computeChecks(actorData) {
    const system = actorData.system;
    const checks = system.checks;
    const phy = system.attributes.base.phy;
    const agi = system.attributes.base.agi;
    const wil = system.attributes.base.wil;
    const int = system.attributes.base.int;

    const str = system.attributes.derived.str;
    const end = system.attributes.derived.end;
    const qik = system.attributes.derived.qik;
    const dex = system.attributes.derived.dex;
    const min = system.attributes.derived.min;
    const pre = system.attributes.derived.pre;
    const dis = system.attributes.derived.dis;
    const wis = system.attributes.derived.wis;

    // PHY Abilities
    calculateCheck(phy, str, checks.athletics);
    calculateCheck(phy, end, checks.endurance);

    // AGI Abilities
    calculateCheck(agi, qik, checks.overcome);
    calculateCheck(agi, dex, checks.operation);

    // WIL Abilities
    calculateCheck(wil, min, checks.perception);
    calculateCheck(wil, pre, checks.negotiation);

    // INT Abilities
    calculateCheck(int, dis, checks.knowledge);
    calculateCheck(int, wis, checks.analysis);

    // Accuracy

    // Get accuracy bonus from weapons
    let accuBonus = 0;
    let magicAccuBonus = 0;
    // Get equipped weapons
    const weapons = getEquippedItems(actorData, "weapon");

    // Only add the accuracy bonus of the weapons if there's 2 or less of them, as that's the equippable limit
    if (weapons.length > 0) {
      if (weapons.length <= 2) {
        for (let [i] of Object.entries(weapons)) {
          accuBonus += weapons[i].system.accuracy ?? 0;
          magicAccuBonus += weapons[i].system.mAccuracy ?? 0;
        }
      }
    }

    checks.accuracy.base = agi.value + dex.value ?? 0;
    checks.accuracy.total =
      checks.accuracy.base + accuBonus + checks.accuracy.mod;

    // Magic Accuracy
    checks.magicAccuracy.base = wil.value + wis.value ?? 0;
    checks.magicAccuracy.total =
      checks.magicAccuracy.base + magicAccuBonus + checks.magicAccuracy.mod;

    // Evasion
    checks.evasion.base = agi.value ?? 0;
    checks.evasion.total = checks.evasion.base + checks.evasion.mod;

    // Resistance
    checks.resistance.base = wil.value ?? 0;
    checks.resistance.total = checks.resistance.base + checks.resistance.mod;
  }

  async _computeAttributesAndHPMP(actorData) {
    const system = actorData.system;
    const rank = system.rank;
    const race = system.infos.race;
    const mainClass = system.class.main.name;

    const fatigue = system["life-status"].fatigue;
    const stress = system["life-status"].stress;

    const baseAttr = system.attributes.base;
    const derivedAttr = system.attributes.derived;

    const classAttr = LHTRPG.classes[mainClass];
    const raceAttr = LHTRPG.races[race];

    // Set base attributes
    baseAttr.phy.value = raceAttr.phy + baseAttr.phy.mod ?? 0;
    baseAttr.agi.value = raceAttr.agi + baseAttr.agi.mod ?? 0;
    baseAttr.wil.value = raceAttr.wil + baseAttr.wil.mod ?? 0;
    baseAttr.int.value = raceAttr.int + baseAttr.int.mod ?? 0;

    // Set derived attributes
    derivedAttr.str.value = classAttr.str + derivedAttr.str.mod ?? 0;
    derivedAttr.end.value = classAttr.end + derivedAttr.end.mod ?? 0;
    derivedAttr.qik.value = classAttr.qik + derivedAttr.qik.mod ?? 0;
    derivedAttr.dex.value = classAttr.dex + derivedAttr.dex.mod ?? 0;
    derivedAttr.min.value = classAttr.min + derivedAttr.min.mod ?? 0;
    derivedAttr.pre.value = classAttr.pre + derivedAttr.pre.mod ?? 0;
    derivedAttr.dis.value = classAttr.dis + derivedAttr.dis.mod ?? 0;
    derivedAttr.wis.value = classAttr.wis + derivedAttr.wis.mod ?? 0;

    // Set max HP/MP/Fate
    system.health.max = Math.max(
      raceAttr.maxHP +
        classAttr.maxHP +
        baseAttr.phy.value +
        (system.health.mod ?? 0) +
        classAttr.hpGrowth * (rank - 1) -
        fatigue ?? 0,
      0
    );

    system.mana.max = Math.max(
      raceAttr.maxMP +
        classAttr.maxMP +
        baseAttr.wil.value +
        (system.mana.mod ?? 0) +
        classAttr.mpGrowth * (rank - 1) -
        stress ?? 0,
      0
    );

    system.fate.max = raceAttr.initFate + system.fate.mod ?? 0;
  }

  _computeBattleStatuses(actorData) {
    const system = actorData.system;
    const bStatus = system["battle-status"];
    const phy = system.attributes.base.phy;
    const agi = system.attributes.base.agi;
    const wil = system.attributes.base.wil;
    const int = system.attributes.base.int;
    const str = system.attributes.derived.str;
    const end = system.attributes.derived.end;
    const qik = system.attributes.derived.qik;
    const dex = system.attributes.derived.dex;
    const min = system.attributes.derived.min;
    const pre = system.attributes.derived.pre;
    const dis = system.attributes.derived.dis;
    const wis = system.attributes.derived.wis;

    // Get equipped items
    const weapons = getEquippedItems(actorData, "weapon");
    const armors = getEquippedItems(actorData, "armor");
    const shields = getEquippedItems(actorData, "shield");
    const accessories = getEquippedItems(actorData, "accessory");

    /**
     * ATTACK, MAGIC, RESTORATION POWER
     */

    // Initialize mainWeapon to the first weapon if it exists
    let mainWeapon = weapons.length > 0 ? weapons[0] : undefined;

    // Get the first main weapon if the array has more than one weapon
    if (weapons.length > 1) {
      for (let [i] of Object.entries(weapons)) {
        if (weapons[i].system.main) {
          mainWeapon = weapons[i];
          break;
        }
      }
    }

    // Set attack, restoration and magic base power
    bStatus.power.attack.base = str.value + (mainWeapon?.system.attack ?? 0);
    bStatus.power.restoration.base =
      pre.value + (mainWeapon?.system.restoration ?? 0);
    bStatus.power.magic.base = dis.value + (mainWeapon?.system.magic ?? 0);

    // Get the magic stat from accessories (Magic stones)
    let accBonus = 0;

    if (accessories.length > 0) {
      for (const accessory of accessories) {
        accBonus += accessory.system.magic ?? 0;
      }
    }

    // Assign values to total
    bStatus.power.attack.total =
      bStatus.power.attack.base + (bStatus.power.attack.mod ?? 0);
    bStatus.power.magic.total =
      bStatus.power.magic.base + (bStatus.power.magic.mod ?? 0) + accBonus;
    bStatus.power.restoration.total =
      bStatus.power.restoration.base + (bStatus.power.restoration.mod ?? 0);

    /**
     * DEFENSES
     */

    let pDefBonus = 0;
    let mDefBonus = 0;

    bStatus.defense.phys.base = end.value ?? 0;
    bStatus.defense.magic.base = min.value ?? 0;

    // Since only one armor can be equipped at a time, only return the first in the array
    if (armors.length > 0) {
      pDefBonus += armors[0].system.pdef ?? 0;
      mDefBonus += armors[0].system.mdef ?? 0;
    }

    // Calculate defense bonuses from shields
    for (const shield of shields) {
      pDefBonus += shield.system.pdef ?? 0;
      mDefBonus += shield.system.mdef ?? 0;
    }

    // Only add the defenses of the accessories if there's 3 or less of them, as that's the equippable limit
    if (accessories.length <= 3) {
      for (const accessory of accessories) {
        pDefBonus += accessory.system.pdef ?? 0;
        mDefBonus += accessory.system.mdef ?? 0;
      }
    }

    // Assign values to total
    bStatus.defense.phys.total =
      bStatus.defense.phys.base + bStatus.defense.phys.mod + pDefBonus ?? 0;
    bStatus.defense.magic.total =
      bStatus.defense.magic.base + bStatus.defense.magic.mod + mDefBonus ?? 0;

    /**
     * SPEED/MOVEMENT
     */

    bStatus.speed.base = 2;
    bStatus.speed.total = bStatus.speed.base + (bStatus.speed.mod ?? 0);

    /**
     * INITIATIVE
     */

    let initBonus = 0;

    bStatus.initiative.base = qik.value + bStatus.initiative.mod ?? 0;

    // Function to calculate initiative bonus from items
    const calculateInitiativeBonus = (items, limit) => {
      let bonus = 0;
      if (items.length > 0 && items.length <= limit) {
        for (const item of items) {
          bonus += item.system.initiative ?? 0;
        }
      }
      return bonus;
    };

    // Calculate initiative bonus from weapons, armors, and accessories
    initBonus += calculateInitiativeBonus(weapons, 2);
    if (armors.length > 0) {
      initBonus += armors[0].system.initiative ?? 0;
    }
    initBonus += calculateInitiativeBonus(accessories, 3);

    let initTotal =
      bStatus.initiative.base + initBonus + bStatus.initiative.mod ?? 0;

    // If the initiative goes under zero, it's equal to zero
    bStatus.initiative.total = Math.max(initTotal, 0);
  }

  _computeInventoryMaxSpace(actorData) {
    const system = actorData.system;
    const inventory = system.inventory;
    const bags = getEquippedItems(actorData, "bag");

    inventory.base = 2;
    let bonusBagSpace = 0;
    if (bags.length > 0) {
      for (let [i] of Object.entries(bags)) {
        bonusBagSpace += bags[i].system.bagSpace ?? 0;
      }
    }

    inventory.maxSpace =
      inventory.base + (inventory.mod ?? 0) + (bonusBagSpace ?? 0);
  }
}
