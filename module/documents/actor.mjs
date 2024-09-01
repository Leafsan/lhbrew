import { loadJSONData } from "../utils/load-json.mjs";

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

    const calculateCheck = (primary, secondary, check) => {
      check.base = primary.value + secondary.value ?? 0;
      check.total = check.base + check.rank + check.mod;
    };

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
    const { weapons } = actorData.itemTypes.weapon.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.weapons.push(equip);
        return obj;
      },
      { weapons: [] }
    );

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
    const raceAttributes = await loadJSONData(
      "systems/lhtrpgbrew/packs/race.json"
    );
    // const raceAttributes = {
    //   human: {
    //     phy: 7,
    //     agi: 7,
    //     wil: 7,
    //     int: 7,
    //     maxHP: 8,
    //     maxMP: 8,
    //     initFate: 1,
    //   },
    //   elf: {
    //     phy: 6,
    //     agi: 9,
    //     wil: 8,
    //     int: 7,
    //     maxHP: 8,
    //     maxMP: 8,
    //     initFate: 1,
    //   },
    //   dwarf: {
    //     phy: 9,
    //     agi: 6,
    //     wil: 8,
    //     int: 7,
    //     maxHP: 8,
    //     maxMP: 8,
    //     initFate: 1,
    //   },
    //   halfAlv: {
    //     phy: 6,
    //     agi: 8,
    //     wil: 7,
    //     int: 9,
    //     maxHP: 8,
    //     maxMP: 8,
    //     initFate: 1,
    //   },
    //   felinoid: {
    //     phy: 8,
    //     agi: 9,
    //     wil: 6,
    //     int: 7,
    //     maxHP: 8,
    //     maxMP: 8,
    //     initFate: 1,
    //   },
    //   wolfFang: {
    //     phy: 10,
    //     agi: 8,
    //     wil: 7,
    //     int: 5,
    //     maxHP: 16,
    //     maxMP: 0,
    //     initFate: 1,
    //   },
    //   foxTail: {
    //     phy: 6,
    //     agi: 7,
    //     wil: 9,
    //     int: 8,
    //     maxHP: 8,
    //     maxMP: 8,
    //     initFate: 1,
    //   },
    //   ritian: {
    //     phy: 5,
    //     agi: 7,
    //     wil: 8,
    //     int: 10,
    //     maxHP: 0,
    //     maxMP: 16,
    //     initFate: 1,
    //   },
    // };

    const classAttributes = {
      guardian: {
        maxHP: 50,
        maxMP: 30,
        str: 2,
        end: 4,
        dex: 1,
        qik: 1,
        min: 3,
        pre: 2,
        dis: 0,
        wis: 1,
        hpGrowth: 7,
        mpGrowth: 1,
      },
      samurai: {
        maxHP: 50,
        maxMP: 30,
        str: 4,
        end: 2,
        dex: 1,
        qik: 3,
        min: 1,
        pre: 0,
        dis: 1,
        wis: 2,
        hpGrowth: 7,
        mpGrowth: 1,
      },
      monk: {
        maxHP: 45,
        maxMP: 35,
        str: 3,
        end: 1,
        dex: 4,
        qik: 2,
        min: 2,
        pre: 1,
        dis: 0,
        wis: 1,
        hpGrowth: 6,
        mpGrowth: 2,
      },
      hwarang: {
        maxHP: 45,
        maxMP: 35,
        str: 4,
        end: 2,
        dex: 1,
        qik: 1,
        min: 1,
        pre: 2,
        dis: 3,
        wis: 0,
        hpGrowth: 6,
        mpGrowth: 2,
      },
      cleric: {
        maxHP: 45,
        maxMP: 35,
        str: 2,
        end: 2,
        dex: 1,
        qik: 0,
        min: 4,
        pre: 3,
        dis: 1,
        wis: 1,
        hpGrowth: 6,
        mpGrowth: 2,
      },
      druid: {
        maxHP: 35,
        maxMP: 45,
        str: 0,
        end: 1,
        dex: 1,
        qik: 1,
        min: 3,
        pre: 2,
        dis: 4,
        wis: 2,
        hpGrowth: 4,
        mpGrowth: 4,
      },
      kannagi: {
        maxHP: 40,
        maxMP: 40,
        str: 2,
        end: 1,
        dex: 3,
        qik: 1,
        min: 0,
        pre: 4,
        dis: 1,
        wis: 2,
        hpGrowth: 5,
        mpGrowth: 3,
      },
      templar: {
        maxHP: 45,
        maxMP: 35,
        str: 2,
        end: 3,
        dex: 1,
        qik: 0,
        min: 4,
        pre: 2,
        dis: 1,
        wis: 1,
        hpGrowth: 6,
        mpGrowth: 2,
      },
      assassin: {
        maxHP: 40,
        maxMP: 40,
        str: 2,
        end: 1,
        dex: 3,
        qik: 4,
        min: 1,
        pre: 2,
        dis: 1,
        wis: 0,
        hpGrowth: 5,
        mpGrowth: 3,
      },
      swashbuckler: {
        maxHP: 45,
        maxMP: 35,
        str: 3,
        end: 2,
        dex: 4,
        qik: 2,
        min: 1,
        pre: 1,
        dis: 0,
        wis: 1,
        hpGrowth: 6,
        mpGrowth: 2,
      },
      bard: {
        maxHP: 35,
        maxMP: 45,
        str: 1,
        end: 0,
        dex: 2,
        qik: 1,
        min: 2,
        pre: 4,
        dis: 3,
        wis: 1,
        hpGrowth: 4,
        mpGrowth: 3,
      },
      sorcerer: {
        maxHP: 30,
        maxMP: 50,
        str: 1,
        end: 0,
        dex: 2,
        qik: 1,
        min: 2,
        pre: 1,
        dis: 4,
        wis: 3,
        hpGrowth: 3,
        mpGrowth: 5,
      },
      summoner: {
        maxHP: 35,
        maxMP: 45,
        str: 0,
        end: 1,
        dex: 1,
        qik: 2,
        min: 4,
        pre: 1,
        dis: 3,
        wis: 2,
        hpGrowth: 4,
        mpGrowth: 4,
      },
      enchanter: {
        maxHP: 30,
        maxMP: 50,
        str: 0,
        end: 1,
        dex: 1,
        qik: 1,
        min: 2,
        pre: 4,
        dis: 3,
        wis: 2,
        hpGrowth: 3,
        mpGrowth: 5,
      },
    };

    const system = actorData.system;
    const rank = system.rank;
    const race = system.infos.race;
    const mainClass = system.class.main.name;

    const fatigue = system["life-status"].fatigue;
    const stress = system["life-status"].stress;

    const baseAttr = system.attributes.base;
    const derivedAttr = system.attributes.derived;

    const classAttr = classAttributes[mainClass];
    const raceAttr = raceAttributes[race];

    console.log(raceAttributes);
    console.log(raceAttr);

    // Set base attributes
    baseAttr.phy.value = raceAttr.phy + (baseAttr.phy.mod ?? 0) ?? 0;
    baseAttr.agi.value = raceAttr.agi + (baseAttr.agi.mod ?? 0) ?? 0;
    baseAttr.wil.value = raceAttr.wil + (baseAttr.wil.mod ?? 0) ?? 0;
    baseAttr.int.value = raceAttr.int + (baseAttr.int.mod ?? 0) ?? 0;

    // Set derived attributes
    derivedAttr.str.value = classAttr.str + (classAttr.str.mod ?? 0) ?? 0;
    derivedAttr.end.value = classAttr.end + (classAttr.end.mod ?? 0) ?? 0;
    derivedAttr.qik.value = classAttr.qik + (classAttr.qik.mod ?? 0) ?? 0;
    derivedAttr.dex.value = classAttr.dex + (classAttr.dex.mod ?? 0) ?? 0;
    derivedAttr.min.value = classAttr.min + (classAttr.min.mod ?? 0) ?? 0;
    derivedAttr.pre.value = classAttr.pre + (classAttr.pre.mod ?? 0) ?? 0;
    derivedAttr.dis.value = classAttr.dis + (classAttr.dis.mod ?? 0) ?? 0;
    derivedAttr.wis.value = classAttr.wis + (classAttr.wis.mod ?? 0) ?? 0;

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

    system.fate.max = raceAttr.initFate;
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

    // Get equipped weapons
    const { weapons } = actorData.itemTypes.weapon.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.weapons.push(equip);
        return obj;
      },
      { weapons: [] }
    );

    // Get equipped armor
    const { armors } = actorData.itemTypes.armor.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.armors.push(equip);
        return obj;
      },
      { armors: [] }
    );

    // Get equipped shield
    const { shields } = actorData.itemTypes.shield.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.shields.push(equip);
        return obj;
      },
      { shields: [] }
    );

    // Get equipped accessories
    const { accessories } = actorData.itemTypes.accessory.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.accessories.push(equip);
        return obj;
      },
      { accessories: [] }
    );

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

    bStatus.initiative.base = qik.value ?? 0;

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

    inventory.base = 2;
    let bonusBagSpace = 0;
    // Get equipped bags
    const { bags } = actorData.itemTypes.bag.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.bags.push(equip);
        return obj;
      },
      { bags: [] }
    );

    if (bags.length > 0) {
      for (let [i] of Object.entries(bags)) {
        bonusBagSpace += bags[i].system.bagSpace ?? 0;
      }
    }

    inventory.maxSpace =
      inventory.base + (inventory.mod ?? 0) + (bonusBagSpace ?? 0);
  }
}
