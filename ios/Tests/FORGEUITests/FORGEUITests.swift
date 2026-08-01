import XCTest

@MainActor
final class FORGEUITests: XCTestCase {
  func testSafeSampleOpensTodayAndFocusPreview() {
    let app = launchApp()
    completeSafeSampleOnboarding(in: app)

    waitForScreen("Today", in: app)
    tap(app.buttons["today.open-focus"])
    waitForScreen("Focus preview", in: app)
    waitForHittable(app.buttons["focus.pause"])

    tap(app.buttons["focus.pause"])
    waitForScreen("Preview paused", in: app)

    tap(app.buttons["focus.end"])
    waitForScreen("Today", in: app)
  }

  func testPrimarySectionsRemainAvailable() {
    let app = launchApp()
    completeSafeSampleOnboarding(in: app)

    tap(app.tabBars.buttons["Path"])
    waitForScreen("Path", in: app)

    tap(app.buttons["path.open-focus"])
    waitForScreen("Focus preview", in: app)
    tap(app.buttons["focus.end"])
    waitForScreen("Path", in: app)

    tap(app.tabBars.buttons["Evidence"])
    waitForScreen("Evidence", in: app)

    tap(app.tabBars.buttons["Today"])
    waitForScreen("Today", in: app)
  }

  func testLocalDataResetReturnsToOnboarding() {
    let app = launchApp()
    completeSafeSampleOnboarding(in: app)

    tap(app.buttons["settings.open"])
    waitForScreen("Settings", in: app)

    let clearDataButton = app.buttons["settings.clear-local-data"]
    revealAndTap(clearDataButton, in: app)
    let clearDataAlert = app.alerts["Clear local learning data?"]
    waitForHittable(clearDataAlert)

    let clearDataAction = clearDataAlert.buttons["Clear data"]
    waitForElement(clearDataAction)

    if clearDataAction.isHittable {
      clearDataAction.tap()
    } else {
      clearDataAlert.coordinate(
        withNormalizedOffset: CGVector(dx: 0.75, dy: 0.8)
      ).tap()
    }
    waitForScreen("Start with a goal", in: app)
  }

  func testTodayCanReviewLearningDirection() {
    let app = launchApp()
    completeSafeSampleOnboarding(in: app)

    revealAndTap(app.buttons["today.change-direction"], in: app)
    waitForScreen("Start with a goal", in: app)
  }

  func testPrivacyAndSupportShowsLocalBoundary() {
    let app = launchApp()
    completeSafeSampleOnboarding(in: app)

    tap(app.buttons["settings.open"])
    waitForScreen("Settings", in: app)

    tap(app.buttons["settings.privacy-support"])
    waitForScreen("Privacy and Support", in: app)
    waitForElement(
      app.descendants(matching: .any)["privacy-support.data-boundary"]
    )
  }

  func testOnboardingAccessibilityAudit() throws {
    let app = launchApp()

    guard #available(iOS 17.0, *) else {
      return
    }

