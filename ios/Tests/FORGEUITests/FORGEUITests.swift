import Foundation
import XCTest

@MainActor
final class FORGEUITests: XCTestCase {
  private static let defaultClockStart = 1_700_000_000
  private static let delayedReturnClockStart = 2_000_000_000
  private static let secondsPerDay = 86_400

  func testOnboardingRequiresNameAndCreatesOneSemesterDeskAfterRapidTaps() {
    let app = launchApp()

    waitForElement(element("onboarding.screen", in: app))
    let create = button("onboarding.create-semester-desk", in: app)
    waitForDisabled(create)

    enter("Autumn 2026", into: textField("onboarding.semester-name", in: app), in: app)
    waitForEnabled(create)
    rapidlyTap(create)

    let semesterName = element("today.semester-name", in: app)
    waitForElement(semesterName)
    waitForLabel(semesterName, equalTo: "Autumn 2026")
    assertDoesNotAppear(element("onboarding.screen", in: app))
  }

  func testSemesterTruthCapacityRecoveryAndNextActionFlow() {
    let app = launchApp()

    createSemesterDesk(named: "Autumn 2026", in: app)
    openSemester(in: app)
    addCourse(code: "CS101", title: "Algorithms", in: app)
    addCheckedFact(
      label: "Exam date",
      value: "12 May",
      source: "Course outline",
      in: app
    )
    addCheckedFact(
      label: "Exam date",
      value: "19 May",
      source: "Latest course message",
      in: app
    )
    recordOpenConflict(
      summary: "The two listed exam dates do not match.",
      in: app
    )
    confirmCapacity(in: app)
    addPlannedWork(named: "Work through graph proofs", in: app)

    XCTAssertEqual(
      buttons(withIdentifierPrefix: "semester.choose.", in: app).count,
      0,
      "An open fact conflict must block next-action selection."
    )

    revealAndTapVisibleConflictResolution(in: app)
    waitForElement(firstButton(withIdentifierPrefix: "semester.choose.", in: app))
    assertDoesNotAppear(app.navigationBars["Change Fact Status"])

    prepareAndConfirmRecovery(in: app)

    let choose = firstButton(withIdentifierPrefix: "semester.choose.", in: app)
    revealAndTapSemesterListAction(choose, in: app)
    openToday(in: app)
    waitForLabel(
      element("today.primary-heading", in: app),
      containing: "Ready to work on"
    )
    waitForHittable(button("today.primary-button", in: app))
  }

  func testProtectedStudyCompletesDelayedReturnAndRecordsAnswerFreeProgress() {
    let app = launchApp(clockStart: Self.defaultClockStart)

    createSelectedPlan(named: "Explain shortest paths", in: app)
    openProtectedStudy(in: app)

    enter(
      "I used the invariant before each relaxation step.",
      into: textView("study.practice-text", in: app),
      in: app
    )
    revealAndTap(button("study.practice-complete", in: app), in: app)
    waitForElement(textView("study.independent-text", in: app))

    enter(
      "Each relaxation can improve a path estimate until no shorter edge remains.",
      into: textView("study.independent-text", in: app),
      in: app
    )
    revealAndTap(button("study.independent-demonstrated", in: app), in: app)
    waitForElement(element("study.return-date", in: app))
    let selectedReturnDate = element("study.selected-return-date", in: app)
    waitForElement(selectedReturnDate)
    let selectedReturnDateLabel = selectedReturnDate.label
    XCTAssertFalse(selectedReturnDateLabel.isEmpty)

    let saveReturnDate = button("study.save-return-date", in: app)
    revealAndWaitForHittable(saveReturnDate, in: app)
    waitForEnabled(saveReturnDate)
    tap(saveReturnDate)

    waitForElement(element("today.primary-heading", in: app))
    waitForLabel(
      element("today.primary-heading", in: app),
      containing: "Come back on this date"
    )
    waitForDisabled(button("today.primary-button", in: app))

    tap(button("settings.toolbar-button", in: app))
    waitForElement(element("semester-settings.screen", in: app))
    waitForElement(
      accessibleElement(containing: selectedReturnDateLabel, in: app)
    )
    openToday(in: app)

    relaunchWithoutReset(app, clockStart: Self.delayedReturnClockStart)
    waitForElement(element("today.semester-name", in: app))
    waitForEnabled(button("today.primary-button", in: app))
    openProtectedStudy(in: app)
    let delayedReturnText = textView("study.delayed-return-text", in: app)
    waitForElement(delayedReturnText)
    enter(
      "A fresh explanation still follows the reachability invariant.",
      into: delayedReturnText,
      in: app
    )
    revealAndTap(button("study.return-retained", in: app), in: app)
    waitForElement(element("today.semester-name", in: app))

    openProgress(in: app)
    waitForElement(element("progress.screen", in: app))
    waitForElement(accessibleElement(containing: "Practice completed", in: app))
    waitForElement(accessibleElement(containing: "Independent check completed", in: app))
    waitForElement(accessibleElement(containing: "Delayed return completed", in: app))
    assertNoAccessibleContent(
      containing: "fresh explanation still follows",
      in: app
    )
  }

