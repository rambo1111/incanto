// server/ai/geminiJudge.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Confirmed stable model string — Google AI API reference
const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are the mystical oracle judge of a spell-casting battle game called Incanto.
Two players each drew a spell on a whiteboard and named it. You must judge who wins this dramatic clash.

You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no explanation outside the JSON.

Required JSON structure (exactly):
{
  "type": "<outcome_type>",
  "reason": "<short dramatic reason, max 15 words>",
  "narrative": "<vivid 2-sentence battle description of what happened when the spells collided>"
}

Outcome types — pick exactly one:
- "p1_loses"          → Player 1's spell was weaker, deflected, overpowered, or failed
- "p2_loses"          → Player 2's spell was weaker, deflected, overpowered, or failed
- "both_lose"         → The spells catastrophically cancelled each other, both wizards suffer
- "none_lose"         → The spells perfectly neutralized each other — a rare stalemate
- "p1_inappropriate"  → Player 1's drawing contains inappropriate/offensive content
- "p2_inappropriate"  → Player 2's drawing contains inappropriate/offensive content

Judgment rules:
- Be THEATRICAL and CREATIVE. Reference the spell names AND what you see drawn.
- "narrative" must describe the actual clash — make it specific to THESE two spells.
- Blank canvas or pure scribbles = weak, unformed, chaotic spell (still valid, just weak).
- Inappropriate content: nudity, gore, hate symbols, slurs → flag as inappropriate immediately.
- Consider elemental logic: fire beats ice, shield deflects arrows, darkness swallows light, etc.
- Consider spell name creativity and drawing clarity when judging strength.
- NEVER return anything outside the JSON. No backticks. No markdown. No comments.`;

const VALID_TYPES = ['p1_loses','p2_loses','both_lose','none_lose','p1_inappropriate','p2_inappropriate'];

function toBase64(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  return dataUrl.replace(/^data:image\/\w+;base64,/, '');
}

function parseModelJSON(text) {
  const clean = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(clean);
}

/**
 * Primary: vision judge — sees both drawings + spell names
 */
async function judgeRound(player1, player2) {
  try {
    const model  = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const b64_1  = toBase64(player1.imageData);
    const b64_2  = toBase64(player2.imageData);

    if (!b64_1 || !b64_2) throw new Error('Missing image data');

    const prompt = `${SYSTEM_PROMPT}

PLAYER 1 (first image): "${player1.username}" cast "${player1.spellName}"
PLAYER 2 (second image): "${player2.username}" cast "${player2.spellName}"

Look at both drawings carefully, consider the spell names, then judge the clash. Return ONLY the JSON.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: b64_1, mimeType: 'image/png' } },
      { inlineData: { data: b64_2, mimeType: 'image/png' } }
    ]);

    const parsed = parseModelJSON(result.response.text().trim());
    if (!VALID_TYPES.includes(parsed.type)) throw new Error(`Bad outcome type: ${parsed.type}`);

    console.log(`✅ Gemini 2.5 Flash judged: ${parsed.type} — "${parsed.reason}"`);
    return parsed;

  } catch (err) {
    console.error('⚠️  Gemini vision error:', err.message);
    return judgeByNamesOnly(player1, player2);
  }
}

/**
 * Fallback: text-only judge — uses spell names only
 */
async function judgeByNamesOnly(player1, player2) {
  try {
    const model  = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are the mystical oracle of a spell battle game.

Player 1 "${player1.username}" used spell: "${player1.spellName}"
Player 2 "${player2.username}" used spell: "${player2.spellName}"

Based on the spell names and their implied magical properties, judge this clash dramatically.
Consider elemental interactions, power levels implied by the names, and creativity.

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "type": "<p1_loses|p2_loses|both_lose|none_lose>",
  "reason": "<max 15 words, dramatic and specific to these spell names>",
  "narrative": "<2 vivid sentences about what happened when these specific spells clashed>"
}`;

    const result = await model.generateContent(prompt);
    const parsed = parseModelJSON(result.response.text().trim());

    const safeTypes = ['p1_loses','p2_loses','both_lose','none_lose'];
    if (!safeTypes.includes(parsed.type)) throw new Error(`Bad type: ${parsed.type}`);

    console.log(`✅ Gemini text fallback judged: ${parsed.type}`);
    return parsed;

  } catch (err) {
    console.error('⚠️  Gemini text fallback error:', err.message);
    return randomFallback(player1, player2);
  }
}

/**
 * Last resort: deterministic random — game never freezes
 */
function randomFallback(player1, player2) {
  const types = ['p1_loses','p2_loses','both_lose','none_lose'];
  const type  = types[Math.floor(Math.random() * types.length)];

  const narratives = {
    p1_loses:  `${player1.username}'s "${player1.spellName}" shattered against ${player2.username}'s overwhelming "${player2.spellName}", crumbling into sparks. The arena fell silent as ${player1.username} staggered back, life force drained.`,
    p2_loses:  `${player2.username}'s "${player2.spellName}" buckled under the raw force of ${player1.username}'s "${player1.spellName}". ${player2.username} absorbed the devastating blow and fell to one knee.`,
    both_lose: `"${player1.spellName}" and "${player2.spellName}" collided in a catastrophic feedback loop, detonating with blinding force. Both ${player1.username} and ${player2.username} were hurled back by the mutual destruction.`,
    none_lose: `"${player1.spellName}" and "${player2.spellName}" met in perfect equilibrium, their energies spiraling into a harmless vortex. Neither wizard gave ground — a rare and humbling stalemate.`,
  };
  const reasons = {
    p1_loses:  `${player2.username}'s spell overpowered the opposition decisively`,
    p2_loses:  `${player1.username}'s spell proved the stronger arcane force`,
    both_lose: 'Neither spell survived the violent mutual annihilation',
    none_lose: 'The spells cancelled in perfect arcane symmetry',
  };

  console.log(`🎲 Random fallback outcome: ${type}`);
  return { type, reason: reasons[type], narrative: narratives[type] };
}

module.exports = { judgeRound };