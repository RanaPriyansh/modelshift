import XCTest

@MainActor
final class FORGEUITests: XCTestCase {
  private enum ActivityChoice {
    static let practiceCorrect = "stays_constant_after_force"
    static let practiceWrong = "changes_direction"
    static let delayedReturnCorrect = "constant_positive_velocity"
  }

  private static let initialClockStart = 1_800_000_000
  private static let delayedReturnClockStart = 1_800_691_200
  private static let secondsPerDay = 86_400
  private static let proofSubmissionClockOffset = 0
  private static let delayedReturnDueAt =
    initialClockStart + (37 * secondsPerDay) + proofSubmissionClockOffset
  private static let delayedReturnDueClockStart = delayedReturnDueAt - 2
  private static let delayedReturnWindowClosedClockStart = delayedReturnDueAt
  private static let defaultLaunchArguments = [
    "-FORGEUITestingReset",
    "-FORGEUITestingClockStart",
    "1800000000",
  ]

  func testFreshOnboardingShowsStarterCourse() {
    let app = launchApp()

    waitForElement(element("onboarding.screen", in: app))
    waitForElement(element("onboarding.course-title", in: app))
    waitForElement(element("onboarding.limitations", in: app))
    waitForHittable(button("onboarding.start-course", in: app))
  }

  func testOnboardingOpensPrivacyAndSupportBeforeCourseStart() {
    let app = launchApp()

    waitForElement(element("onboarding.screen", in: app))
    revealAndTap(element("onboarding.privacy-support", in: app), in: app)
    waitForElement(element("privacy-support.screen", in: app))
    assertDoesNotAppear(element("today.course-title", in: app))
  }

  func testStarterCourseStarts() {
    let app = launchApp()

    startStarterCourse(in: app)

    waitForElement(element("today.course-title", in: app))
    revealAndWaitForHittable(button("today.open-activity", in: app), in: app)
  }

  func testPracticeRecordsWrongThenCorrectLocalChecks() {
    let app = launchApp()

    startStarterCourse(in: app)
    openCurrentActivity(in: app)

    submitLocalCheck(
      choice: ActivityChoice.practiceWrong,
      reasoning: "The force changes the velocity.",
      expectedResult: "Check not passed",
      in: app
    )
    submitLocalCheck(
      choice: ActivityChoice.practiceCorrect,
      reasoning: "The velocity remains constant after the force is removed.",
      expectedResult: "Recorded local check",
      in: app
    )

    expectActivityType("Independent check", in: app)
  }

  func testCorrectProofSchedulesDelayedReturn() {
    let app = launchApp()

    startStarterCourse(in: app)
    createScheduledDelayedReturn(in: app)

    expectReturnStatus("Scheduled", in: app)
    let returnOpensAt = element("today.return-opens-at", in: app)
    revealAndWaitForVisible(returnOpensAt, in: app)
    let returnDate = element("today.return-date-visual", in: app)
    revealAndWaitForVisible(returnDate, in: app)
  }

  func testRestartPersistsCurrentActivity() {
    let app = launchApp()

    startStarterCourse(in: app)
    completeCorrectPractice(in: app)
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )

    relaunchWithoutReset(
      app,
      clockStart: Self.initialClockStart + 86_400
    )

