import ForgeCore
import SwiftUI

struct PathView: View {
  @Environment(AppModel.self) private var model

  var body: some View {
    let activityRows = ActivityRowPresentation.makeRows(
      activities: model.catalog.activities,
      capabilities: model.catalog.capabilities,
      learnerState: model.learnerState,
      experience: model.experience
    )
    let currentActivity = activityRows.first { $0.isCurrent }
    let canPresentCurrentActivity = model.canPresentCurrentActivity

    ScrollView {
      LazyVStack(alignment: .leading, spacing: 0) {
        courseHeader
          .padding(.bottom, ForgeDesign.Spacing.large)

        if let currentActivity {
          currentActivityAction(
            for: currentActivity,
            canPresentCurrentActivity: canPresentCurrentActivity
          )
          .padding(.bottom, ForgeDesign.Spacing.large)
        }

        UniversitySectionLabel(title: "Catalog activities")
          .padding(.bottom, ForgeDesign.Spacing.small)

        ForEach(activityRows) { row in
          UniversityActivityTimelineRow(
            activity: row.activity,
            capabilityTitle: row.capabilityTitle,
            progress: row.progress,
            statuses: row.statuses,
            prerequisites: row.prerequisites,
            isCurrent: row.isCurrent,
            isEmphasized: row.isEmphasized,
            showsConnector: row.id != activityRows.last?.id
          )
        }

        limitationSection
          .padding(.top, ForgeDesign.Spacing.large)
      }
      .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .padding(.vertical, ForgeDesign.Spacing.large)
      .frame(maxWidth: .infinity)
    }
    .background(ForgeDesign.canvas)
    .navigationTitle("Path")
  }

  private var courseHeader: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
        Text(model.courseTitle)
          .font(.title2.weight(.bold))
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)
          .accessibilityIdentifier("path.course-title")
      }
    }
  }

  private func currentActivityAction(
    for activity: ActivityRowPresentation,
    canPresentCurrentActivity: Bool
  ) -> some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
        Text("Current activity")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(ForgeDesign.navigationCommitment)
          .accessibilityAddTraits(.isHeader)

        Text(activity.activity.prompt)
          .font(.title3.weight(.semibold))
          .fixedSize(horizontal: false, vertical: true)

        Button(action: { model.presentActivity() }) {
          Label("Open current activity", systemImage: "arrow.right.circle.fill")
            .frame(maxWidth: .infinity, minHeight: 44)
            .fixedSize(horizontal: false, vertical: true)
        }
        .buttonStyle(ForgeCommitmentButtonStyle())
        .disabled(!canPresentCurrentActivity)
        .accessibilityHint(
          canPresentCurrentActivity
            ? "Enabled. Opens the current local activity."
            : "Disabled. The current local activity cannot open."
        )
        .accessibilityIdentifier("path.open-current")

        if let disabledReason = currentActivityDisabledReason(
          for: activity.activity,
          canPresentCurrentActivity: canPresentCurrentActivity
        ) {
          Text(disabledReason)
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityIdentifier("path.current-activity-reason")
        }
      }
    }
  }

  private func currentActivityDisabledReason(
    for activity: CatalogActivity,
    canPresentCurrentActivity: Bool
  ) -> String? {
    guard !canPresentCurrentActivity else {
      return nil
    }

    guard activity.kind == .delayedReturn else {
      return "Current activity data is unavailable."
    }

    guard let status = model.currentDelayedReturn?.status else {
      return "Delayed return data is unavailable."
    }

    switch status {
    case .scheduled:
      return "This delayed return is not open yet."
    case .expired:
      return "This delayed return window is closed."
    case .completed:
      return "This delayed return is complete."
    case .open, .due:
      return "Current activity data is unavailable."
    }
  }

  private var limitationSection: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
        UniversitySectionLabel(title: "Package limitations")

        ForEach(model.catalog.limitations, id: \.id) { limitation in
          VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
            Text(limitationTitle(for: limitation.kind))
              .font(.subheadline.weight(.semibold))
              .fixedSize(horizontal: false, vertical: true)

            Text(limitationSummary(for: limitation.kind))
              .font(.subheadline)
              .foregroundStyle(Color.secondary)
              .fixedSize(horizontal: false, vertical: true)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
      }
    }
  }

  private func limitationSummary(for kind: LimitationKind) -> String {
    switch kind {
    case .provenance:
      "Source provenance is incomplete."
    case .claimBoundary:
      "This local package does not establish outcome claims."
    }
  }

  private func limitationTitle(for kind: LimitationKind) -> String {
    switch kind {
    case .provenance:
      "Source provenance"
    case .claimBoundary:
      "Claim boundary"
    }
  }
}