  func testProtectedStudyCloseKeepsDraftInProcessAndColdRelaunchDropsIt() {
    let app = launchApp(clockStart: Self.defaultClockStart)
    let rawDraft = "Private graph proof draft marker."

    createSelectedPlan(named: "Prove graph reachability", in: app)
    openProtectedStudy(in: app)
    let practiceText = textView("study.practice-text", in: app)
    enter(rawDraft, into: practiceText, in: app)

    tap(button("study.close", in: app))
    let closeAlert = app.alerts["Close protected study?"]
    waitForElement(closeAlert)
    tapProtectedStudyCloseAction(
      identifier: "study.close-keep-draft",
      fallback: closeAlert.buttons["Close and keep for process"],
      in: app
    )
    waitForElement(element("today.semester-name", in: app))

    openProtectedStudy(in: app)
    waitForValue(practiceText, equalTo: rawDraft)

    relaunchWithoutReset(
      app,
      clockStart: Self.defaultClockStart + Self.secondsPerDay
    )
    waitForElement(element("today.semester-name", in: app))
    openProtectedStudy(in: app)
    assertNoAccessibleContent(containing: rawDraft, in: app)
  }

  func testProtectedStudyCloseConfirmationKeepsEditingThenDiscardsPrivateDraft() {
    let app = launchApp(clockStart: Self.defaultClockStart)
    let rawDraft = "Private draft that must stay only in this process."

    createSelectedPlan(named: "Trace graph reachability", in: app)
    openProtectedStudy(in: app)
    let practiceText = textView("study.practice-text", in: app)
    enter(rawDraft, into: practiceText, in: app)

    tap(button("study.close", in: app))
    let closeAlert = app.alerts["Close protected study?"]
    waitForElement(closeAlert)
    waitForElement(accessibleElement(containing: "iOS can remove it when the app closes.", in: app))
    tapProtectedStudyCloseAction(
      identifier: "study.close-keep-editing",
      fallback: closeAlert.buttons["Keep editing"],
      in: app
    )
    waitForElement(element("study.screen", in: app))
    waitForValue(practiceText, equalTo: rawDraft)

    tap(button("study.close", in: app))
    waitForElement(closeAlert)
    tapProtectedStudyCloseAction(
      identifier: "study.close-discard-draft",
      fallback: closeAlert.buttons["Discard and close"],
      in: app
    )
    waitForElement(element("today.semester-name", in: app))

    openProtectedStudy(in: app)
    let restoredPracticeText = textView("study.practice-text", in: app)
    waitForValue(restoredPracticeText, equalTo: "")
    assertNoAccessibleContent(containing: rawDraft, in: app)
  }

  func testProtectedStudyCloseWithoutPrivateDraftDismissesImmediately() {
    let app = launchApp(clockStart: Self.defaultClockStart)

    createSelectedPlan(named: "Check graph reachability", in: app)
    openProtectedStudy(in: app)
    tap(button("study.close", in: app))

    waitForElement(element("today.semester-name", in: app))
    assertDoesNotAppear(app.alerts["Close protected study?"])
  }

  func testRootDeepLinksRouteSemesterDeskSurfaces() {
    let app = launchApp()

    createSemesterDesk(named: "Autumn 2026", in: app)

    openRootURL("forge://semester", in: app)
    waitForElement(element("semester.screen", in: app))

    openRootURL("forge://progress", in: app)
    waitForElement(element("progress.screen", in: app))

    openRootURL("forge://settings", in: app)
    waitForElement(element("semester-settings.screen", in: app))

    openRootURL("forge://today", in: app)
    waitForElement(element("today.semester-name", in: app))
  }

  func testDirtySemesterDeskFormRequiresNativeDiscardConfirmation() {
    let app = launchApp()
    let unsavedCourseCode = "UNSAVED101"

    createSemesterDesk(named: "Autumn 2026", in: app)
    openSemester(in: app)
    revealAndTapSemesterListAction(button("semester.add-course", in: app), in: app)

    let courseCode = textField("course-form.code", in: app)
    enter(unsavedCourseCode, into: courseCode, in: app)

    let close = app.navigationBars.buttons["Close"]
    revealAndTap(close, in: app)

    let discardAlert = app.alerts["Discard unsaved changes?"]
    waitForElement(discardAlert)
    tap(discardAlert.buttons["Keep editing"])
    waitForValue(courseCode, equalTo: unsavedCourseCode)

    revealAndTap(close, in: app)
    waitForElement(discardAlert)
    tap(discardAlert.buttons["Discard changes"])
    waitForElement(element("semester.screen", in: app))
    assertDoesNotAppear(courseCode)
  }

