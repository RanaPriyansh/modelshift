import Foundation
import Testing

@testable import ForgeCore

struct UniversityStarterCourseTests {
  private static let starterUpdatedAt = Date(timeIntervalSince1970: 1_767_225_600)

  @Test
  func starterCourseValidatesAndUsesIncompleteLocalOnlySource() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let source = try #require(catalog.sourceBindings.first)

    try catalog.validate()

    #expect(UniversityStarterCourse.courseTitle == "Mechanics: Force and motion")
    #expect(
      UniversityStarterCourse.courseSummary
        == "A local-only adult starter course for force and motion."
    )
    #expect(catalog.catalogReleaseID.rawValue == "catalog.adult-mechanics.local-starter.v1")
    #expect(catalog.package.packageID.rawValue == "package.forge.adult-mechanics.local-starter")
    #expect(catalog.capabilities.count == 1)
    #expect(catalog.sourceBindings.count == 1)
    #expect(source.provenance == .provenanceIncomplete)
    #expect(
      catalog.limitations.map(\.kind) == [.provenance, .claimBoundary]
    )
    #expect(
      catalog.limitations.map(\.statement) == [
        "This local-only starter course has incomplete provenance.",
        "This starter course has no university authority and makes no credential, efficacy, mastery, retention, or outcome claim.",
      ]
    )

    let catalogObject =
      try JSONSerialization.jsonObject(
        with: JSONEncoder().encode(catalog)
      ) as? [String: Any]
    let sourceObject = try #require(
      (catalogObject?["sourceBindings"] as? [[String: Any]])?.first
    )
    #expect(Set(sourceObject.keys) == ["id", "courseID", "title", "provenance"])
  }

  @Test
  func starterCourseRoundTripsThroughValidatedDecoding() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let state = try UniversityStarterCourse.initialState(updatedAt: Self.starterUpdatedAt)
    let decodedCatalog = try UniversityLearningData.decode(
      ReleasedCatalogSnapshot.self,
      from: JSONEncoder().encode(catalog)
    )
    let decodedState = try UniversityLearningData.decode(
      LocalLearnerState.self,
      from: JSONEncoder().encode(state)
    )

    #expect(decodedCatalog == catalog)
    #expect(decodedState == state)
    try decodedState.validate(against: decodedCatalog)
  }

  @Test
  func starterCourseUsesExactPracticeProofAndReturnBoundaries() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let practice = try #require(catalog.activities.first(where: { $0.kind == .practice }))
    let proof = try #require(catalog.activities.first(where: { $0.kind == .proof }))
    let delayedReturn = try #require(
      catalog.activities.first(where: { $0.kind == .delayedReturn })
    )

    #expect(catalog.activities.count == 3)
    #expect(practice.prerequisiteActivityIDs.isEmpty)
    #expect(proof.prerequisiteActivityIDs == [practice.id])
    #expect(delayedReturn.prerequisiteActivityIDs.isEmpty)
    #expect(proof.returnPolicy?.delayedReturnActivityID == delayedReturn.id)
    #expect(proof.returnPolicy?.openDelay == 7.0 * 86_400)
    #expect(proof.returnPolicy?.dueWindow == 30.0 * 86_400)
    #expect(
      catalog.activities.filter { $0.returnPolicy != nil }.map(\.id) == [proof.id]
    )
    #expect(proof.taskFamilyID != delayedReturn.taskFamilyID)
    #expect(proof.validatorID == .forceMotionTransferV1)
    #expect(delayedReturn.validatorID == .forceMotionDelayedReturnV1)
    #expect(
      practice.prompt
        == "On a frictionless surface, during the interval after a constant force is removed, which velocity result follows?"
    )
    #expect(
      proof.prompt
        == "On a frictionless surface in an unfamiliar mechanics case, during the interval after a constant force is removed, which velocity result follows?"
    )
    #expect(practice.choices == ["stays_constant_after_force", "changes_direction"])
    #expect(delayedReturn.choices == ["constant_positive_velocity", "increasing_velocity"])
  }

  @Test
  func starterCourseInitialStateStartsAtPracticeWithoutLocalRecords() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let practice = try #require(catalog.activities.first(where: { $0.kind == .practice }))
    let state = try UniversityStarterCourse.initialState(updatedAt: Self.starterUpdatedAt)

    #expect(state.activeCourseID == catalog.courseID)
    #expect(state.activeActivityID == practice.id)
    #expect(state.progress.isEmpty)
    #expect(state.assistance.isEmpty)
    #expect(state.evidence.isEmpty)
    #expect(state.delayedReturns.isEmpty)
    #expect(state.updatedAt == Self.starterUpdatedAt)
    try state.validate(against: catalog)
  }

  @Test
  func starterCourseInitialStateRejectsNonfiniteDates() {
    for interval in [TimeInterval.infinity, -TimeInterval.infinity, TimeInterval.nan] {
      do {
        _ = try UniversityStarterCourse.initialState(
          updatedAt: Date(timeIntervalSinceReferenceDate: interval)
        )
        Issue.record("Expected a nonfinite starter date to fail")
      } catch let error as UniversityLearningError {
        #expect(error == .invalidDate(path: "starterCourse.initialState.updatedAt"))
      } catch {
        Issue.record("Unexpected error \(error)")
      }
    }
  }

  @Test
  func starterCoursePackageDigestChangesWhenOneCatalogFieldChanges() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let practice = try #require(catalog.activities.first(where: { $0.kind == .practice }))
    let changedPractice = try CatalogActivity(
      id: practice.id,
      courseID: practice.courseID,
      capabilityID: practice.capabilityID,
      taskFamilyID: practice.taskFamilyID,
      kind: practice.kind,
      prompt: practice.prompt + " Select the result for the stated interval.",
      choices: practice.choices,
      sourceBindingIDs: practice.sourceBindingIDs,
      proofClaimID: practice.proofClaimID,
      validatorID: practice.validatorID,
      prerequisiteActivityIDs: practice.prerequisiteActivityIDs,
      aiBoundary: practice.aiBoundary,
      returnPolicy: practice.returnPolicy
    )
    let changedCatalog = try ReleasedCatalogSnapshot(
      catalogReleaseID: catalog.catalogReleaseID,
      package: catalog.package,
      courseID: catalog.courseID,
      capabilities: catalog.capabilities,
      activities: catalog.activities.map { activity in
        activity.id == changedPractice.id ? changedPractice : activity
      },
      sourceBindings: catalog.sourceBindings,
      proofClaimIDs: catalog.proofClaimIDs,
      limitations: catalog.limitations
    )

    #expect(
      catalog.package.digest.hex
        == "cfd71c2bd907def9b472c0d45f5b206d9725cdb2ba148a9d9d2f85287d656cf6"
    )
    #expect(UniversityStarterCourse.packageDigest(for: catalog) == catalog.package.digest)
    #expect(UniversityStarterCourse.packageDigest(for: changedCatalog) != catalog.package.digest)
  }

  @Test
  func starterCourseChoiceLabelsUseAdultCopy() {
    #expect(
      UniversityStarterCourse.choiceLabel(for: "stays_constant_after_force")
        == "Velocity stays constant after the force is removed."
    )
    #expect(
      UniversityStarterCourse.choiceLabel(for: "changes_direction")
        == "Velocity changes direction after the force is removed."
    )
    #expect(
      UniversityStarterCourse.choiceLabel(for: "constant_positive_velocity")
        == "Velocity remains constant and positive."
    )
    #expect(
      UniversityStarterCourse.choiceLabel(for: "increasing_velocity")
        == "Velocity continues to increase."
    )
    #expect(
      UniversityStarterCourse.choiceLabel(for: "unknown") == "No choice label is available."
    )
  }

  @Test
  func productionSourceDoesNotContainOldStarterName() throws {
    let testFileURL = URL(fileURLWithPath: #filePath)
    let sourcesURL =
      testFileURL
      .deletingLastPathComponent()
      .deletingLastPathComponent()
      .deletingLastPathComponent()
      .appendingPathComponent("Sources/ForgeCore")
    let sourceURLs = try FileManager.default.contentsOfDirectory(
      at: sourcesURL,
      includingPropertiesForKeys: nil
    )
    let prohibitedWord = "fixture"

    for sourceURL in sourceURLs where sourceURL.pathExtension == "swift" {
      let source = try String(contentsOf: sourceURL, encoding: .utf8)
      #expect(
        !source.localizedCaseInsensitiveContains(prohibitedWord),
        "Production source contains the old starter name: \(sourceURL.lastPathComponent)"
      )
    }
  }
}