private struct ActivityRowPresentation: Identifiable {
  struct Prerequisite: Identifiable {
    let id: ActivityID
    let title: String
  }

  let activity: CatalogActivity
  let capabilityTitle: String
  let progress: LocalActivityProgress?
  let statuses: [ActivityObservation]
  let prerequisites: [Prerequisite]
  let isCurrent: Bool
  let isEmphasized: Bool

  var id: ActivityID {
    activity.id
  }

  static func makeRows(
    activities: [CatalogActivity],
    capabilities: [CatalogCapability],
    learnerState: LocalLearnerState,
    experience: UniversityExperienceProjection.Projection?
  ) -> [Self] {
    var activityTitles = [ActivityID: String]()
    activityTitles.reserveCapacity(activities.count)
    for activity in activities where activityTitles[activity.id] == nil {
      activityTitles[activity.id] = activity.prompt
    }

    var capabilityTitles = [CapabilityID: String]()
    capabilityTitles.reserveCapacity(capabilities.count)
    for capability in capabilities where capabilityTitles[capability.id] == nil {
      capabilityTitles[capability.id] = capability.title
    }

    var progressByActivity = [ActivityID: LocalActivityProgress]()
    progressByActivity.reserveCapacity(learnerState.progress.count)
    for progress in learnerState.progress where progressByActivity[progress.activityID] == nil {
      progressByActivity[progress.activityID] = progress
    }

    var latestEvidenceByActivity = [ActivityID: LocalEvidenceReceipt]()
    latestEvidenceByActivity.reserveCapacity(learnerState.evidence.count)
    for receipt in learnerState.evidence {
      guard let latestReceipt = latestEvidenceByActivity[receipt.activityID] else {
        latestEvidenceByActivity[receipt.activityID] = receipt
        continue
      }

      if receipt.recordedAt > latestReceipt.recordedAt
        || (receipt.recordedAt == latestReceipt.recordedAt
          && receipt.id.rawValue < latestReceipt.id.rawValue)
      {
        latestEvidenceByActivity[receipt.activityID] = receipt
      }
    }

    var delayedReturnStatusesByActivity = [ActivityID: [ActivityObservation]]()
    if let experience {
      for delayedReturn in experience.delayedReturns {
        delayedReturnStatusesByActivity[delayedReturn.activityID, default: []].append(
          delayedReturnObservation(for: delayedReturn.status)
        )
      }
    } else {
      for delayedReturn in learnerState.delayedReturns where delayedReturn.completedAt != nil {
        delayedReturnStatusesByActivity[delayedReturn.activityID, default: []].append(
          .returnRecorded
        )
      }
    }

    return activities.map { activity in
      let progress = progressByActivity[activity.id]
      let latestEvidence = latestEvidenceByActivity[activity.id]
      let delayedReturnStatuses = delayedReturnStatusesByActivity[activity.id] ?? []
      let isCurrent = learnerState.activeActivityID == activity.id
      let statuses = observations(
        isCurrent: isCurrent,
        latestEvidence: latestEvidence,
        progress: progress,
        delayedReturnStatuses: delayedReturnStatuses
      )
      let prerequisites = activity.prerequisiteActivityIDs.map { identifier in
        Prerequisite(
          id: identifier,
          title: activityTitles[identifier] ?? "Required course activity"
        )
      }

      return Self(
        activity: activity,
        capabilityTitle: capabilityTitles[activity.capabilityID] ?? "Course capability",
        progress: progress,
        statuses: statuses,
        prerequisites: prerequisites,
        isCurrent: isCurrent,
        isEmphasized: isCurrent || statuses.contains(.open)
      )
    }
  }

