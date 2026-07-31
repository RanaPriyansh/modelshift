import XCTest

@MainActor
final class FORGEUITests: XCTestCase {
  func testSafeSampleOpensTodayAndFocusPreview() {
    let app = launchApp()
    completeSafeSampleOnboarding(in: app)

    XCTAssertTrue(app.navigationBars["Today"].waitForExistence(timeout: 5))

    app.buttons["today.open-focus"].tap()

    XCTAssertTrue(app.navigationBars["Focus preview"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.buttons["focus.pause"].exists)

    app.buttons["focus.pause"].tap()
    XCTAssertTrue(app.navigationBars["Preview paused"].waitForExistence(timeout: 2))

    app.buttons["focus.end"].tap()
    XCTAssertTrue(app.navigationBars["Today"].waitForExistence(timeout: 5))
  }

  func testPrimarySectionsRemainAvailable() {
    let app = launchApp()
    completeSafeSampleOnboarding(in: app)

    app.tabBars.buttons["Path"].tap()
    XCTAssertTrue(app.navigationBars["Path"].waitForExistence(timeout: 5))

    app.tabBars.buttons["Evidence"].tap()
    XCTAssertTrue(app.navigationBars["Evidence"].waitForExistence(timeout: 5))

    app.tabBars.buttons["Today"].tap()
    XCTAssertTrue(app.navigationBars["Today"].waitForExistence(timeout: 5))
  }

  func testLocalDataResetReturnsToOnboarding() {
    let app = launchApp()
    completeSafeSampleOnboarding(in: app)

    app.buttons["settings.open"].tap()
    XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))

    app.buttons["settings.clear-local-data"].tap()
    XCTAssertTrue(app.alerts["Clear local learning data?"].waitForExistence(timeout: 2))

    app.alerts.buttons["Clear data"].tap()
    XCTAssertTrue(app.navigationBars["Start with a goal"].waitForExistence(timeout: 5))
  }

  func testOnboardingAccessibilityAudit() throws {
    let app = launchApp()

    guard #available(iOS 17.0, *) else {
      return
    }

    XCTAssertTrue(app.navigationBars["Start with a goal"].waitForExistence(timeout: 5))
    try app.performAccessibilityAudit()
  }

  private func launchApp() -> XCUIApplication {
    continueAfterFailure = false

    let app = XCUIApplication()
    app.launchArguments.append("-FORGEUITestingReset")
    app.launch()
    return app
  }

  private func completeSafeSampleOnboarding(in app: XCUIApplication) {
    XCTAssertTrue(app.navigationBars["Start with a goal"].waitForExistence(timeout: 5))

    app.buttons["onboarding.safe-sample"].tap()

    let goalField = app.textFields["onboarding.goal"]
    XCTAssertEqual(
      goalField.value as? String,
      "Test AI claims against reliable sources"
    )

    app.buttons["onboarding.continue"].tap()
  }
}