    waitForElement(element("today.course-title", in: app))
    openCurrentActivity(in: app)
    expectActivityType("Independent check", in: app)
  }

  func testDelayedReturnOpensCompletesAndPersistsAcrossRestart() {
    let app = launchApp()

    startStarterCourse(in: app)
    createScheduledDelayedReturn(in: app)
    expectReturnStatus("Scheduled", in: app)

    relaunchWithoutReset(app, clockStart: Self.delayedReturnClockStart)

    waitForElement(element("today.course-title", in: app))
    expectReturnStatus("Open", in: app)
    openCurrentActivity(in: app)
    expectActivityType("Delayed return", in: app)
    submitLocalCheck(
      choice: ActivityChoice.delayedReturnCorrect,
      reasoning: "The velocity remains constant and positive after the force stops.",
      expectedResult: "Recorded local check",
      in: app
    )
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )
    expectReturnStatus("Return recorded", in: app)

    relaunchWithoutReset(
      app,
      clockStart: Self.delayedReturnClockStart + 86_400
    )

    waitForElement(element("today.course-title", in: app))
    expectReturnStatus("Return recorded", in: app)
  }

  func testInjectedClockShowsDueAndWindowClosedDelayedReturns() {
    let app = launchApp()

    startStarterCourse(in: app)
    createScheduledDelayedReturn(in: app)

    relaunchWithoutReset(
      app,
      clockStart: Self.delayedReturnDueClockStart
    )

    waitForElement(element("today.course-title", in: app))
    expectReturnStatus("Due", in: app)
    let dueOpenActivity = button("today.open-activity", in: app)
    revealAndWaitForVisible(dueOpenActivity, in: app)
    waitForEnabled(dueOpenActivity)

    relaunchWithoutReset(
      app,
      clockStart: Self.delayedReturnWindowClosedClockStart
    )

    waitForElement(element("today.course-title", in: app))
    expectReturnStatus("Window closed", in: app)
    let closedOpenActivity = button("today.open-activity", in: app)
    revealAndWaitForVisible(closedOpenActivity, in: app)
    waitForDisabled(closedOpenActivity)
  }

  func testSettingsShowsReminderBoundaryCopy() {
    let app = launchApp()

    startStarterCourse(in: app)
    createScheduledDelayedReturn(in: app)

    tap(button("settings.toolbar-button", in: app))

    let guidance = element("settings.reminder-guidance", in: app)
    waitForElement(guidance)
    waitForLabel(guidance, containing: "iOS controls notification delivery.")
    waitForElement(app.switches["settings.return-reminders"])
  }

  func testSettingsTechnicalDetailsStartCollapsedAndShowLocalPackageFacts() {
    let app = launchApp()

    startStarterCourse(in: app)
    tap(button("settings.toolbar-button", in: app))

    let technicalDetails = button("settings.package-technical-details", in: app)
    waitForValue(technicalDetails, equalTo: "Collapsed")
    revealAndTap(technicalDetails, in: app)
    waitForValue(technicalDetails, equalTo: "Expanded")
    waitForValue(
      element("settings.package-id", in: app),
      equalTo: "package.forge.adult-mechanics.local-starter"
    )
    waitForValue(
      element("settings.package-digest", in: app),
      equalTo: "cfd71c2bd907def9b472c0d45f5b206d9725cdb2ba148a9d9d2f85287d656cf6"
    )
    waitForLabel(
      element("settings.package-no-credential-boundary", in: app),
      containing: "do not create credentials."
    )
  }

  func testPrivacyAndSupportShowsLocalBoundaries() {
    let app = launchApp()

    startStarterCourse(in: app)
    tap(button("settings.toolbar-button", in: app))
    waitForElement(element("settings.reminder-guidance", in: app))
    revealAndTap(element("settings.privacy-support", in: app), in: app)

    waitForElement(element("privacy-support.screen", in: app))
    let storageBoundary = element("privacy-support.storage-boundary", in: app)
    revealAndWaitForVisible(storageBoundary, in: app)
    let storageProtection = element("privacy-support.storage-protection", in: app)
    revealAndWaitForVisible(storageProtection, in: app)
    let appGroup = element("privacy-support.app-group", in: app)
    revealAndWaitForVisible(appGroup, in: app)
    let dataUse = element("privacy-support.data-use", in: app)
    revealAndWaitForVisible(dataUse, in: app)
  }

  func testPrivacyAndSupportClearsPopulatedCourseAcrossRelaunch() {
    let app = launchApp()

    startStarterCourse(in: app)
    completeCorrectPractice(in: app)
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )

    tap(button("settings.toolbar-button", in: app))
    revealAndTap(element("settings.privacy-support", in: app), in: app)
    waitForElement(element("privacy-support.screen", in: app))
    revealAndTap(button("privacy-support.clear-local-data", in: app), in: app)
    waitForElement(element("privacy-support.clear-local-data-confirmation", in: app))
    revealAndTap(button("privacy-support.confirm-clear-local-data", in: app), in: app)
    waitForElement(element("onboarding.screen", in: app))

    relaunchWithoutReset(
      app,
      clockStart: Self.initialClockStart + Self.secondsPerDay
    )

    waitForElement(element("onboarding.screen", in: app))
    waitForHittable(button("onboarding.start-course", in: app))
  }

  func testPrivacyClearCancelPreservesPopulatedCourseAcrossRelaunch() {
    let app = launchApp()

    startStarterCourse(in: app)
    completeCorrectPractice(in: app)
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )

    tap(button("settings.toolbar-button", in: app))
    revealAndTap(element("settings.privacy-support", in: app), in: app)
    waitForElement(element("privacy-support.screen", in: app))
    revealAndTap(button("privacy-support.clear-local-data", in: app), in: app)
    waitForElement(element("privacy-support.clear-local-data-confirmation", in: app))
    revealAndTap(button("privacy-support.cancel-clear-local-data", in: app), in: app)
    waitForHittable(button("privacy-support.clear-local-data", in: app))

    relaunchWithoutReset(
      app,
      clockStart: Self.initialClockStart + Self.secondsPerDay
    )

    waitForElement(element("today.course-title", in: app))
    openCurrentActivity(in: app)
    expectActivityType("Independent check", in: app)
  }

  func testEvidenceDisclosesLocalReceiptScope() {
    let app = launchApp()

    startStarterCourse(in: app)
    completeCorrectPractice(in: app)
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )

    revealAndTap(app.tabBars.buttons["tab.evidence"], in: app)
    waitForElement(element("evidence.record-list", in: app))
    waitForElement(element("evidence.local-boundary", in: app))
  }

  func testEvidenceShowsWrongThenCorrectReceiptResultsAndLocalScope() {
    let app = launchApp()

    startStarterCourse(in: app)
    openCurrentActivity(in: app)
    submitLocalCheck(
      choice: ActivityChoice.practiceWrong,
      reasoning: "The force changes the velocity.",
      expectedResult: "Check not passed",
      in: app
    )
    submitLocalCheck(
      choice: ActivityChoice.practiceCorrect,
      reasoning: "The velocity remains constant after the force is removed.",
      expectedResult: "Recorded local check",
      in: app
    )
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )

    tap(app.tabBars.buttons["tab.evidence"])
    waitForElement(element("evidence.record-list", in: app))

    let localReceipts = receipts(in: app)
    waitForElement(localReceipts.firstMatch)
    XCTAssertEqual(localReceipts.count, 2, "Expected two local receipts.")

    let firstReceipt = localReceipts.element(boundBy: 0)
    let secondReceipt = localReceipts.element(boundBy: 1)
    let firstResult = expandedReceiptCheckResult(in: firstReceipt, app: app)
    let secondResult = expandedReceiptCheckResult(in: secondReceipt, app: app)

    XCTAssertEqual(
      Set([firstResult, secondResult]),
      Set(["Check not passed", "Recorded local check"]),
      "Expected one failed check receipt and one recorded local check receipt."
    )
  }

  func testEvidenceReceiptShowsLocalScopeWithoutRawResponse() {
    let app = launchApp()
    let uniqueResponse = "FORGE UI raw response marker 20260802"

    startStarterCourse(in: app)
    openCurrentActivity(in: app)
    submitLocalCheck(
      choice: ActivityChoice.practiceCorrect,
      reasoning: uniqueResponse,
      expectedResult: "Recorded local check",
      in: app
    )
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )

    tap(app.tabBars.buttons["tab.evidence"])
    let localBoundary = element("evidence.local-boundary", in: app)
    waitForElement(localBoundary)
    waitForLabel(localBoundary, containing: "do not publish, share, change, or issue a credential.")

    let receipt = onlyReceipt(in: app)
    let disclosure = receiptDisclosure(in: receipt, in: app)
    waitForValue(disclosure, equalTo: "Collapsed")
    revealAndTap(disclosure, in: app)
    waitForValue(disclosure, equalTo: "Expanded")
    waitForValue(metadataRow("Scope", in: receipt), equalTo: "Local-only unsigned")
    assertNoAccessibleContent(containing: uniqueResponse, in: app)
  }

  func testRootDeepLinksOpenCourseSurfaces() {
    let app = launchApp()

    startStarterCourse(in: app)

    openRootURL("forge://path", in: app)
    let pathCourseTitle = element("path.course-title", in: app)
    revealAndWaitForVisible(pathCourseTitle, in: app)

    openRootURL("forge://evidence", in: app)
    waitForElement(element("evidence.local-boundary", in: app))

    openRootURL("forge://today", in: app)
    waitForElement(element("today.course-title", in: app))

    openRootURL("forge://returns", in: app)
    waitForElement(element("today.course-title", in: app))

    openRootURL("forge://settings", in: app)
    waitForElement(element("settings.reminder-guidance", in: app))
  }

  func testColdLaunchRootDeepLinkOpensPath() {
    let app = launchApp()

    startStarterCourse(in: app)
    relaunchWithoutReset(
      app,
      clockStart: Self.initialClockStart + Self.secondsPerDay
    )
    waitForElement(element("today.course-title", in: app))

    app.terminate()
    openRootURL("forge://path", in: app)

    revealAndWaitForVisible(element("path.course-title", in: app), in: app)
  }

  func testColdLaunchRootDeepLinksOpenSettingsAndEvidence() {
    let app = launchApp()

    startStarterCourse(in: app)
    relaunchWithoutReset(
      app,
      clockStart: Self.initialClockStart + Self.secondsPerDay
    )
    waitForElement(element("today.course-title", in: app))

    app.terminate()
    openRootURL("forge://settings", in: app)
    waitForElement(element("settings.reminder-guidance", in: app))

    app.terminate()
    openRootURL("forge://evidence", in: app)
    waitForElement(element("evidence.local-boundary", in: app))
  }

  func testFocusDeepLinkOnlyOpensEligibleCurrentActivity() {
    let app = launchApp()

    startStarterCourse(in: app)
    openRootURL("forge://focus", in: app)
    waitForElement(element("activity.screen", in: app))
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )

    openRootURL("forge://focus?unexpected=1", in: app)
    assertDoesNotAppear(element("activity.screen", in: app))

    createScheduledDelayedReturn(in: app)
    expectReturnStatus("Scheduled", in: app)
    openRootURL("forge://focus", in: app)
    assertDoesNotAppear(element("activity.screen", in: app))
    let openActivity = button("today.open-activity", in: app)
    revealAndWaitForVisible(openActivity, in: app)
    waitForDisabled(openActivity)
  }

  func testPathOpensCurrentActivityAndTodayReviewsCourse() {
    let app = launchApp()

    startStarterCourse(in: app)
    tap(app.tabBars.buttons["tab.path"])
    let pathCourseTitle = element("path.course-title", in: app)
    revealAndWaitForVisible(pathCourseTitle, in: app)
    revealAndTap(button("path.open-current", in: app), in: app)
    waitForElement(element("activity.screen", in: app))
    closeActivity(in: app, expectedScreen: pathCourseTitle)

    tap(app.tabBars.buttons["tab.today"])
    waitForElement(element("today.course-title", in: app))
    revealAndTap(button("today.change-direction", in: app), in: app)
    waitForElement(element("onboarding.screen", in: app))
    waitForHittable(button("onboarding.start-course", in: app))
  }

  func testActivityDraftCancelPreservesAndDiscardDismisses() {
    let app = launchApp()
    let draftResponse = "Draft local reasoning."

    startStarterCourse(in: app)
    openCurrentActivity(in: app)

    let selectedChoice = button(
      "activity.choice.\(ActivityChoice.practiceCorrect)",
      in: app
    )
    revealAndTap(selectedChoice, in: app)

    let response = app.textFields["activity.response"]
    revealAndTap(response, in: app)
    response.typeText(draftResponse)
    tap(button("activity.keyboard.done", in: app))

    tap(button("activity.close", in: app))
    let discardAlert = discardConfirmation(in: app)
    let discardResponse = discardAlert.buttons.element(boundBy: 0)
    let cancelDiscard = discardAlert.buttons.element(boundBy: 1)
    waitForHittable(discardResponse)
    waitForHittable(cancelDiscard)

    tap(cancelDiscard)
    waitForHittable(button("activity.close", in: app))
    waitForElement(element("activity.screen", in: app))
    waitForValue(selectedChoice, equalTo: "Selected")
    waitForValue(response, equalTo: draftResponse)

    tap(button("activity.close", in: app))
    waitForElement(discardAlert)
    waitForHittable(discardResponse)
    tap(discardResponse)
    waitForElement(element("today.course-title", in: app))
    assertDoesNotAppear(element("activity.screen", in: app))
  }

  func testActivityChoiceOnlyDraftRequiresDiscardConfirmation() {
    let app = launchApp()

    startStarterCourse(in: app)
    openCurrentActivity(in: app)

    let selectedChoice = button(
      "activity.choice.\(ActivityChoice.practiceCorrect)",
      in: app
    )
    revealAndTap(selectedChoice, in: app)

    tap(button("activity.close", in: app))
    let discardAlert = discardConfirmation(in: app)
    let discardResponse = discardAlert.buttons.element(boundBy: 0)
    let cancelDiscard = discardAlert.buttons.element(boundBy: 1)
    waitForHittable(discardResponse)
    waitForHittable(cancelDiscard)

    tap(cancelDiscard)
    waitForHittable(button("activity.close", in: app))
    waitForValue(selectedChoice, equalTo: "Selected")

    tap(button("activity.close", in: app))
    waitForElement(discardAlert)
    waitForHittable(discardResponse)
    tap(discardResponse)
    waitForElement(element("today.course-title", in: app))
  }

  func testRootRouteDismissalReopensActivityWithDraft() {
    let app = launchApp(
      arguments: Self.defaultLaunchArguments + [
        "-FORGEUITestingActivityDraftDismissal"
      ]
    )
    let draftResponse = "Keep this local reasoning."

    startStarterCourse(in: app)
    openCurrentActivity(in: app)

    let selectedChoice = button(
      "activity.choice.\(ActivityChoice.practiceCorrect)",
      in: app
    )
    revealAndTap(selectedChoice, in: app)

    let response = app.textFields["activity.response"]
    revealAndTap(response, in: app)
    response.typeText(draftResponse)
    tap(button("activity.keyboard.done", in: app))

    tap(button("activity.test-route-dismissal", in: app))
    waitForElement(element("today.course-title", in: app))
    assertDoesNotAppear(element("activity.screen", in: app))

    openCurrentActivity(in: app)
    waitForValue(selectedChoice, equalTo: "Selected")
    waitForValue(response, equalTo: draftResponse)
  }

  func testDynamicTypeKeepsUniversityJourneysAvailable() throws {
    guard #available(iOS 17.0, *) else {
      return
    }

    let app = launchApp(
      arguments: Self.defaultLaunchArguments + [
        "-UIPreferredContentSizeCategoryName",
        "UICTContentSizeCategoryAccessibilityXXXL",
      ]
    )

    tap(button("onboarding.start-course", in: app))
    waitForElement(element("today.course-title", in: app))
    revealAndWaitForHittable(button("today.open-activity", in: app), in: app)

    tap(app.tabBars.buttons["tab.path"])
    let pathCourseTitle = element("path.course-title", in: app)
    revealAndWaitForVisible(pathCourseTitle, in: app)
    revealAndTap(button("path.open-current", in: app), in: app)
    waitForElement(element("activity.screen", in: app))
    tap(button("activity.go-to-response-choices", in: app))
    tap(button("activity.choice.\(ActivityChoice.practiceCorrect)", in: app))
    let response = app.textFields["activity.response"]
    revealAndTap(response, in: app)
    response.typeText("Short local reasoning.")
    let submit = button("activity.submit", in: app)
    waitForEnabled(submit)
    waitForHittable(submit)
    tap(button("activity.keyboard.done", in: app))
    tap(button("activity.close", in: app))
    let discardResponse = discardConfirmation(in: app).buttons.element(boundBy: 0)
    waitForHittable(discardResponse)
    tap(discardResponse)
    waitForElement(app.navigationBars["Path"])

    tap(app.tabBars.buttons["tab.evidence"])
    waitForElement(element("evidence.local-boundary", in: app))
    revealAndWaitForVisible(element("evidence.empty-state", in: app), in: app)
    tap(button("settings.toolbar-button", in: app))
    let technicalDetails = button("settings.package-technical-details", in: app)
    revealAndTap(technicalDetails, in: app)
    waitForValue(technicalDetails, equalTo: "Expanded")
    revealAndWaitForHittable(element("settings.privacy-support", in: app), in: app)
    try performAccessibilitySmokeAudit(in: app, includesDynamicType: false)
  }

  func testTodayCourseContextIsReachableAtAccessibilityXXXL() {
    guard #available(iOS 17.0, *) else {
      return
    }

    let app = launchApp(
      arguments: Self.defaultLaunchArguments + [
        "-UIPreferredContentSizeCategoryName",
        "UICTContentSizeCategoryAccessibilityXXXL",
      ]
    )

    waitForElement(element("onboarding.screen", in: app))
    tap(button("onboarding.start-course", in: app))

    let courseTitle = element("today.course-title", in: app)
    waitForElement(courseTitle)
    revealAndWaitForVisible(courseTitle, in: app)
  }

  func testReducedMotionKeepsCourseJourneyAvailable() {
    let app = launchApp(
      arguments: Self.defaultLaunchArguments + [
        "-UIAccessibilityReduceMotionEnabled",
        "YES",
      ]
    )

    visitMainCourseSurfaces(in: app)
  }

  func testReducedTransparencyKeepsAccessibilityJourneyAvailable() throws {
    guard #available(iOS 17.0, *) else {
      return
    }

    try performAccessibilityPreferenceJourney(
      launchArguments: Self.defaultLaunchArguments + [
        "-UIAccessibilityReduceTransparencyEnabled",
        "YES",
      ]
    )
  }

  func testDifferentiateWithoutColorKeepsAccessibilityJourneyAvailable() throws {
    guard #available(iOS 17.0, *) else {
      return
    }

    try performAccessibilityPreferenceJourney(
      launchArguments: Self.defaultLaunchArguments + [
        "-UIAccessibilityDifferentiateWithoutColorEnabled",
        "YES",
      ]
    )
  }

  func testDarkModeKeepsStarterCourseAvailable() throws {
    guard #available(iOS 17.0, *) else {
      return
    }

    let app = launchApp(
      arguments: Self.defaultLaunchArguments + [
        "-AppleInterfaceStyle",
        "Dark",
      ]
    )

    visitMainCourseSurfaces(in: app)
    try performAccessibilitySmokeAudit(in: app)
  }

  func testAccessibilitySmokePath() throws {
    guard #available(iOS 17.0, *) else {
      return
    }

    let app = launchApp()

    try performAccessibilitySmokeAudit(in: app)

    tap(button("onboarding.start-course", in: app))
    waitForElement(element("today.course-title", in: app))
    try performAccessibilitySmokeAudit(in: app)

    openCurrentActivity(in: app)
    try performAccessibilitySmokeAudit(in: app)

    submitLocalCheck(
      choice: ActivityChoice.practiceCorrect,
      reasoning: "Accessible local reasoning.",
      expectedResult: "Recorded local check",
      in: app
    )
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )

    tap(app.tabBars.buttons["tab.path"])
    revealAndWaitForVisible(element("path.course-title", in: app), in: app)
    try performAccessibilitySmokeAudit(in: app)

    tap(app.tabBars.buttons["tab.evidence"])
    revealAndWaitForVisible(element("evidence.local-boundary", in: app), in: app)
    try performAccessibilitySmokeAudit(in: app)

    let receipt = onlyReceipt(in: app)
    let disclosure = receiptDisclosure(in: receipt, in: app)
    waitForValue(disclosure, equalTo: "Collapsed")
    revealAndTap(disclosure, in: app)
    waitForValue(disclosure, equalTo: "Expanded")
    try performAccessibilitySmokeAudit(in: app)

    tap(button("settings.toolbar-button", in: app))
    revealAndWaitForVisible(element("settings.reminder-guidance", in: app), in: app)
    try performAccessibilitySmokeAudit(in: app)

    let technicalDetails = button("settings.package-technical-details", in: app)
    waitForValue(technicalDetails, equalTo: "Collapsed")
    revealAndTap(technicalDetails, in: app)
    waitForValue(technicalDetails, equalTo: "Expanded")
    try performAccessibilitySmokeAudit(in: app)

    revealAndTap(element("settings.privacy-support", in: app), in: app)
    revealAndWaitForVisible(element("privacy-support.screen", in: app), in: app)
    try performAccessibilitySmokeAudit(in: app)

    app.terminate()
    let recoveryApp = launchApp(
      arguments: Self.defaultLaunchArguments + [
        "-FORGEUITestingCorruptPrivateState"
      ]
    )
    revealAndWaitForVisible(element("recovery.screen", in: recoveryApp), in: recoveryApp)
    try performAccessibilitySmokeAudit(in: recoveryApp)

    revealAndTap(button("recovery.clear-local-data", in: recoveryApp), in: recoveryApp)
    waitForHittable(button("recovery.confirm-clear-local-data", in: recoveryApp))
    try performAccessibilitySmokeAudit(in: recoveryApp)

    tap(button("recovery.confirm-clear-local-data", in: recoveryApp))
    waitForElement(element("onboarding.screen", in: recoveryApp))
    try performAccessibilitySmokeAudit(in: recoveryApp)
  }

  func testCorruptPrivateStateShowsRecoveryAndClearRestoresOnboarding() {
    let app = launchApp(
      arguments: Self.defaultLaunchArguments + [
        "-FORGEUITestingCorruptPrivateState"
      ]
    )

    waitForElement(element("recovery.screen", in: app))
    let retry = button("recovery.retry", in: app)
    tap(retry)
    waitForElement(element("recovery.screen", in: app))
    waitForHittable(retry)
    revealAndTap(button("recovery.clear-local-data", in: app), in: app)
    let confirmClear = app.buttons["Clear local data"]
    waitForHittable(confirmClear)
    tap(confirmClear)

    waitForElement(element("onboarding.screen", in: app))

    relaunchWithoutReset(
      app,
      clockStart: Self.initialClockStart + Self.secondsPerDay
    )

    waitForElement(element("onboarding.screen", in: app))
    assertDoesNotAppear(element("recovery.screen", in: app))
  }

  func testRecoveryClearCancelPreservesRecoveryAcrossRelaunch() {
    let app = launchApp(
      arguments: Self.defaultLaunchArguments + [
        "-FORGEUITestingCorruptPrivateState"
      ]
    )

    waitForElement(element("recovery.screen", in: app))
    revealAndTap(button("recovery.clear-local-data", in: app), in: app)
    waitForHittable(button("recovery.cancel-clear-local-data", in: app))
    tap(button("recovery.cancel-clear-local-data", in: app))
    waitForHittable(button("recovery.clear-local-data", in: app))

    relaunchWithoutReset(
      app,
      clockStart: Self.initialClockStart + Self.secondsPerDay
    )

    waitForElement(element("recovery.screen", in: app))
    waitForHittable(button("recovery.clear-local-data", in: app))
    assertDoesNotAppear(element("onboarding.screen", in: app))
  }

  private func launchApp(arguments: [String]? = nil) -> XCUIApplication {
    continueAfterFailure = false

    let app = XCUIApplication()
    app.launchArguments = arguments ?? Self.defaultLaunchArguments
    app.launch()
    return app
  }

  private func relaunchWithoutReset(
    _ app: XCUIApplication,
    clockStart: Int
  ) {
    XCTAssertGreaterThan(clockStart, Self.initialClockStart)
    app.terminate()

    var launchArguments = Self.defaultLaunchArguments
    launchArguments.removeAll { $0 == "-FORGEUITestingReset" }

    guard
      let clockArgumentIndex = launchArguments.firstIndex(
        of: "-FORGEUITestingClockStart"
      )
    else {
      XCTFail("The UI test clock argument is not available.")
      return
    }

    let clockValueIndex = launchArguments.index(after: clockArgumentIndex)
    guard clockValueIndex < launchArguments.endIndex else {
      XCTFail("The UI test clock start value is not available.")
      return
    }

    launchArguments[clockValueIndex] = String(clockStart)
    app.launchArguments = launchArguments
    app.launch()
  }

  private func startStarterCourse(in app: XCUIApplication) {
    waitForElement(element("onboarding.screen", in: app))
    tap(button("onboarding.start-course", in: app))
    waitForElement(element("today.course-title", in: app))
  }

  private func openCurrentActivity(in app: XCUIApplication) {
    revealAndTap(button("today.open-activity", in: app), in: app)
    waitForElement(element("activity.screen", in: app))
  }

  private func closeActivity(
    in app: XCUIApplication,
    expectedScreen: XCUIElement
  ) {
    tap(button("activity.close", in: app))
    waitForElement(expectedScreen)
  }

  private func visitMainCourseSurfaces(in app: XCUIApplication) {
    startStarterCourse(in: app)

    revealAndWaitForVisible(
      element("today.boundary-copy-visual", in: app),
      in: app
    )
    openCurrentActivity(in: app)
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )

    tap(app.tabBars.buttons["tab.path"])
    revealAndWaitForVisible(element("path.course-title", in: app), in: app)

    tap(app.tabBars.buttons["tab.evidence"])
    revealAndWaitForVisible(element("evidence.local-boundary", in: app), in: app)

    tap(button("settings.toolbar-button", in: app))
    revealAndWaitForVisible(
      element("settings.reminder-guidance", in: app),
      in: app
    )
    revealAndTap(element("settings.privacy-support", in: app), in: app)
    revealAndWaitForVisible(element("privacy-support.screen", in: app), in: app)
  }

  private func performAccessibilityPreferenceJourney(
    launchArguments: [String]
  ) throws {
    let app = launchApp(arguments: launchArguments)

    startStarterCourse(in: app)
    try performAccessibilitySmokeAudit(in: app)

    openCurrentActivity(in: app)
    try performAccessibilitySmokeAudit(in: app)
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )

    tap(button("settings.toolbar-button", in: app))
    revealAndTap(element("settings.privacy-support", in: app), in: app)
    revealAndWaitForVisible(element("privacy-support.screen", in: app), in: app)

    revealAndTap(button("privacy-support.clear-local-data", in: app), in: app)
    waitForElement(element("privacy-support.clear-local-data-confirmation", in: app))
    try performAccessibilitySmokeAudit(in: app)
    revealAndTap(button("privacy-support.confirm-clear-local-data", in: app), in: app)
    waitForElement(element("onboarding.screen", in: app))
    try performAccessibilitySmokeAudit(in: app)

    app.terminate()
    let recoveryApp = launchApp(
      arguments: launchArguments + ["-FORGEUITestingCorruptPrivateState"]
    )
    revealAndWaitForVisible(element("recovery.screen", in: recoveryApp), in: recoveryApp)
    try performAccessibilitySmokeAudit(in: recoveryApp)

    revealAndTap(button("recovery.clear-local-data", in: recoveryApp), in: recoveryApp)
    waitForHittable(button("recovery.confirm-clear-local-data", in: recoveryApp))
    try performAccessibilitySmokeAudit(in: recoveryApp)
    tap(button("recovery.confirm-clear-local-data", in: recoveryApp))
    waitForElement(element("onboarding.screen", in: recoveryApp))
    try performAccessibilitySmokeAudit(in: recoveryApp)
  }

  private func completeCorrectPractice(in app: XCUIApplication) {
    openCurrentActivity(in: app)
    submitLocalCheck(
      choice: ActivityChoice.practiceCorrect,
      reasoning: "The velocity remains constant after the force is removed.",
      expectedResult: "Recorded local check",
      in: app
    )
    expectActivityType("Independent check", in: app)
  }

  private func createScheduledDelayedReturn(in app: XCUIApplication) {
    completeCorrectPractice(in: app)
    submitLocalCheck(
      choice: ActivityChoice.practiceCorrect,
      reasoning: "The velocity remains constant after the force is removed.",
      expectedResult: "Recorded local check",
      in: app
    )
    expectActivityType("Delayed return", in: app)
    closeActivity(
      in: app,
      expectedScreen: element("today.course-title", in: app)
    )
  }

  private func submitLocalCheck(
    choice: String,
    reasoning: String,
    expectedResult: String,
    in app: XCUIApplication
  ) {
    revealAndTap(button("activity.choice.\(choice)", in: app), in: app)

    let response = app.textFields["activity.response"]
    revealAndTap(response, in: app)
    response.typeText(reasoning)

    let submit = button("activity.submit", in: app)
    waitForEnabled(submit)
    tap(submit)

    let result = element("activity.result", in: app)
    waitForElement(result)
    waitForLabel(result, equalTo: expectedResult)
  }

  private func openRootURL(_ string: String, in app: XCUIApplication) {
    guard let url = URL(string: string) else {
      XCTFail("Invalid root URL: \(string)")
      return
    }

    app.open(url)
  }

  private func expectActivityType(
    _ expectedValue: String,
    in app: XCUIApplication
  ) {
    waitForValue(element("activity.type", in: app), equalTo: expectedValue)
  }

  private func expectReturnStatus(
    _ expectedValue: String,
    in app: XCUIApplication
  ) {
    let returnStatus = element("today.return-status-visual", in: app)
    revealAndWaitForVisible(returnStatus, in: app)
    waitForValue(returnStatus, equalTo: expectedValue)
  }

  private func receipts(in app: XCUIApplication) -> XCUIElementQuery {
    app.descendants(matching: .any).matching(
      NSPredicate(format: "identifier BEGINSWITH %@", "evidence.receipt.")
    )
  }

  private func onlyReceipt(in app: XCUIApplication) -> XCUIElement {
    let localReceipts = receipts(in: app)
    let receipt = localReceipts.firstMatch
    waitForElement(receipt)
    XCTAssertEqual(localReceipts.count, 1, "Expected exactly one local receipt.")
    return receipt
  }

  private func expandedReceiptCheckResult(
    in receipt: XCUIElement,
    app: XCUIApplication
  ) -> String {
    let disclosure = receiptDisclosure(in: receipt, in: app)
    waitForValue(disclosure, equalTo: "Collapsed")
    revealAndTap(disclosure, in: app)
    waitForValue(disclosure, equalTo: "Expanded")

    let scope = metadataRow("Scope", in: receipt)
    waitForValue(scope, equalTo: "Local-only unsigned")
    let checkResult = metadataRow("Check result", in: receipt)
    waitForElement(checkResult)

    guard let value = checkResult.value as? String else {
      XCTFail("Expected a Check result value for the local receipt.")
      return ""
    }
    return value
  }

  private func receiptDisclosure(
    in receipt: XCUIElement,
    in app: XCUIApplication
  ) -> XCUIElement {
    let receiptIdentifierPrefix = "evidence.receipt."
    let disclosureIdentifierPrefix = "evidence.receipt-disclosure."
    let receiptIdentifier = receipt.identifier

    guard receiptIdentifier.hasPrefix(receiptIdentifierPrefix) else {
      XCTFail("Expected a receipt identifier. Found: \(receiptIdentifier)")
      return receipt
    }

    let receiptID = String(
      receiptIdentifier.dropFirst(receiptIdentifierPrefix.count)
    )
    return element("\(disclosureIdentifierPrefix)\(receiptID)", in: app)
  }

  private func metadataRow(
    _ label: String,
    in container: XCUIElement
  ) -> XCUIElement {
    container.descendants(matching: .any).matching(
      NSPredicate(format: "label == %@", label)
    ).firstMatch
  }

  private func element(_ identifier: String, in app: XCUIApplication) -> XCUIElement {
    app.descendants(matching: .any)[identifier]
  }

  private func button(_ identifier: String, in app: XCUIApplication) -> XCUIElement {
    app.buttons[identifier]
  }

  private func discardConfirmation(in app: XCUIApplication) -> XCUIElement {
    let alert = app.alerts.element(boundBy: 0)
    waitForElement(alert)
    waitForLabel(alert, containing: "Discard response?")
    return alert
  }

  private func revealAndWaitForVisible(
    _ element: XCUIElement,
    in app: XCUIApplication
  ) {
    let maximumScrollAttempts = 8

    for attempt in 0...maximumScrollAttempts {
      if hasVisibleFrame(element, in: app) {
        return
      }

      if attempt < maximumScrollAttempts {
        app.swipeUp()
      }
    }

    for attempt in 0...maximumScrollAttempts {
      if hasVisibleFrame(element, in: app) {
        return
      }

      if attempt < maximumScrollAttempts {
        app.swipeDown()
      }
    }

    XCTFail(
      "Expected \(element) to have a visible frame after bounded upward and downward scrolls."
    )
  }

  private func hasVisibleFrame(
    _ element: XCUIElement,
    in app: XCUIApplication
  ) -> Bool {
    guard element.exists else {
      return false
    }

    let elementFrame = element.frame
    let appFrame = app.frame
    return !elementFrame.isEmpty
      && !appFrame.isEmpty
      && elementFrame.intersects(appFrame)
  }

  private func revealAndWaitForHittable(
    _ element: XCUIElement,
    in app: XCUIApplication
  ) {
    let maximumScrollAttempts = 8

    for attempt in 0...maximumScrollAttempts {
      if element.exists, element.isHittable {
        return
      }

      if attempt < maximumScrollAttempts {
        app.swipeUp()
      }
    }

    for attempt in 0...maximumScrollAttempts {
      if element.exists, element.isHittable {
        return
      }

      if attempt < maximumScrollAttempts {
        app.swipeDown()
      }
    }

    XCTFail(
      "Expected \(element) to become hittable after bounded upward and downward scrolls."
    )
  }

  private func revealAndTap(
    _ element: XCUIElement,
    in app: XCUIApplication
  ) {
    revealAndWaitForHittable(element, in: app)
    element.tap()
  }

  private func tap(
    _ element: XCUIElement,
    timeout: TimeInterval = 5,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    waitForHittable(element, timeout: timeout, file: file, line: line)
    element.tap()
  }

  private func waitForHittable(
    _ element: XCUIElement,
    timeout: TimeInterval = 5,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    waitForElement(element, timeout: timeout, file: file, line: line)

    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "isHittable == true"),
      object: element
    )
    XCTAssertEqual(
      XCTWaiter().wait(for: [expectation], timeout: timeout),
      .completed,
      "Expected \(element) to become hittable.",
      file: file,
      line: line
    )
  }

  private func waitForEnabled(
    _ element: XCUIElement,
    timeout: TimeInterval = 5,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    waitForElement(element, timeout: timeout, file: file, line: line)

    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "isEnabled == true"),
      object: element
    )
    XCTAssertEqual(
      XCTWaiter().wait(for: [expectation], timeout: timeout),
      .completed,
      "Expected \(element) to become enabled.",
      file: file,
      line: line
    )
  }

  private func waitForDisabled(
    _ element: XCUIElement,
    timeout: TimeInterval = 5,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    waitForElement(element, timeout: timeout, file: file, line: line)

    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "isEnabled == false"),
      object: element
    )
    XCTAssertEqual(
      XCTWaiter().wait(for: [expectation], timeout: timeout),
      .completed,
      "Expected \(element) to become disabled.",
      file: file,
      line: line
    )
  }

  private func waitForElement(
    _ element: XCUIElement,
    timeout: TimeInterval = 5,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    XCTAssertTrue(
      element.waitForExistence(timeout: timeout),
      "Expected \(element) to exist.",
      file: file,
      line: line
    )
  }

  private func waitForLabel(
    _ element: XCUIElement,
    equalTo label: String,
    timeout: TimeInterval = 5,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    waitForElement(element, timeout: timeout, file: file, line: line)

    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "label == %@", label),
      object: element
    )
    XCTAssertEqual(
      XCTWaiter().wait(for: [expectation], timeout: timeout),
      .completed,
      "Expected \(element) to have label \(label).",
      file: file,
      line: line
    )
  }

  private func waitForLabel(
    _ element: XCUIElement,
    containing text: String,
    timeout: TimeInterval = 5,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    waitForElement(element, timeout: timeout, file: file, line: line)

    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "label CONTAINS %@", text),
      object: element
    )
    XCTAssertEqual(
      XCTWaiter().wait(for: [expectation], timeout: timeout),
      .completed,
      "Expected \(element) to contain \(text).",
      file: file,
      line: line
    )
  }

  private func waitForValue(
    _ element: XCUIElement,
    equalTo value: String,
    timeout: TimeInterval = 5,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    waitForElement(element, timeout: timeout, file: file, line: line)

    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "value == %@", value),
      object: element
    )
    XCTAssertEqual(
      XCTWaiter().wait(for: [expectation], timeout: timeout),
      .completed,
      "Expected \(element) to have value \(value).",
      file: file,
      line: line
    )
  }

  private func assertDoesNotAppear(
    _ element: XCUIElement,
    timeout: TimeInterval = 1,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    XCTAssertFalse(
      element.waitForExistence(timeout: timeout),
      "Expected \(element) to remain absent.",
      file: file,
      line: line
    )
  }

  private func assertNoAccessibleContent(
    containing text: String,
    in app: XCUIApplication,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    let matchingContent = app.descendants(matching: .any).matching(
      NSPredicate(
        format: "label CONTAINS %@ OR value CONTAINS %@",
        text,
        text
      )
    )
    XCTAssertEqual(
      matchingContent.count,
      0,
      "Expected accessible UI to omit the raw response text.",
      file: file,
      line: line
    )
  }

  private func performAccessibilitySmokeAudit(
    in app: XCUIApplication,
    includesDynamicType: Bool = true
  ) throws {
    var auditTypes: XCUIAccessibilityAuditType = [
      .contrast,
      .elementDetection,
      .hitRegion,
      .sufficientElementDescription,
      .textClipped,
      .trait,
    ]

    if includesDynamicType {
      auditTypes.insert(.dynamicType)
    }

    try app.performAccessibilityAudit(for: auditTypes)
  }
}