  private static func observations(
    isCurrent: Bool,
    latestEvidence: LocalEvidenceReceipt?,
    progress: LocalActivityProgress?,
    delayedReturnStatuses: [ActivityObservation]
  ) -> [ActivityObservation] {
    var statuses: [ActivityObservation] = []

    if isCurrent {
      statuses.append(.current)
    }

    if delayedReturnStatuses.isEmpty {
      if let result = latestEvidence?.validatorResult ?? progress?.lastResult {
        statuses.append(
          result == .demonstrated ? .recordedLocalCheck : .checkNotPassed
        )
      } else if !isCurrent {
        statuses.append(.notStarted)
      }
    } else {
      statuses.append(contentsOf: delayedReturnStatuses)
    }

    return statuses.reduce(into: []) { result, status in
      if !result.contains(status) {
        result.append(status)
      }
    }
  }

  private static func delayedReturnObservation(
    for status: DelayedReturnStatus
  ) -> ActivityObservation {
    switch status {
    case .scheduled:
      .scheduled
    case .open, .due:
      .open
    case .expired:
      .windowClosed
    case .completed:
      .returnRecorded
    }
  }
}

private struct UniversityActivityTimelineRow: View {
  let activity: CatalogActivity
  let capabilityTitle: String
  let progress: LocalActivityProgress?
  let statuses: [ActivityObservation]
  let prerequisites: [ActivityRowPresentation.Prerequisite]
  let isCurrent: Bool
  let isEmphasized: Bool
  let showsConnector: Bool

  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.colorSchemeContrast) private var colorSchemeContrast

  var body: some View {
    HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
      progressionMarker
      activityContent
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.vertical, ForgeDesign.Spacing.small)
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("path.activity.\(activity.id.rawValue)")
  }

  private var progressionMarker: some View {
    VStack(spacing: 0) {
      Image(systemName: markerObservation.symbolName)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(
          isEmphasized ? ForgeDesign.navigationCommitment : markerObservation.foreground
        )
        .frame(
          width: ForgeDesign.Spacing.large,
          height: ForgeDesign.Spacing.large
        )
        .accessibilityHidden(true)

      if showsConnector {
        Rectangle()
          .fill(isEmphasized ? ForgeDesign.navigationCommitment : ForgeDesign.hairline)
          .frame(width: 2)
          .frame(maxHeight: .infinity)
          .accessibilityHidden(true)
      }
    }
    .frame(width: ForgeDesign.Spacing.large, alignment: .top)
  }

  private var activityContent: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      activityHeader
      ActivityStatusView(statuses: statuses)
      activityMetadata
      prerequisiteRelationships
    }
    .padding(isEmphasized ? ForgeDesign.Spacing.regular : 0)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background {
      if isEmphasized {
        RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
          .fill(ForgeDesign.navigationCommitmentSurface)
      }
    }
    .overlay {
      if isEmphasized {
        RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
          .stroke(ForgeDesign.navigationCommitment, lineWidth: emphasisBorderWidth)
      }
    }
  }

  private var markerObservation: ActivityObservation {
    if isCurrent {
      return .current
    }

    return statuses.first ?? .notStarted
  }

  private var emphasisBorderWidth: CGFloat {
    colorSchemeContrast == .increased ? 2 : 1
  }

  @ViewBuilder
  private var activityHeader: some View {
    if dynamicTypeSize.isAccessibilitySize {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        kindLabel
        activityTitle
      }
    } else {
      HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
        kindLabel
        activityTitle
      }
    }
  }

  private var kindLabel: some View {
    Label(activityKindTitle, systemImage: activityKindSymbol)
      .font(.caption.weight(.semibold))
      .foregroundStyle(Color.secondary)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityElement(children: .combine)
  }

  private var activityTitle: some View {
    Text(activity.prompt)
      .font(.title3.weight(.semibold))
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .leading)
      .accessibilityAddTraits(.isHeader)
  }

  private var activityMetadata: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      UniversityMetadataRow(label: "Capability", value: capabilityTitle)

      if let progress {
        UniversityMetadataRow(label: "Attempts", value: "\(progress.attempts)")
        UniversityMetadataRow(
          label: "Last recorded",
          value: progress.lastRecordedAt.formatted(date: .abbreviated, time: .shortened)
        )
      }
    }
  }

  private var prerequisiteRelationships: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text("Prerequisites")
        .font(.subheadline.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
        .accessibilityLabel("Prerequisites for \(activity.prompt)")

      if activity.prerequisiteActivityIDs.isEmpty {
        Text("None")
          .font(.subheadline)
          .foregroundStyle(Color.secondary)
      } else {
        ForEach(prerequisites) { prerequisite in
          prerequisiteRow(title: prerequisite.title)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private func prerequisiteRow(title: String) -> some View {
    if dynamicTypeSize.isAccessibilitySize {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        Text("Requires \(title)")
          .font(.subheadline.weight(.medium))
      }
    } else {
      HStack(alignment: .firstTextBaseline, spacing: ForgeDesign.Spacing.small) {
        Image(systemName: "arrow.turn.down.right")
          .foregroundStyle(Color.secondary)
          .accessibilityHidden(true)

        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          Text("Requires \(title)")
            .font(.subheadline.weight(.medium))
        }
      }
    }
  }

  private var activityKindTitle: String {
    switch activity.kind {
    case .practice:
      "Practice"
    case .proof:
      "Independent check"
    case .delayedReturn:
      "Delayed return"
    }
  }

  private var activityKindSymbol: String {
    switch activity.kind {
    case .practice:
      "pencil.line"
    case .proof:
      "doc.text"
    case .delayedReturn:
      "calendar"
    }
  }
}

