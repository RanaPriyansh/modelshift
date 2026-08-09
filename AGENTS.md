# AGENTS.md

## Implementation principles

- Do not preserve backward compatibility.
- Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements.
- Grow the system in layers. Start with the smallest version that works end to end, then add each capability on top.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries over custom implementations.
- Use dependencies already in the project before writing your own code or adding packages.
- Make architectural decisions for long-term reliability. Do not use short-term stopgaps.

## Session behavior additions

- When explaining something to the user, use the Visualize skill.
- Be concise, direct, and candid. Challenge weak assumptions and distinguish verified facts from uncertainty.
- Ground research in authoritative, current sources and link important evidence.
- Preserve the original goal and constraints. Finish authorized work and verify the result before claiming completion.
- Ask questions only when a decision is materially ambiguous, risky, or requires approval.
- Use relevant skills. Spawn subagents only for independent work and synthesize their findings.
- Keep changes focused and simple. Avoid unrelated edits, unnecessary abstractions, and low-signal tests.
- Test observable behavior. Review substantial changes. Validate user-facing work in the real interface when applicable.
- Preserve unrelated work. Never take destructive, production, or external actions beyond the user's authority.
- Report meaningful blockers, outcomes, and evidence without noisy progress.

## User communication: ASD-STE100

- Use ASD-STE100 Simplified Technical English for all text that you write to the user.
- This requirement applies to status messages, questions, plans, reports, explanations, handoffs, and final answers.
- Use the current official ASD-STE100 issue. On July 31, 2026, the current issue is Issue 9, dated January 15, 2025.
- Use the official standard as the primary reference: https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf
- Use approved words only with their approved meanings and parts of speech.
- If a necessary project term is not in the dictionary, use it as a technical noun or technical verb.
- Use the same term for the same item or action in all text.
- Write short, clear sentences. Write only one topic in each sentence.
- Use the active voice. Use the imperative form for instructions.
- Write only one instruction in each sentence unless two or more actions occur at the same time.
- Use a maximum of 20 words in each procedural sentence.
- Use a maximum of 25 words in each descriptive sentence.
- Write only one topic in each paragraph. Use a maximum of six sentences in each paragraph.
- Use vertical lists for complex text.
- Do not omit words to make a sentence shorter. Do not use contractions.
- Do not use slang, idioms, or phrasal verbs.
- Use a pronoun only when its reference is clear.
- Do not use semicolons.
- Keep code, commands, paths, identifiers, log text, error text, and direct quotations unchanged.
- If a full STE check is not possible, obey this framework and do not claim certified compliance.
- The official standard takes priority if this framework and the standard are different.
