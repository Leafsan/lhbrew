export async function rollDice(difficulty, diceBonus = 0, attainBonus = 0) {
  const fomula = `${Math.max(diceBonus + 2, 1)}d6`;
  const roll = await new Roll(fomula).evaluate();

  const individualResults = roll.dice[0].results.map((r) => r.result);
}
