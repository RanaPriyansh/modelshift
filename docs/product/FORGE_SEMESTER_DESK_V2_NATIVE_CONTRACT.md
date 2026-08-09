# FORGE Semester Desk v2 native contract

Status: Implementation contract.

Product decision: `amend_to_semester_desk_v2`.

Primary job:

> When my week has broken, help me rebuild from today without hiding what changed, overwhelming me, shaming me, or doing the learning for me.

## 1. Product boundary

FORGE is a private university operating system.

The native application uses the profile-bound Semester Desk v2 state.

The application keeps raw practice and proof text in process memory only.

The application saves a transition before it shows the transition.

The application does not claim mastery, university truth, or reminder delivery.

The application does not use an AI service in this release.

## 2. Navigation

Use three native tabs:

1. Today
2. Semester
3. Progress

Open Settings from the toolbar.

Use a sheet for a short edit or recovery review.

Use a full-screen work surface for protected study.

Use a native alert for destructive confirmation.

Do not use the old Path or Evidence labels.

## 3. Onboarding

Show one quiet threshold screen.

Ask for the semester name.

Explain that data stays on this device.

Create the Semester Desk before the application leaves onboarding.

Keep the entered name after a save failure.

Do not show starter-course package data.

Do not show source-protocol language.

### Required states

- Loading local data
- New local Semester Desk
- Save in progress
- Save failure
- Private-data recovery

## 4. Today

Show the most useful honest action.

Use this priority:

1. Finish an open recovery review.
2. Complete an open delayed return.
3. Show the selected next action.
4. Ask the student to choose one planned item.
5. Ask the student to confirm capacity.
6. Ask the student to add planned work.
7. Ask the student to add a course.

Show one primary action.

Show a short reason for that action.

Show the semester name and confirmed capacity.

Show `Ready to work on` for a selected action.

Show `Come back on this date` for a delayed return.

Do not show a progress score.

Do not show a generic dashboard.

## 5. Semester

Keep authored course and plan order.

Show all courses.

Show all planned work.

Show confirmed capacity.

Show deferred work without hiding it.

Provide these actions:

- Add a course.
- Add a course fact.
- Change a fact status.
- Record a fact conflict.
- Resolve a fact conflict.
- Add planned work.
- Draft capacity.
- Confirm capacity.
- Prepare recovery.
- Review every recovery change.
- Confirm recovery.
- Resume deferred work.
- Choose the next action.

### Course language

Use these status terms:

- Checked
- Needs review
- Changed since last check
- Not yet confirmed

Show the source label as supporting context.

Show the last check date when one exists.

Do not show an internal source object.

### Recovery language

Show every planned item before confirmation.

Show the previous date and duration.

Show the proposed date and duration.

Show the student reason.

Use moved, reduced, kept, or deferred.

Keep the recovery draft until a confirmed save succeeds.

Do not select work for the student.

## 6. Protected study

Open one selected plan item.

Use a quiet full-screen work surface.

Keep scenic art out of the work surface.

Use four explicit stages:

1. Practice
2. Independent check
3. Return date
4. Delayed return

### Practice

Show the plan item title and course.

Let the student write private working notes.

Do not save the notes.

Let the student choose `Practice complete` or `I need more work`.

Keep the activity active after `I need more work`.

### Independent check

Ask the student to close or ignore the practice notes.

Ask for a new explanation in the student's own words.

Do not save the explanation.

Let the student choose `I can explain this` or `I need a return`.

Do not let FORGE answer the task.

### Return date

Require a future return date after independent proof.

Show `Come back on this date`.

Save the date before dismissal.

Offer a local reminder only after the date is saved.

### Delayed return

Block the return before its due time.

Open the return at or after its due time.

Ask for a fresh explanation.

Do not save the explanation.

Let the student choose `I retained this` or `I need more work`.

Return the plan item to planned work after `I need more work`.

## 7. Progress

Show useful learning history.

Group records by plan item.

Show:

- Practice completed
- Independent check completed
- Delayed return completed
- Needs more work
- Demonstrated
- Retained

Show the date for each record.

Do not show internal identifiers by default.

Do not use the word receipt in the primary interface.

Do not claim mastery from one record.

## 8. Settings and privacy

Provide:

- Reminder permission and status
- Download or export when supported
- Clear local data
- Privacy information
- Support information
- Application version

State that web and iPhone data do not sync.

State that raw practice and proof text is not saved.

Keep technical storage details collapsed or absent.

Show the reset result after navigation changes.

## 9. System integration

The widget shows only a generic return state.

The widget does not show a course title or personal detail.

The widget opens Today or the due return.

The App Intent opens the current selected action.

Deep links use:

- `forge://today`
- `forge://semester`
- `forge://progress`
- `forge://return`
- `forge://study`
- `forge://settings`

Reject old Path, Evidence, Returns, and Focus links.

The reminder uses the earliest incomplete delayed return.

The reminder includes no course title or student text.

## 10. Accessibility

Use native text styles.

Support every Dynamic Type size.

Change horizontal groups to vertical groups at accessibility sizes.

Keep each control at least 44 points high.

Provide one clear VoiceOver label and hint for each action.

Keep the accessibility order equal to the visual order.

Support Voice Control names.

Remove animation when Reduce Motion is active.

Do not use colour as the only status signal.

Keep the tab bar clear of scroll content.

## 11. Visual system

Use Editorial Terrain Recovery.

Use warm ivory for calm work.

Use forest for checked evidence.

Use cobalt for focus and disclosed AI only.

Use orange for a deliberate student action.

Use native lists, sheets, alerts, and tab bars.

Use a flat ledger for the semester.

Use vivid art only at onboarding, recovery, and delayed return thresholds.

## 12. Required empty and failure states

Every main screen must show:

- Loading
- Empty
- Normal
- Save in progress
- Save failure
- Recovery
- Offline local operation

Keep the current form after a failed save.

Do not silently replace invalid private data.

## 13. Required native verification

Verify:

- New desk creation
- Cold restore
- Course creation
- Fact status and conflict resolution
- Capacity draft and confirmation
- Recovery draft and confirmation
- Deferred-work resume
- Next-action selection
- Practice
- Independent check
- Delayed-return scheduling
- Reminder denial
- Delayed-return completion
- Progress history
- Reset
- Storage corruption
- Background and foreground
- Time and timezone changes
- Widget
- Deep link
- App Intent
- Small simulator
- Modern simulator
- AccessibilityXXXL
- VoiceOver order
- Reduced Motion
- Dark appearance

## 14. Retired user surfaces

Remove these surfaces from final navigation:

- Starter course setup
- Path
- Evidence receipts
- Package details
- Source-protocol details
- Old activity prompt flow
- Old Focus deep link

Preserve only code that a final Semester Desk v2 flow still uses.