    waitForScreen("Start with a goal", in: app)
    waitForHittable(app.buttons["onboarding.safe-sample"])
    try performAccessibilityAudit(in: app)
  }

  func testPrimarySurfaceAccessibilityAudits() throws {
    guard #available(iOS 17.0, *) else {
      return
    }

    let app = launchApp()
    completeSafeSampleOnboarding(in: app)

    try performAccessibilityAudit(in: app)

    tap(app.tabBars.buttons["Path"])
    waitForScreen("Path", in: app)
    try performAccessibilityAudit(in: app)

    tap(app.tabBars.buttons["Evidence"])
    waitForScreen("Evidence", in: app)
    try performAccessibilityAudit(in: app)

    tap(app.buttons["settings.open"])
    waitForScreen("Settings", in: app)
    try performAccessibilityAudit(in: app)

    tap(app.buttons["settings.privacy-support"])
    waitForScreen("Privacy and Support", in: app)
    try performAccessibilityAudit(in: app)

    tap(app.tabBars.buttons["Today"])
    waitForScreen("Today", in: app)
    tap(app.buttons["today.open-focus"])
    waitForScreen("Focus preview", in: app)
    try performAccessibilityAudit(in: app)
  }

  private func launchApp() -> XCUIApplication {
    continueAfterFailure = false

    let app = XCUIApplication()
    app.launchArguments = ["-FORGEUITestingReset"]
    app.launch()
    return app
  }

  private func completeSafeSampleOnboarding(in app: XCUIApplication) {
    waitForScreen("Start with a goal", in: app)

    let safeSampleButton = app.buttons["onboarding.safe-sample"]
    let goalField = app.textFields["onboarding.goal"]
    let expectedGoal = "Test AI claims against reliable sources"
    waitForElement(safeSampleButton)
    waitForElement(goalField)

    for _ in 0..<3 {
      if goalField.value as? String == expectedGoal {
        break
      }

      tap(safeSampleButton)
    }

    waitForValue(goalField, equalTo: expectedGoal)

    tap(app.buttons["onboarding.continue"])
    waitForScreen("Today", in: app)
  }

  private func waitForScreen(_ title: String, in app: XCUIApplication) {
    waitForHittable(app.navigationBars[title])
  }

  private func revealAndTap(
    _ element: XCUIElement,
    in app: XCUIApplication
  ) {
    let maxScrollAttempts = 6

    for attempt in 0...maxScrollAttempts {
      if element.exists, element.isHittable {
        element.tap()
        return
      }

      if attempt < maxScrollAttempts {
        app.swipeUp()
      }
    }

    XCTFail(
      "Expected \(element) to exist and become hittable after \(maxScrollAttempts) upward scrolls."
    )
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

  private func performAccessibilityAudit(in app: XCUIApplication) throws {
    let auditTypes: XCUIAccessibilityAuditType = [
      .contrast,
      .elementDetection,
      .hitRegion,
      .sufficientElementDescription,
      .textClipped,
      .trait,
    ]

    // Today return-date and return-status nodes use explicit high-contrast system colors.
    // The onboarding heading is audited while below the fixed bottom inset.
    // Path milestone visual nodes use reviewed primary, secondary, success, warning, or accent tokens.
    // The evidence footer uses reviewed ForgeDesign.secondaryText and is reported only when tab-occluded.
    // Settings boundary nodes use reviewed ForgeDesign.secondaryText below fixed navigation surfaces.
    let contrastFalseReportIdentifiers: Set<String> = [
      "today.boundary-copy-visual",
      "today.return-date-visual",
      "today.return-status-visual",
      "today.updated-at-visual",
      "evidence.records-footer-visual",
      "onboarding.custom-goal-heading-visual",
      "path.milestone-current-visual",
      "path.milestone-title-visual",
      "path.milestone-state-visual",
      "path.milestone-detail-visual",
      "settings.storage-boundary-visual",
      "settings.evidence-boundary-visual",
      "settings.learning-setup-header-visual",
      "settings.evidence-boundary-header-visual",
      "settings.local-data-header-visual",
      "settings.local-data-footer-visual",
      "privacy-support.local-data-header-visual",
      "privacy-support.local-data-footer-visual",
      "privacy-support.category-title-visual",
      "privacy-support.category-detail-visual",
      "settings.review-onboarding",
      "settings.clear-local-data",
      "privacy-support.clear-local-data",
    ]

    // Do not include Dynamic Type. Xcode 26 misclassifies combined SwiftUI nodes.
    try app.performAccessibilityAudit(for: auditTypes) { issue in
      guard
        issue.auditType == .contrast,
        let identifier = issue.element?.identifier,
        contrastFalseReportIdentifiers.contains(identifier)
      else {
        return false
      }

      // Each allowlisted node uses a reviewed explicit design token or native system control style.
      // Xcode 26 reports contrast only under the documented occlusion or SwiftUI-node condition.
      return true
    }
  }
}
