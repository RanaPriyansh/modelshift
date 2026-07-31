# FORGE iOS Product Strategy

**Date:** 2026-08-01
**State:** `FOUNDATION_CANDIDATE`
**Web source:** `cd84e20f6f78d68a430666c185b00efa99c49a87`
**Minimum system:** iOS 18
**Build system:** Xcode 26.6 with the iOS 26.5 SDK

## Product decision

Build a focused native companion. Do not reproduce the complete web application.

Preserve this FORGE loop:

`Goal → reviewed path → active work → protected proof → bounded evidence → delayed return → next action`

The first native release uses the current public FORGE contract. It does not use the provisional university research surfaces.

The first release has three primary sections:

- Today
- Path
- Evidence

Projects remain part of the product direction. Projects enter native navigation after the fixture boundary is removed.

## Release boundary

The current web record reports a strong local V1 candidate. It does not report a complete production release.

Native foundation work can continue with local fixtures. TestFlight cannot start until the source and API contracts are frozen.

The first native build contains no network client. It creates no canonical learning evidence.

The first native build contains no account authority. It uses device-local state only.

## Onboarding

Use one short, optional, interactive welcome screen.

The learner can enter one goal or try a safe sample. Do not use a feature carousel.

Ask for the learner mode only when the mode changes policy. Do not ask for an exact birth date.

Show the device data boundary before the learner continues. Do not request notification permission during onboarding.

Delay account setup until cross-device continuity gives clear value.

Apple recommends fast, optional, and interactive onboarding. See [Apple onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding).

## Mobile information architecture

### Today

Today shows one next action. It also shows the reason, duration, and delayed-return state.

Today includes two secondary choices:

- Change direction
- Review a due return

Today does not show scores, streaks, ranks, badges, or a dense dashboard.

### Path

Path shows the accepted reviewed route. Use one vertical sequence on iPhone.

Each milestone shows one explicit state:

- Complete
- Active
- Next
- Review gap

Do not convert sequence position into a capability claim.

### Evidence

Evidence shows the result, assistance state, provenance, limitation, and delayed-return state.

Evidence must keep negative and untested states visible.

Do not let a widget, notification, shortcut, or intent change evidence.

### Focus

Open active work from Today or Path. Hide the tab bar during focused work.

Keep Pause, Stop, Source, Access, Safety, and Recovery available.

Remove instructional help during protected proof. Keep access support available.

### Settings

Open Settings from a toolbar control.

Settings contains:

- Device data status
- Reminder permission
- Complete local deletion
- Privacy information

Add export and account status only after canonical records and account authority exist.

## Visual system

Use the existing warm paper, near-black ink, amber, and cyan language.

Use system text styles and controls. Support Dynamic Type and system appearance settings.

Let standard navigation and controls adopt Liquid Glass on iOS 26.

Do not apply Liquid Glass to lesson, path, or evidence content surfaces.

Apple describes Liquid Glass as a functional control layer. See [Apple Liquid Glass guidance](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass).

## Notification strategy

Start with one local delayed-return reminder.

Request permission after the learner chooses the first return time. Keep all functions available after denial.

Use generic Lock Screen text:

> A return is ready.

Do not include the learner name, goal, course, lesson, evidence, grade, or account data.

Use a passive or normal interruption level. Do not use Time Sensitive or Critical delivery.

Move delivery outside the local quiet period. Cancel the reminder after completion, pause, deletion, or schedule change.

A grown-up manages reminders for a child mode.

Do not add remote push until adult account sync, preferences, APNs registration, and deletion operations pass review.

See [Apple notification guidance](https://developer.apple.com/design/human-interface-guidelines/managing-notifications).

## Widget strategy

Release one nonconfigurable `systemSmall` widget.

Show only:

- A generic Continue Learning label
- The next return time

Open the exact focus route. Show a safe unavailable state when that route is invalid.

Mark learner-specific content as privacy-sensitive. Show generic content while the device is locked.

Add larger widgets only after real use shows a clear need.

See [Apple WidgetKit strategy](https://developer.apple.com/documentation/widgetkit/developing-a-widgetkit-strategy).

## App Intent strategy

Release one parameter-free intent:

`ContinueLearningIntent`

Use this shortcut phrase:

`Continue learning in FORGE`

The intent opens the exact focus route. It does not return learner data through Siri.

Do not add entities until the system must select between real, authorized records.

See [Apple App Intents guidance](https://developer.apple.com/documentation/appintents/adopting-app-intents-to-support-system-experiences).

## Features that remain out of the first release

- General chat
- User-generated content
- Studio authoring
- New AI provider operation
- Remote push
- Live Activities
- Payments
- Third-party analytics
- Advertising
- Camera, Photos, Contacts, or Location access
- A web-view application shell

A future Live Activity can support a learner-started focus session. The session must have a clear start and end.

## Data and API strategy

Keep guest mode local-first. Store authentication tokens in Keychain when authentication exists.

Use one App Group for application, widget, and intent handoff data.

Store only the minimum redacted widget snapshot in the App Group.

The current web planner uses a same-origin boundary. The native application cannot use that endpoint as a production API.

Build these server contracts before sync:

1. Adult authentication and device registration
2. Versioned native planner
3. Goal, path, and path-decision records
4. Bootstrap and delta sync
5. Signed World package download
6. Session checkpoint and completion receipts
7. Evidence export, delete, and challenge
8. Return scheduling and completion
9. Notification preferences and APNs registration

Every route must validate the opaque identifier, entitlement, World version, and current record.

## Under-18 boundary

Treat local learner mode as a preference. It is not verified age or guardian authority.

Keep free-form goals and constraints on the device for minor modes.

Disable cloud sync, open messaging, open-web sources, analytics, and remote notifications.

Require fresh grown-up confirmation for each child session and return.

Use Declared Age Range only after the age-assurance policy is accepted. See [Apple age-range guidance](https://developer.apple.com/documentation/declaredagerange/requesting-people-share-their-age-range-with-your-app).

## Apple release requirements

Build App Store archives with the iOS 26 SDK or later. Apple requires this for submissions after April 28, 2026.

See [Apple SDK submission requirement](https://developer.apple.com/news/?id=ueeok6yw).

Before App Store review, add these items:

- Valid signing and App Group identifiers
- Store media
- `PrivacyInfo.xcprivacy`
- Accurate App Privacy answers
- In-application privacy policy
- In-application account deletion when account creation exists
- Review account and complete review notes
- Live reviewed backend services

See [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

## Current implementation

The foundation now includes:

- Native onboarding
- Today, Path, and Evidence sections
- A read-only focus preview
- Device-local shared state
- A complete local-data reset
- One private local reminder
- One small privacy-sensitive widget
- One parameter-free App Intent
- A 1024-pixel opaque application icon
- A generated Xcode project
- A local verification script
- A path-scoped continuous-integration workflow

This implementation uses fixtures. It does not create canonical evidence or use a production API.