  func testSettingsUsesGenericReminderAndPrivateExportCopy() {
    let app = launchApp()
    let courseTitle = "Private Systems Architecture"
    let planTitle = "Private study plan marker"

    createSemesterDesk(named: "Autumn 2026", in: app)
    openSemester(in: app)
    addCourse(code: "PRIV101", title: courseTitle, in: app)
    confirmCapacity(in: app)
    addPlannedWork(named: planTitle, in: app)

    openRootURL("forge://settings", in: app)
    let settings = element("semester-settings.screen", in: app)
    waitForElement(settings)

    let reminderStatus = settings.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "Reminder status")
    ).firstMatch
    waitForElement(reminderStatus)
    XCTAssertFalse(reminderStatus.label.contains(courseTitle))
    XCTAssertFalse(reminderStatus.label.contains(planTitle))

    let export = button("semester-settings.export", in: app)
    revealAndWaitForHittable(export, in: app)
    XCTAssertEqual(export.label, "Export local Semester Desk JSON")

    let privateContent = settings.descendants(matching: .any).matching(
      NSPredicate(
        format: "label CONTAINS %@ OR value CONTAINS %@ OR label CONTAINS %@ OR value CONTAINS %@",
        courseTitle,
        courseTitle,
        planTitle,
        planTitle
      )
    )
    XCTAssertEqual(privateContent.count, 0)
  }

  func testLocalResetClearsSemesterDeskAcrossColdRelaunch() {
    let app = launchApp()

    createSemesterDesk(named: "Autumn 2026", in: app)
    tap(button("settings.toolbar-button", in: app))
    waitForElement(element("semester-settings.screen", in: app))

    revealAndTap(button("semester-settings.clear-local-data", in: app), in: app)
    let alert = app.alerts["Clear local data?"]
    waitForElement(alert)
    tap(alert.buttons["Clear local data"])
    waitForElement(element("onboarding.screen", in: app))

    relaunchWithoutReset(
      app,
      clockStart: Self.defaultClockStart + Self.secondsPerDay
    )
    waitForElement(element("onboarding.screen", in: app))
    assertDoesNotAppear(element("today.semester-name", in: app))
  }

  func testCorruptPrivateStateRequiresExplicitResetAndStaysCleared() {
    let app = launchApp(
      extraArguments: ["-FORGEUITestingCorruptPrivateState"]
    )

    waitForElement(element("recovery.screen", in: app))
    assertDoesNotAppear(element("onboarding.screen", in: app))

    revealAndTap(button("recovery.clear-local-data", in: app), in: app)
    waitForElement(element("recovery.screen", in: app))
    revealAndTap(app.buttons["Clear local data"], in: app)

    waitForElement(element("onboarding.screen", in: app))
    assertDoesNotAppear(element("recovery.screen", in: app))

    relaunchWithoutReset(
      app,
      clockStart: Self.defaultClockStart + Self.secondsPerDay
    )
    waitForElement(element("onboarding.screen", in: app))
    assertDoesNotAppear(element("recovery.screen", in: app))
    assertDoesNotAppear(element("today.semester-name", in: app))
  }

  func testProtectedStudyDraftSurvivesBackgroundWithoutAccessibleLeak() {
    let app = launchApp(clockStart: Self.defaultClockStart)
    let practiceDraft = "Private practice draft stays in this process."
    let independentDraft = "Private independent draft stays in this process."
    let delayedReturnDraft = "Private delayed return draft stays in this process."

    createSelectedPlan(named: "Explain graph reachability", in: app)
    openProtectedStudy(in: app)
    let practiceText = textView("study.practice-text", in: app)
    enter(practiceDraft, into: practiceText, in: app)
    backgroundAndRestore(
      app,
      rawDraft: practiceDraft,
      field: practiceText
    )

    revealAndTap(button("study.practice-complete", in: app), in: app)
    let independentText = textView("study.independent-text", in: app)
    waitForElement(independentText)
    enter(independentDraft, into: independentText, in: app)
    backgroundAndRestore(
      app,
      rawDraft: independentDraft,
      field: independentText
    )

    revealAndTap(button("study.independent-demonstrated", in: app), in: app)
    waitForElement(element("study.return-date", in: app))
    revealAndTap(button("study.save-return-date", in: app), in: app)
    waitForElement(element("today.semester-name", in: app))

    relaunchWithoutReset(app, clockStart: Self.delayedReturnClockStart)
    waitForEnabled(button("today.primary-button", in: app))
    openProtectedStudy(in: app)
    let delayedReturnText = textView("study.delayed-return-text", in: app)
    waitForElement(delayedReturnText)
    enter(delayedReturnDraft, into: delayedReturnText, in: app)
    backgroundAndRestore(
      app,
      rawDraft: delayedReturnDraft,
      field: delayedReturnText
    )
  }

  func testAccessibilityXXXLKeepsSemesterDeskActionsReachable() throws {
    guard #available(iOS 17.0, *) else {
      return
    }

    let app = launchApp(
      extraArguments: [
        "-UIPreferredContentSizeCategoryName",
        "UICTContentSizeCategoryAccessibilityXXXL",
      ]
    )

    createSemesterDesk(named: "Autumn 2026", in: app)
    openSemester(in: app)
    addCourse(code: "CS101", title: "Algorithms", in: app)

    waitForElement(element("semester.screen", in: app))
    let capacity = button("semester.capacity", in: app)
    revealAndWaitForSemesterListAction(capacity, in: app)
    assertFullyVisible(capacity, in: app)

    openToday(in: app)
    let visibleAction = button("today.primary-button", in: app)
    revealAndWaitForVisibleTodayAction(visibleAction, in: app)
    assertFullyVisible(visibleAction, in: app)
    assertBelowNavigationBar(visibleAction, in: app)
    assertAboveTabBar(visibleAction, in: app)
    recordTodayActionAccessibilityState(
      heading: element("today.primary-heading", in: app),
      reason: element("today.primary-reason", in: app),
      button: visibleAction,
      action: element("today.primary-action", in: app),
      in: app
    )

    try app.performAccessibilityAudit(
      for: [
        .contrast,
        .elementDetection,
        .hitRegion,
        .sufficientElementDescription,
        .textClipped,
        .trait,
      ]
    ) { issue in
      let issueEvidence = XCTAttachment(
        string: """
          Audit type: \(issue.auditType)
          Description: \(issue.compactDescription)
          Detail: \(issue.detailedDescription)
          Element: \(String(describing: issue.element))
          """
      )
      issueEvidence.name = "Accessibility audit issue detail"
      issueEvidence.lifetime = .keepAlways
      XCTContext.runActivity(named: "Record accessibility audit issue") { activity in
        activity.add(issueEvidence)
      }
      return false
    }
  }

  func testSmallDeviceLayoutKeepsCoreSemesterDeskActionsVisible() throws {
    let app = launchApp()
    waitForElement(element("onboarding.screen", in: app))

    guard app.frame.width <= 390 else {
      throw XCTSkip(
        "Run this test with a 390-point or narrower iPhone Simulator destination."
      )
    }

    let create = button("onboarding.create-semester-desk", in: app)
    enter(
      "Autumn 2026",
      into: textField("onboarding.semester-name", in: app),
      in: app
    )
    waitForEnabled(create)
    revealAndWaitForHittable(create, in: app)
    assertFullyVisible(create, in: app)
    tap(create)
    waitForElement(element("today.semester-name", in: app))

    let nextAction = button("today.primary-button", in: app)
    revealAndWaitForAboveTabBar(nextAction, in: app)
    assertFullyVisible(nextAction, in: app)
    assertAboveTabBar(nextAction, in: app)

    openSemester(in: app)
    let addCourse = button("semester.add-course", in: app)
    revealAndWaitForSemesterListAction(addCourse, in: app)
    assertFullyVisible(addCourse, in: app)
  }

  private func launchApp(
    clockStart: Int = defaultClockStart,
    extraArguments: [String] = []
  ) -> XCUIApplication {
    continueAfterFailure = false

    let app = XCUIApplication()
    app.launchArguments = launchArguments(
      clockStart: clockStart,
      resetsState: true,
      extraArguments: extraArguments
    )
    app.launch()
    return app
  }

  private func relaunchWithoutReset(
    _ app: XCUIApplication,
    clockStart: Int
  ) {
    app.terminate()
    app.launchArguments = launchArguments(
      clockStart: clockStart,
      resetsState: false
    )
    app.launch()
  }

  private func launchArguments(
    clockStart: Int,
    resetsState: Bool,
    extraArguments: [String] = []
  ) -> [String] {
    var arguments = ["-FORGEUITestingClockStart", String(clockStart)]
    if resetsState {
      arguments.insert("-FORGEUITestingReset", at: 0)
    }
    arguments.append(contentsOf: extraArguments)
    return arguments
  }

  private func createSemesterDesk(named name: String, in app: XCUIApplication) {
    waitForElement(element("onboarding.screen", in: app))
    enter(name, into: textField("onboarding.semester-name", in: app), in: app)
    revealAndTap(button("onboarding.create-semester-desk", in: app), in: app)
    let semesterName = element("today.semester-name", in: app)
    waitForElement(semesterName)
    waitForLabel(semesterName, equalTo: name)
  }

  private func createSelectedPlan(named title: String, in app: XCUIApplication) {
    createSemesterDesk(named: "Autumn 2026", in: app)
    openSemester(in: app)
    addCourse(code: "CS101", title: "Algorithms", in: app)
    confirmCapacity(in: app)
    addPlannedWork(named: title, in: app)

    let choose = firstButton(withIdentifierPrefix: "semester.choose.", in: app)
    revealAndTapSemesterListAction(choose, in: app)
    openToday(in: app)
    waitForLabel(
      element("today.primary-heading", in: app),
      containing: "Ready to work on"
    )
  }

  private func addCourse(
    code: String,
    title: String,
    in app: XCUIApplication
  ) {
    revealAndTapSemesterListAction(button("semester.add-course", in: app), in: app)
    enter(code, into: textField("course-form.code", in: app), in: app)
    enter(title, into: textField("course-form.title", in: app), in: app)
    revealAndTap(button("course-form.save", in: app), in: app)
    waitForSemesterSheetDismissal(
      textField("course-form.code", in: app),
      in: app
    )
    waitForElement(element("semester.screen", in: app))
  }

  private func addCheckedFact(
    label: String,
    value: String,
    source: String,
    in app: XCUIApplication
  ) {
    revealAndTapSemesterListAction(
      firstButton(withIdentifierPrefix: "semester.add-fact.", in: app),
      in: app
    )
    enter(label, into: textField("fact-form.label", in: app), in: app)
    enter(value, into: textField("fact-form.value", in: app), in: app)
    enter(source, into: textField("fact-form.source", in: app), in: app)
    chooseFactStatus("Checked", in: app)
    revealAndTap(button("fact-form.save", in: app), in: app)
    waitForSemesterSheetDismissal(
      textField("fact-form.label", in: app),
      in: app
    )
    waitForElement(element("semester.screen", in: app))
  }

  private func chooseFactStatus(_ status: String, in app: XCUIApplication) {
    revealAndTap(element("fact-form.status", in: app), in: app)

    let buttonOption = app.buttons[status]
    if buttonOption.waitForExistence(timeout: 1) {
      revealAndTap(buttonOption, in: app)
    } else {
      let cellOption = app.cells.containing(.staticText, identifier: status).firstMatch
      revealAndTap(cellOption, in: app)
    }

    dismissQuickPathTutorialIfPresent(in: app)
  }

  private func dismissQuickPathTutorialIfPresent(in app: XCUIApplication) {
    let hosts = [
      app,
      XCUIApplication(bundleIdentifier: "com.apple.springboard"),
    ]

    for (index, host) in hosts.enumerated() {
      let continueButton = host.buttons["Continue"]
      guard continueButton.waitForExistence(timeout: index == 0 ? 3 : 1) else {
        continue
      }
      waitForHittable(continueButton)
      continueButton.tap()
      assertDoesNotAppear(continueButton)
      return
    }
  }

  private func recordOpenConflict(summary: String, in app: XCUIApplication) {
    revealAndTapSemesterListAction(
      firstButton(withIdentifierPrefix: "semester.record-conflict.", in: app),
      in: app
    )

    let facts = app.switches.matching(
      NSPredicate(format: "identifier BEGINSWITH %@", "conflict-form.fact.")
    )
    waitForElement(facts.firstMatch)
    XCTAssertEqual(facts.count, 2, "Expected exactly two selectable course facts.")
    for index in 0..<2 {
      let fact = facts.element(boundBy: index)
      revealAndWaitForVisible(fact, in: app)
      waitForEnabled(fact)
      fact.coordinate(
        withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)
      ).tap()
      waitForValue(fact, equalTo: "1")
    }

    enter(summary, into: textField("conflict-form.summary", in: app), in: app)
    revealAndTap(button("conflict-form.save", in: app), in: app)
    waitForSemesterSheetDismissal(
      textField("conflict-form.summary", in: app),
      in: app
    )
    waitForElement(element("semester.screen", in: app))
  }

  private func confirmCapacity(in app: XCUIApplication) {
    revealAndTapSemesterListAction(button("semester.capacity", in: app), in: app)
    revealAndTap(button("capacity-form.save-draft", in: app), in: app)
    revealAndTap(button("capacity-form.confirm", in: app), in: app)
    waitForSemesterSheetDismissal(
      textField("capacity-form.minutes", in: app),
      in: app
    )
    waitForElement(element("semester.screen", in: app))
  }

  private func addPlannedWork(named title: String, in app: XCUIApplication) {
    revealAndTapSemesterListAction(
      firstButton(withIdentifierPrefix: "semester.add-plan.", in: app),
      in: app
    )
    enter(title, into: textField("plan-form.title", in: app), in: app)
    revealAndTap(button("plan-form.save", in: app), in: app)
    waitForSemesterSheetDismissal(
      textField("plan-form.title", in: app),
      in: app
    )
    waitForElement(element("semester.screen", in: app))
  }

  private func prepareAndConfirmRecovery(in app: XCUIApplication) {
    revealAndTapSemesterListAction(
      button("semester.prepare-recovery", in: app),
      in: app
    )
    enter(
      "A late course change reduced the available week.",
      into: textField("recovery-form.summary", in: app),
      in: app
    )
    enter(
      "Keep this work because the revised plan remains possible.",
      into: firstTextField(withIdentifierPrefix: "recovery-form.reason.", in: app),
      in: app
    )
    revealAndTap(button("recovery-form.save", in: app), in: app)
    waitForSemesterSheetDismissal(
      textField("recovery-form.summary", in: app),
      in: app
    )
    waitForElement(element("semester.screen", in: app))

    revealAndTapSemesterListAction(
      button("semester.review-recovery", in: app),
      in: app
    )
    revealAndTap(button("recovery-review.confirm", in: app), in: app)
    waitForSemesterSheetDismissal(
      button("recovery-review.confirm", in: app),
      in: app
    )
    waitForElement(element("semester.screen", in: app))
  }

  private func openToday(in app: XCUIApplication) {
    let settings = element("semester-settings.screen", in: app)
    if settings.exists {
      tap(app.navigationBars.buttons["Today"])
      waitForElement(element("today.semester-name", in: app))
    }
    tap(tab("tab.today", in: app))
    waitForElement(element("today.semester-name", in: app))
  }

  private func openSemester(in app: XCUIApplication) {
    tap(tab("tab.semester", in: app))
    waitForElement(element("semester.screen", in: app))
  }

  private func openProgress(in app: XCUIApplication) {
    tap(tab("tab.progress", in: app))
    waitForElement(element("progress.screen", in: app))
  }

  private func openProtectedStudy(in app: XCUIApplication) {
    revealAndTap(button("today.primary-button", in: app), in: app)
    waitForElement(element("study.screen", in: app))
  }

  private func openRootURL(_ string: String, in app: XCUIApplication) {
    guard let url = URL(string: string) else {
      XCTFail("Invalid root URL: \(string)")
      return
    }

    app.launchArguments = launchArguments(
      clockStart: Self.defaultClockStart,
      resetsState: false
    )
    app.open(url)
  }

  private func enter(
    _ text: String,
    into field: XCUIElement,
    in app: XCUIApplication
  ) {
    revealAndTap(field, in: app)
    field.typeText(text)
  }

  private func rapidlyTap(_ element: XCUIElement) {
    waitForHittable(element)
    let coordinate = element.coordinate(
      withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)
    )
    coordinate.doubleTap()
  }

  private func backgroundAndRestore(
    _ app: XCUIApplication,
    rawDraft: String,
    field: XCUIElement
  ) {
    XCUIDevice.shared.press(.home)
    waitForBackground(app)

    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    assertNoAccessibleContent(containing: rawDraft, in: springboard)

    let privacyCovers = app.descendants(matching: .any).matching(
      identifier: "privacy.cover"
    )
    let privacyCover = privacyCovers.firstMatch
    XCTAssertTrue(privacyCover.waitForExistence(timeout: 2))
    XCTAssertGreaterThanOrEqual(privacyCovers.count, 1)
    XCTAssertEqual(
      privacyCover.label,
      "FORGE is private while the app is not active."
    )
    assertNoAccessibleContent(containing: rawDraft, in: app)

    app.activate()
    waitForElement(element("study.screen", in: app))
    waitForValue(field, equalTo: rawDraft)
  }

  private func waitForBackground(
    _ app: XCUIApplication,
    timeout: TimeInterval = 5,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate(
        format: "state != %d",
        XCUIApplication.State.runningForeground.rawValue
      ),
      object: app
    )
    XCTAssertEqual(
      XCTWaiter().wait(for: [expectation], timeout: timeout),
      .completed,
      "Expected FORGE to enter the background.",
      file: file,
      line: line
    )
  }

  private func tapProtectedStudyCloseAction(
    identifier: String,
    fallback: XCUIElement,
    in app: XCUIApplication
  ) {
    let identifiedAction = button(identifier, in: app)
    if identifiedAction.waitForExistence(timeout: 1) {
      tap(identifiedAction)
      return
    }

    tap(fallback)
  }

  private func tab(_ identifier: String, in app: XCUIApplication) -> XCUIElement {
    app.tabBars.buttons[identifier]
  }

  private func textField(_ identifier: String, in app: XCUIApplication) -> XCUIElement {
    app.textFields[identifier]
  }

  private func textView(_ identifier: String, in app: XCUIApplication) -> XCUIElement {
    app.textViews[identifier]
  }

  private func element(_ identifier: String, in app: XCUIApplication) -> XCUIElement {
    app.descendants(matching: .any)[identifier]
  }

  private func button(_ identifier: String, in app: XCUIApplication) -> XCUIElement {
    app.buttons[identifier]
  }

  private func buttons(
    withIdentifierPrefix prefix: String,
    in app: XCUIApplication
  ) -> XCUIElementQuery {
    app.buttons.matching(
      NSPredicate(format: "identifier BEGINSWITH %@", prefix)
    )
  }

  private func firstButton(
    withIdentifierPrefix prefix: String,
    in app: XCUIApplication
  ) -> XCUIElement {
    buttons(withIdentifierPrefix: prefix, in: app).firstMatch
  }

  private func firstTextField(
    withIdentifierPrefix prefix: String,
    in app: XCUIApplication
  ) -> XCUIElement {
    app.textFields.matching(
      NSPredicate(format: "identifier BEGINSWITH %@", prefix)
    ).firstMatch
  }

  private func accessibleElement(
    containing label: String,
    in app: XCUIApplication
  ) -> XCUIElement {
    app.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", label)
    ).firstMatch
  }

  private func revealAndWaitForVisible(
    _ element: XCUIElement,
    in app: XCUIApplication
  ) {
    let maximumScrollAttempts = 10

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

    XCTFail("Expected \(element) to have a visible frame after bounded scrolling.")
  }

  private func revealAndWaitForHittable(
    _ element: XCUIElement,
    in app: XCUIApplication
  ) {
    let maximumScrollAttempts = 10

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

    XCTFail("Expected \(element) to become hittable after bounded scrolling.")
  }

  private func revealAndWaitForSemesterListAction(
    _ element: XCUIElement,
    in app: XCUIApplication
  ) {
    revealWithinSemesterList(element, in: app)
    waitForEnabled(element)
  }

  private func revealAndTapSemesterListAction(
    _ element: XCUIElement,
    in app: XCUIApplication
  ) {
    revealAndWaitForSemesterListAction(element, in: app)
    element.coordinate(
      withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)
    ).tap()
  }

  private func revealAndTapVisibleConflictResolution(in app: XCUIApplication) {
    let semanticAction = firstButton(
      withIdentifierPrefix: "semester.resolve-conflict.",
      in: app
    )
    revealWithinSemesterList(semanticAction, in: app)
    waitForHittable(semanticAction)
    semanticAction.tap()
  }

  private func revealWithinSemesterList(
    _ element: XCUIElement,
    in app: XCUIApplication
  ) {
    let semesterList = app.descendants(matching: .any)["semester.screen"]
    waitForElement(semesterList)
    let maximumScrollAttempts = 10

    for attempt in 0...maximumScrollAttempts {
      if hasVisibleFrame(element, in: app) {
        return
      }
      if attempt < maximumScrollAttempts {
        semesterList.swipeUp()
      }
    }

    for attempt in 0...maximumScrollAttempts {
      if hasVisibleFrame(element, in: app) {
        return
      }
      if attempt < maximumScrollAttempts {
        semesterList.swipeDown()
      }
    }

    XCTFail(
      "Expected \(element) to have a visible frame after scrolling the Semester List."
    )
  }

  private func revealAndWaitForAboveTabBar(
    _ element: XCUIElement,
    in app: XCUIApplication,
    spacing: CGFloat = 16
  ) {
    let tabBar = app.tabBars.firstMatch
    waitForElement(tabBar)
    let maximumScrollAttempts = 10

    for attempt in 0...maximumScrollAttempts {
      if isAboveTabBar(element, tabBar: tabBar, spacing: spacing) {
        return
      }
      if attempt < maximumScrollAttempts {
        app.swipeUp()
      }
    }

    XCTFail(
      "Expected \(element) to end at least \(spacing) points above the tab bar after bounded scrolling."
    )
  }

  private func revealAndWaitForVisibleTodayAction(
    _ element: XCUIElement,
    in app: XCUIApplication,
    spacing: CGFloat = 16
  ) {
    let navigationBar = app.navigationBars.firstMatch
    let tabBar = app.tabBars.firstMatch
    waitForElement(navigationBar)
    waitForElement(tabBar)
    let maximumScrollAttempts = 10

    for attempt in 0...maximumScrollAttempts {
      if isBetweenNavigationAndTabBar(
        element,
        navigationBar: navigationBar,
        tabBar: tabBar,
        spacing: spacing
      ) {
        return
      }

      if attempt < maximumScrollAttempts {
        if element.frame.minY < navigationBar.frame.maxY + spacing {
          app.swipeDown()
        } else {
          app.swipeUp()
        }
      }
    }

    XCTFail(
      "Expected \(element) to stay between the navigation bar and tab bar after bounded scrolling."
    )
  }

  private func revealAndTap(_ element: XCUIElement, in app: XCUIApplication) {
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

  private func waitForSemesterSheetDismissal(
    _ formElement: XCUIElement,
    in app: XCUIApplication,
    timeout: TimeInterval = 5,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "exists == false"),
      object: formElement
    )
    XCTAssertEqual(
      XCTWaiter().wait(for: [expectation], timeout: timeout),
      .completed,
      "Expected the saved Semester form to dismiss.",
      file: file,
      line: line
    )
    waitForElement(element("semester.screen", in: app), file: file, line: line)
  }

  private func assertNoAccessibleContent(
    containing text: String,
    in app: XCUIApplication,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    let matchingContent = app.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@ OR value CONTAINS %@", text, text)
    )
    XCTAssertEqual(
      matchingContent.count,
      0,
      "Expected accessible UI to omit raw study text.",
      file: file,
      line: line
    )
  }

  private func assertFullyVisible(
    _ element: XCUIElement,
    in app: XCUIApplication,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    revealAndWaitForVisible(element, in: app)
    let elementFrame = element.frame
    let appFrame = app.frame

    XCTAssertGreaterThanOrEqual(
      elementFrame.minX,
      appFrame.minX,
      "Expected \(element) to stay inside the leading app edge.",
      file: file,
      line: line
    )
    XCTAssertLessThanOrEqual(
      elementFrame.maxX,
      appFrame.maxX,
      "Expected \(element) to stay inside the trailing app edge.",
      file: file,
      line: line
    )
    XCTAssertGreaterThanOrEqual(
      elementFrame.minY,
      appFrame.minY,
      "Expected \(element) to stay inside the top app edge.",
      file: file,
      line: line
    )
    XCTAssertLessThanOrEqual(
      elementFrame.maxY,
      appFrame.maxY,
      "Expected \(element) to stay inside the bottom app edge.",
      file: file,
      line: line
    )
  }

  private func assertAboveTabBar(
    _ element: XCUIElement,
    in app: XCUIApplication,
    spacing: CGFloat = 16,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    let tabBar = app.tabBars.firstMatch
    waitForElement(tabBar, file: file, line: line)
    let frameEvidence = XCTAttachment(
      string: """
        App frame: \(app.frame)
        Today primary action frame: \(element.frame)
        Tab bar frame: \(tabBar.frame)
        Required clearance: \(spacing)
        """
    )
    frameEvidence.name = "Today action and tab-bar frames"
    frameEvidence.lifetime = .keepAlways
    XCTContext.runActivity(named: "Record Today action frame") { activity in
      activity.add(frameEvidence)
    }

    XCTAssertLessThanOrEqual(
      element.frame.maxY,
      tabBar.frame.minY - spacing,
      "Expected \(element) to end at least \(spacing) points above the tab bar.",
      file: file,
      line: line
    )
  }

  private func assertBelowNavigationBar(
    _ element: XCUIElement,
    in app: XCUIApplication,
    spacing: CGFloat = 16,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    let navigationBar = app.navigationBars.firstMatch
    waitForElement(navigationBar, file: file, line: line)

    XCTAssertGreaterThanOrEqual(
      element.frame.minY,
      navigationBar.frame.maxY + spacing,
      "Expected \(element) to start at least \(spacing) points below the navigation bar.",
      file: file,
      line: line
    )
  }

  private func recordTodayActionAccessibilityState(
    heading: XCUIElement,
    reason: XCUIElement,
    button: XCUIElement,
    action: XCUIElement,
    in app: XCUIApplication
  ) {
    let frameEvidence = XCTAttachment(
      string: """
        App frame: \(app.frame)
        today.primary-heading frame: \(heading.frame)
        today.primary-reason frame: \(reason.frame)
        today.primary-button frame: \(button.frame)
        today.primary-action frame: \(action.frame)
        Tab bar frame: \(app.tabBars.firstMatch.frame)
        """
    )
    frameEvidence.name = "Today action accessibility frames"
    frameEvidence.lifetime = .keepAlways

    let hierarchyEvidence = XCTAttachment(string: app.debugDescription)
    hierarchyEvidence.name = "Today action accessibility hierarchy"
    hierarchyEvidence.lifetime = .keepAlways

    let screenshotEvidence = XCTAttachment(screenshot: app.screenshot())
    screenshotEvidence.name = "Today action before accessibility audit"
    screenshotEvidence.lifetime = .keepAlways

    XCTContext.runActivity(named: "Record Today action accessibility state") { activity in
      activity.add(frameEvidence)
      activity.add(hierarchyEvidence)
      activity.add(screenshotEvidence)
    }
  }

  private func isAboveTabBar(
    _ element: XCUIElement,
    tabBar: XCUIElement,
    spacing: CGFloat
  ) -> Bool {
    guard element.exists, element.isHittable else {
      return false
    }

    let elementFrame = element.frame
    let tabBarFrame = tabBar.frame
    return !elementFrame.isEmpty
      && !tabBarFrame.isEmpty
      && elementFrame.maxY <= tabBarFrame.minY - spacing
  }

  private func isBetweenNavigationAndTabBar(
    _ element: XCUIElement,
    navigationBar: XCUIElement,
    tabBar: XCUIElement,
    spacing: CGFloat
  ) -> Bool {
    guard element.exists, element.isHittable else {
      return false
    }

    let elementFrame = element.frame
    let navigationBarFrame = navigationBar.frame
    let tabBarFrame = tabBar.frame
    return !elementFrame.isEmpty
      && !navigationBarFrame.isEmpty
      && !tabBarFrame.isEmpty
      && elementFrame.minY >= navigationBarFrame.maxY + spacing
      && elementFrame.maxY <= tabBarFrame.minY - spacing
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
}
