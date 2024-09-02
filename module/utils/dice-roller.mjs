/**
 * Roll dice and determine results based on difficulty and bonuses.
 * @param {number} difficulty - The difficulty level to compare against.
 * @param {number} [diceBonus=0] - Bonus dice to add.
 * @param {number} [attainBonus=0] - Bonus to the attainment value.
 * @returns {Promise<Object>} - Results of the dice roll.
 */
export async function rollDice(difficulty, diceBonus = 0, attainBonus = 0) {
  const fomula = `${Math.max(diceBonus + 2, 1)}d6`;
  const roll = await new Roll(fomula).evaluate();

  const value = parseInt(roll.result);
  const individualResults = roll.dice[0].results.map((r) => r.result);
  const success = parseInt(roll.result) <= difficulty ? true : false;
  const attain = parseInt(roll.result) + attainBonus;

  return {
    difficulty,
    value,
    individualResults,
    success,
    attain,
  };
}
