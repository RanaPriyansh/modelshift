# University protected-study UX experiment loop

**Status:** preregistered internal fixture loop

**Purpose:** test whether an adult university student can understand the
learning-integrity boundary before opening a reviewed activity

**Not evidence of:** demand, learning efficacy, accessibility conformance,
institutional truth, live student safety, production readiness, or durable
evidence

## Fixed harness

Following the useful constraint in
[Karpathy's autoresearch](https://github.com/karpathy/autoresearch), keep the
harness and evaluation questions fixed while changing one surface variable at
a time. Unlike model training, a person is not reducible to one loss metric:
task success, comprehension, trust calibration, autonomy, and observed harm
remain separate evidence.

The test harness always contains:

- one synthetic adult university course;
- one existing accepted reviewed path action;
- one exact released source-corroboration World package;
- no account, network, provider, model call, database, browser storage, or
  session start;
- four fixed states: ready brief, source blocked, World changed, World paused;
- the same 320 CSS pixel, keyboard, reduced-motion, forced-colors, and console
  checks.

## Student job

> Before I begin a difficult activity, help me understand what I must do
> myself, what help is available, when help stops, what the result means, and
> what it does not prove.

## Fixed comprehension questions

After a 20-second inspection, ask the participant:

1. What do you have to do before receiving a result?
2. Can instructional help be used during the independent proof?
3. Does an AI model decide whether the proof is correct?
4. Is the resulting receipt durable or independent proof of learning?
5. If the World version or copied source context changes, will FORGE silently
   open another activity?

Record each answer separately as correct, incorrect, or uncertain. Also record
time to first correct explanation, attempted unsafe launch, backtracking, and
the participant's own wording.

## Baseline

The prior Today ready state linked directly to "Preview activity" and stated
only that no session would be started or saved.

## Hypotheses

| ID | One variable changed | Expected evidence | Keep condition |
| --- | --- | --- | --- |
| `H01` | Insert a protected-study brief before the World | More participants correctly explain help withdrawal and receipt limits | At least 80% answer questions 2 and 4 correctly without facilitator repair |
| `H02` | Lead with "Understand it. Then prove it without help." | Faster recognition that the activity is not an answer generator | Median explanation time improves without raising false "no help at all" answers |
| `H03` | Show a five-step semantic sequence | Participants can predict the learning arc before launch | At least 80% identify learner commitment before bounded result |
| `H04` | Separate first move, support, and proof cards | Fewer participants conflate access support with instructional answers | No participant says all accessibility support is removed during proof |
| `H05` | Put honour-based and non-persisted receipt limits beside the result | Fewer durable or credential-strength assumptions | No participant describes the receipt as verified university credit |
| `H06` | Remove launch in source-blocked, version-changed, and paused states | Unsafe substitution attempts fall | Zero successful launch controls in all three refusal states |
| `H07` | Route Today ready to the brief, while recovery and source-review links remain separate | The semester loop feels coherent without implied state transfer | Participants can name which object would need repair in each state |

## Evaluation rules

- Change one visual or copy variable per comparison.
- Preserve the contracts, fixture facts, refusal states, and route gate.
- A participant's confusion is evidence against the current design, not a
  prompt to coach them toward the expected answer.
- Do not aggregate comprehension and time into one score.
- Keep a change only when the target evidence improves and no authority,
  accessibility, autonomy, or harm boundary regresses.
- Stop the experiment if a participant believes the surface can answer graded
  work, send university messages, verify institutional policy, create a durable
  credential, or silently substitute a World.

## Automated regression evidence

Automation may confirm only implementation behavior:

- the exact ready contract and refusal copies render;
- native radios traverse all four states by keyboard;
- the preview link exists only in ready state;
- Today ready reaches this brief without transferring state;
- no horizontal overflow occurs at exactly 320 CSS pixels;
- reduced-motion and forced-colors adaptations are present;
- no console error occurs in the tested browser path;
- production exposes only the unavailable shell;
- server-only fixture markers are absent from public static assets.

Automation does not establish participant comprehension or accessibility
conformance.