private struct ActivityStatusView: View {
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  let statuses: [ActivityObservation]

  var body: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          statusRows
        }
      } else {
        HStack(alignment: .firstTextBaseline, spacing: ForgeDesign.Spacing.small) {
          statusRows
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private var statusRows: some View {
    ForEach(statuses, id: \.self) { status in
      Label(status.title, systemImage: status.symbolName)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(status.foreground)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(status.title)
    }
  }
}

private enum ActivityObservation: Hashable {
  case current
  case notStarted
  case recordedLocalCheck
  case checkNotPassed
  case scheduled
  case open
  case windowClosed
  case returnRecorded

  var title: String {
    switch self {
    case .current:
      "Current"
    case .notStarted:
      "Not started"
    case .recordedLocalCheck:
      "Recorded local check"
    case .checkNotPassed:
      "Check not passed"
    case .scheduled:
      "Scheduled"
    case .open:
      "Open"
    case .windowClosed:
      "Window closed"
    case .returnRecorded:
      "Return recorded"
    }
  }

  var symbolName: String {
    switch self {
    case .current:
      "flag.fill"
    case .notStarted:
      "circle"
    case .recordedLocalCheck:
      "checkmark.seal.fill"
    case .checkNotPassed:
      "xmark.octagon.fill"
    case .scheduled:
      "calendar"
    case .open:
      "arrow.right.circle.fill"
    case .windowClosed:
      "lock.fill"
    case .returnRecorded:
      "tray.full.fill"
    }
  }

  var foreground: Color {
    switch self {
    case .current, .open:
      ForgeDesign.navigationCommitment
    case .scheduled, .windowClosed:
      ForgeDesign.caution
    case .recordedLocalCheck, .returnRecorded:
      ForgeDesign.recordedLocalCheck
    case .checkNotPassed:
      ForgeDesign.failedCheck
    case .notStarted:
      ForgeDesign.neutralInformation
    }
  }
}

#Preview {
  NavigationStack {
    PathView()
  }
  .environment(AppModel.preview())
}

#Preview("Path — Accessibility XL") {
  NavigationStack {
    PathView()
  }
  .environment(AppModel.preview())
  .environment(\.dynamicTypeSize, .accessibility3)
}
