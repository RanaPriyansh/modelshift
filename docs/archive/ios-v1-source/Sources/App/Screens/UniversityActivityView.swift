import ForgeCore
import Foundation
import SwiftUI

@MainActor
struct UniversityActivityView: View {
  private enum FocusField: Hashable {
    case response
  }

  private enum ScrollAnchor: Hashable {
    case choices
    case result
    case response
  }

  private struct SubmissionResult {
    enum Disposition {
      case recorded
      case notPassed
      case notRecorded
    }

    let disposition: Disposition
    let submittedActivityTitle: String
    let submittedActivityPrompt: String
    let message: String

    var title: String {
      switch disposition {
      case .recorded:
        "Recorded local check"
      case .notPassed:
        "Check not passed"
      case .notRecorded:
        "Not recorded"
      }
    }

    var symbolName: String {
      switch disposition {
      case .recorded:
        "checkmark.circle.fill"
      case .notPassed:
        "xmark.octagon.fill"
      case .notRecorded:
        "exclamationmark.triangle.fill"
      }
    }

    var tint: Color {
      switch disposition {
      case .recorded:
        ForgeDesign.recordedLocalCheck
      case .notPassed, .notRecorded:
        ForgeDesign.failedCheck
      }
    }

    var accessibilityDescription: String {
      "Submitted activity: \(submittedActivityTitle). \(submittedActivityPrompt). \(title). \(message)"
    }

    static func defaultMessage(for disposition: Disposition) -> String {
      switch disposition {
      case .recorded:
        "FORGE recorded a local check. Raw text is not stored."
      case .notPassed:
        "FORGE did not record a passing local check. Raw text is not stored."
      case .notRecorded:
        "FORGE did not record this local activity. Raw text is not stored."
      }
    }
  }

  @Environment(AppModel.self) private var model
  @Environment(\.scenePhase) private var scenePhase
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @FocusState private var focusedField: FocusField?
  @ScaledMetric(relativeTo: .body) private var bottomContentClearance: CGFloat = 112

  @State private var responseLimitFeedback: String?
  @State private var submissionResult: SubmissionResult?
  @State private var feedbackAnnouncementSequence = 0
  @State private var isSubmissionRunning = false
  @State private var isDiscardConfirmationPresented = false
  @State private var selectedChoice: String?
  @State private var responseText = ""

  var body: some View {
    NavigationStack {
      ScrollViewReader { scrollProxy in
        ScrollView {
          VStack(alignment: .leading, spacing: 0) {
            if let activity = model.currentActivity {
              if dynamicTypeSize.isAccessibilitySize {
                responseShortcut(using: scrollProxy)
                activitySeparator
              }

              activityHeader(activity)

              if let submissionResult {
                activitySeparator
                resultRow(for: submissionResult)
                  .id(ScrollAnchor.result)
              }

              activitySeparator

              if let delayedReturn = model.currentDelayedReturn {
                delayedReturnRows(delayedReturn)
                activitySeparator
              }

              if model.canPresentCurrentActivity {
                choiceRows(for: activity)
                  .disabled(isActivitySubmissionInProgress || isEvidenceCapacityReached)
                  .id(ScrollAnchor.choices)
                activitySeparator
                responseSection
                  .disabled(isActivitySubmissionInProgress || isEvidenceCapacityReached)
              }

              activitySeparator
              limitationsRows
            } else {
              if let submissionResult {
                resultRow(for: submissionResult)
                  .id(ScrollAnchor.result)
                activitySeparator
              }

              unavailableRow
              activitySeparator
              limitationsRows
            }
          }
          .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
          .padding(.horizontal, ForgeDesign.Spacing.regular)
          .padding(.vertical, ForgeDesign.Spacing.large)
          .frame(maxWidth: .infinity)
        }
        .contentMargins(.bottom, bottomContentClearance, for: .scrollContent)
        .scrollDismissesKeyboard(.interactively)
        .background(ForgeDesign.canvas)
        .navigationTitle("Activity")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
          if model.canPresentCurrentActivity, shouldShowSubmitAction {
            submitAction
          }
        }
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Close", action: closeActivity)
              .frame(minWidth: 44, minHeight: 44)
              .disabled(isActivitySubmissionInProgress)
              .accessibilityHint(
                isActivitySubmissionInProgress
                  ? "This activity stays open until the local result is ready."
                  : hasDraft
                    ? "Shows a confirmation before it discards the selected response and entered reasoning."
                    : "Closes this activity immediately."
              )
              .accessibilityIdentifier("activity.close")
          }

          #if DEBUG
            if ProcessInfo.processInfo.arguments.contains(
              "-FORGEUITestingActivityDraftDismissal"
            ) {
              ToolbarItem(placement: .topBarTrailing) {
                Button("Test route dismissal", action: dismissWithRootRouteForTesting)
                  .accessibilityIdentifier("activity.test-route-dismissal")
              }
            }
          #endif

          ToolbarItemGroup(placement: .keyboard) {
            Spacer()

            Button("Done") {
              focusedField = nil
            }
            .frame(minWidth: 44, minHeight: 44)
            .accessibilityIdentifier("activity.keyboard.done")
          }
        }
        .onChange(of: selectedChoice) { _, selectedChoice in
          guard selectedChoice != nil else {
            return
          }

          scrollResponseIntoView(using: scrollProxy)
        }
        .onChange(of: focusedField) { _, focusedField in
          guard focusedField == .response else {
            return
          }

          scrollResponseIntoView(using: scrollProxy)
        }
        .onChange(of: feedbackAnnouncementSequence) { _, sequence in
          guard sequence > 0 else {
            return
          }

          scrollResultIntoView(using: scrollProxy)
        }
      }
    }
    .interactiveDismissDisabled(isActivitySubmissionInProgress || hasDraft)
    .presentationContentInteraction(.scrolls)
    .alert(
      "Discard response?",
      isPresented: $isDiscardConfirmationPresented
    ) {
      Button("Discard response", role: .destructive) {
        discardAndDismissActivity()
      }
      .accessibilityIdentifier("activity.discard-response")

      Button("Cancel", role: .cancel) {
        focusedField = nil
      }
      .accessibilityIdentifier("activity.cancel-discard-response")
    } message: {
      Text("Discard the selected response and entered reasoning. No local check will be recorded.")
        .accessibilityIdentifier("activity.discard-confirmation")
    }
    .onChange(of: scenePhase) { _, phase in
      if phase == .background {
        clearTransientEntryState()
      }
    }
    .accessibilityIdentifier("activity.screen")
    .transaction { transaction in
      if reduceMotion {
        transaction.animation = nil
        transaction.disablesAnimations = true
      }
    }
    .onChange(of: model.currentActivity?.id) { _, _ in
      submissionResult = nil
      clearTransientEntryState()
      restoreCurrentActivityDraft()
    }
    .onChange(of: model.canPresentCurrentActivity) { _, canPresentCurrentActivity in
      if !canPresentCurrentActivity {
        clearTransientEntryState()
      }
    }
    .onDisappear {
      submissionResult = nil
      clearTransientEntryState()
      clearCurrentEntryState()
    }
    .onAppear(perform: restoreCurrentActivityDraft)
  }

  private func activityHeader(_ activity: CatalogActivity) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      Text(activity.prompt)
        .font(.title2.weight(.bold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)

      UniversityMetadataRow(
        label: "Activity type",
        value: activity.kind.universityActivityTitle
      )
      .accessibilityIdentifier("activity.type")
    }
    .padding(.vertical, ForgeDesign.Spacing.regular)
    .accessibilitySortPriority(100)
  }

  private func responseShortcut(using scrollProxy: ScrollViewProxy) -> some View {
    Button {
      scrollChoicesIntoView(using: scrollProxy)
    } label: {
      Label("Go to response choices", systemImage: "arrow.down")
        .frame(maxWidth: .infinity, minHeight: 48)
    }
    .buttonStyle(ForgeSecondaryButtonStyle())
    .background(
      ForgeDesign.universitySurface,
      in: RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
    )
    .overlay {
      RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
        .stroke(ForgeDesign.universitySurfaceBorder, lineWidth: 1)
    }
    .padding(.vertical, ForgeDesign.Spacing.regular)
    .accessibilityHint("Moves to the response choices for this activity.")
    .accessibilitySortPriority(101)
    .accessibilityIdentifier("activity.go-to-response-choices")
  }

  private func delayedReturnRows(
    _ delayedReturn: UniversityExperienceProjection.DelayedReturnRow
  ) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      UniversitySectionLabel(title: "Return timing")
      UniversityMetadataRow(
        label: "Return status",
        value: delayedReturn.status.universityActivityTitle
      )
      UniversityMetadataRow(
        label: "Opens",
        value: delayedReturn.opensAt.formatted(date: .abbreviated, time: .shortened)
      )
      UniversityMetadataRow(
        label: "Due",
        value: delayedReturn.dueAt.formatted(date: .abbreviated, time: .shortened)
      )
    }
    .padding(.vertical, ForgeDesign.Spacing.regular)
    .accessibilitySortPriority(90)
  }

  private func choiceRows(for activity: CatalogActivity) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Select one response")

      Text("Select a response before you record the local check.")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)

      VStack(spacing: 0) {
        ForEach(activity.choices.indices, id: \.self) { index in
          let choice = activity.choices[index]
          choiceButton(
            choice,
            label: model.choiceLabel(for: choice),
            index: index
          )

          if index < activity.choices.count - 1 {
            Divider()
              .padding(.leading, ForgeDesign.Spacing.regular)
          }
        }
      }
    }
    .padding(.vertical, ForgeDesign.Spacing.regular)
    .accessibilitySortPriority(80)
  }

  private func choiceButton(
    _ choice: String,
    label: String,
    index: Int
  ) -> some View {
    let isSelected = selectedChoice == choice

    return Button {
      selectedChoice = choice
      model.updateCurrentActivityDraft(
        selectedChoice: choice,
        responseText: responseText
      )
      submissionResult = nil
    } label: {
      HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
        Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
          .font(.title3.weight(.semibold))
          .foregroundStyle(
            isSelected ? ForgeDesign.navigationCommitment : ForgeDesign.secondaryText
          )
          .accessibilityHidden(true)

        Text(label)
          .font(.body.weight(.medium))
          .foregroundStyle(Color.primary)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(ForgeDesign.Spacing.regular)
      .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
      .contentShape(Rectangle())
      .background {
        if isSelected {
          RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
            .fill(ForgeDesign.navigationCommitmentSurface)
        }
      }
      .overlay {
        if isSelected {
          RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
            .stroke(ForgeDesign.navigationCommitment, lineWidth: 2)
        }
      }
    }
    .buttonStyle(.plain)
    .accessibilityLabel("Response. \(label)")
    .accessibilityValue(isSelected ? "Selected" : "Not selected")
    .accessibilityHint("Selects this response.")
    .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    .accessibilitySortPriority(79 - Double(index))
    .accessibilityIdentifier("activity.choice.\(choice)")
  }

  private var responseSection: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Your reasoning")

      Text("Write your reasoning in your own words. No AI runs. Raw text is not stored.")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)

      TextField(
        "Write your reasoning",
        text: responseTextBinding,
        axis: .vertical
      )
      .lineLimit(4...8)
      .textInputAutocapitalization(.sentences)
      .submitLabel(.done)
      .focused($focusedField, equals: .response)
      .onSubmit {
        focusedField = nil
      }
      .padding(.vertical, ForgeDesign.Spacing.regular)
      .frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading)
      .overlay(alignment: .bottom) {
        Divider()
      }
      .accessibilityLabel("Reasoning")
      .accessibilityHint("Enter nonblank reasoning. No AI runs. Raw text is not stored.")
      .accessibilityIdentifier("activity.response")

      Text(
        "\(responseByteCount) of \(UniversityLearningLimits.maximumResponseBytes) bytes used"
      )
      .font(.footnote)
      .foregroundStyle(ForgeDesign.secondaryText)
      .accessibilityLabel(
        "Response size. \(responseByteCount) of \(UniversityLearningLimits.maximumResponseBytes) bytes used."
      )

      if let responseLimitFeedback {
        Text(responseLimitFeedback)
          .font(.footnote.weight(.semibold))
          .foregroundStyle(ForgeDesign.failedCheck)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("Response limit reached")
          .accessibilityValue(responseLimitFeedback)
          .accessibilityIdentifier("activity.response-limit")
      }
    }
    .padding(.vertical, ForgeDesign.Spacing.regular)
    .id(ScrollAnchor.response)
    .accessibilitySortPriority(60)
  }

  private var submitAction: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Button(action: submitActivity) {
        HStack(spacing: ForgeDesign.Spacing.small) {
          if isActivitySubmissionInProgress {
            ProgressView()
              .controlSize(.small)
              .accessibilityHidden(true)
          } else {
            Image(systemName: "checkmark.circle")
              .accessibilityHidden(true)
          }

          Text(
            isActivitySubmissionInProgress
              ? "Recording local check\u{2026}"
              : "Record local check"
          )
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .layoutPriority(1)
        }
        .frame(maxWidth: .infinity, minHeight: 48)
        .padding(.vertical, ForgeDesign.Spacing.tight)
      }
      .buttonStyle(ForgeCommitmentButtonStyle())
      .disabled(!canSubmit)
      .accessibilityLabel(
        isActivitySubmissionInProgress ? "Recording local check" : "Record local check"
      )
      .accessibilityValue(isActivitySubmissionInProgress ? "In progress" : "")
      .accessibilityHint(
        isActivitySubmissionInProgress
          ? "FORGE is recording this local check. The activity stays open until the result is ready."
          : isEvidenceCapacityReached
            ? Self.evidenceCapacityFeedbackMessage
            : canSubmit
              ? "Records a local check. No AI runs. Raw text is not stored."
              : "Select one response and enter nonblank reasoning before recording a local check."
      )
      .accessibilitySortPriority(40)
      .accessibilityIdentifier("activity.submit")

      if isActivitySubmissionInProgress {
        HStack(alignment: .firstTextBaseline, spacing: ForgeDesign.Spacing.small) {
          ProgressView()
            .controlSize(.small)
            .accessibilityHidden(true)

          Text("Recording this local check on this device.")
            .font(.footnote.weight(.semibold))
            .foregroundStyle(ForgeDesign.secondaryText)
            .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Recording local check")
        .accessibilityValue("In progress")
        .accessibilityIdentifier("activity.submission-progress")
      }

      if !canSubmit, !isActivitySubmissionInProgress, !isEvidenceCapacityReached {
        Text("Select one response and enter reasoning to continue.")
          .font(.footnote)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
      }

      if isEvidenceCapacityReached {
        Text(Self.evidenceCapacityFeedbackMessage)
          .font(.footnote)
          .foregroundStyle(ForgeDesign.failedCheck)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("Local evidence capacity")
          .accessibilityValue(Self.evidenceCapacityFeedbackMessage)
          .accessibilityIdentifier("activity.evidence-capacity")
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, ForgeDesign.Spacing.regular)
    .padding(.vertical, ForgeDesign.Spacing.small)
    .background(actionBackground)
  }

  private var actionBackground: some View {
    Group {
      if reduceTransparency {
        ForgeDesign.raisedSurface
      } else {
        Rectangle().fill(.bar)
      }
    }
  }

  private func resultRow(for result: SubmissionResult) -> some View {
    HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
      Image(systemName: result.symbolName)
        .font(.title3.weight(.semibold))
        .foregroundStyle(result.tint)
        .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        Text(result.title)
          .font(.headline)
          .foregroundStyle(result.tint)
          .fixedSize(horizontal: false, vertical: true)

        Text("Submitted activity: \(result.submittedActivityTitle)")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(Color.primary)
          .fixedSize(horizontal: false, vertical: true)

        Text(result.submittedActivityPrompt)
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)

        Text(result.message)
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .padding(.vertical, ForgeDesign.Spacing.regular)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(result.title)
    .accessibilityValue(
      "Submitted activity: \(result.submittedActivityTitle). \(result.submittedActivityPrompt). \(result.message)"
    )
    .accessibilityHint("Raw text is not stored.")
    .accessibilitySortPriority(95)
    .accessibilityIdentifier("activity.result")
  }

  private var limitationsRows: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      HStack(alignment: .firstTextBaseline, spacing: ForgeDesign.Spacing.small) {
        UniversitySectionLabel(title: "Package limitations")
        Spacer(minLength: ForgeDesign.Spacing.small)
        UniversityStatusBadge(
          label: "Help limits",
          symbolName: "exclamationmark.triangle.fill",
          colorRole: .caution
        )
      }

      if model.catalog.limitations.isEmpty {
        Text("No package limitation is available.")
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
      } else {
        ForEach(model.catalog.limitations, id: \.id) { limitation in
          limitationRow(limitation)
        }
      }
    }
    .padding(.vertical, ForgeDesign.Spacing.regular)
    .accessibilitySortPriority(10)
  }

  private func limitationRow(_ limitation: CatalogLimitation) -> some View {
    HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
      Image(systemName: "exclamationmark.triangle.fill")
        .foregroundStyle(ForgeDesign.caution)
        .accessibilityHidden(true)

      Text(limitation.statement)
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Package limitation")
    .accessibilityValue(limitation.statement)
  }

  private var unavailableRow: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      Label("Activity unavailable", systemImage: "exclamationmark.triangle")
        .font(.headline)
        .foregroundStyle(ForgeDesign.failedCheck)

      Text(
        model.activityStatusMessage
          ?? "No local activity is ready. Close this screen and return when an activity is available."
      )
      .font(.subheadline)
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.vertical, ForgeDesign.Spacing.regular)
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Activity unavailable")
    .accessibilityValue(
      model.activityStatusMessage
        ?? "No local activity is ready. Close this screen and return when an activity is available."
    )
    .accessibilitySortPriority(85)
  }

  private var responseTextBinding: Binding<String> {
    Binding(
      get: { responseText },
      set: { proposedValue in
        updateResponseText(proposedValue)
      }
    )
  }

  private var responseState: UniversityActivityResponsePolicy.Result {
    UniversityActivityResponsePolicy.evaluate(responseText)
  }

  private var responseByteCount: Int {
    responseState.utf8ByteCount
  }

  private var responseHasNonWhitespace: Bool {
    responseState.hasNonWhitespace
  }

  private var canSubmit: Bool {
    guard
      !isActivitySubmissionInProgress,
      model.learnerState.evidence.count < UniversityLearningLimits.maximumEvidence,
      model.canPresentCurrentActivity,
      let activity = model.currentActivity,
      let selectedChoice,
      activity.choices.contains(selectedChoice)
    else {
      return false
    }

    return responseHasNonWhitespace
  }

  private var hasDraft: Bool {
    selectedChoice != nil || !responseText.isEmpty || model.currentActivityDraft.hasContent
  }

  private func submitActivity() {
    guard let submittedActivity = model.currentActivity, let selectedChoice, canSubmit else {
      return
    }
    guard
      model.learnerState.evidence.count
        < UniversityLearningLimits.maximumEvidence
    else {
      AccessibilityNotification.Announcement(Self.evidenceCapacityFeedbackMessage).post()
      return
    }
    let submittedResponseText = responseText
    isSubmissionRunning = true
    AccessibilityNotification.Announcement(
      "Recording local check. The activity stays open until the result is ready."
    ).post()
    model.beginActivitySubmission(
      selectedChoice: selectedChoice,
      responseText: submittedResponseText
    ) { outcome in
      completeSubmission(
        outcome,
        submittedActivity: submittedActivity
      )
    }
  }

  private func completeSubmission(
    _ outcome: ActivitySubmissionOutcome,
    submittedActivity: CatalogActivity
  ) {
    isSubmissionRunning = false
    let disposition: SubmissionResult.Disposition

    switch outcome {
    case .recorded(.demonstrated):
      disposition = .recorded
    case .recorded(.notDemonstrated):
      disposition = .notPassed
    case .failed:
      disposition = .notRecorded
    }

    let result = SubmissionResult(
      disposition: disposition,
      submittedActivityTitle: submittedActivity.kind.universityActivityTitle,
      submittedActivityPrompt: submittedActivity.prompt,
      message:
        model.activityStatusMessage
        ?? SubmissionResult.defaultMessage(for: disposition)
    )
    submissionResult = result
    clearTransientEntryState()
    if case .recorded = outcome {
      clearCurrentEntryState()
    }
    announceResult(result)
  }

  private func closeActivity() {
    guard !isActivitySubmissionInProgress else {
      return
    }

    focusedField = nil
    guard hasDraft else {
      dismissActivity()
      return
    }

    isDiscardConfirmationPresented = true
  }

  private func dismissActivity() {
    clearTransientEntryState()
    submissionResult = nil
    model.dismissActivity()
  }

  private func discardAndDismissActivity() {
    model.discardCurrentActivityDraft()
    clearCurrentEntryState()
    dismissActivity()
  }

  private func restoreCurrentActivityDraft() {
    let draft = model.currentActivityDraft
    selectedChoice = draft.selectedChoice
    responseText = draft.responseText
  }

  private func clearCurrentEntryState() {
    selectedChoice = nil
    responseText = ""
  }

  #if DEBUG
    private func dismissWithRootRouteForTesting() {
      guard let url = URL(string: "forge://today") else {
        return
      }

      model.route(url)
    }
  #endif

  private func clearTransientEntryState() {
    responseLimitFeedback = nil
    focusedField = nil
    isDiscardConfirmationPresented = false
  }

  private var activitySeparator: some View {
    Divider()
  }

  private func scrollChoicesIntoView(using scrollProxy: ScrollViewProxy) {
    scrollProxy.scrollTo(ScrollAnchor.choices, anchor: .top)
  }

  private func scrollResponseIntoView(using scrollProxy: ScrollViewProxy) {
    scrollProxy.scrollTo(ScrollAnchor.response, anchor: .center)
  }

  private func scrollResultIntoView(using scrollProxy: ScrollViewProxy) {
    if reduceMotion {
      scrollProxy.scrollTo(ScrollAnchor.result, anchor: .top)
    } else {
      withAnimation(.easeInOut(duration: 0.2)) {
        scrollProxy.scrollTo(ScrollAnchor.result, anchor: .top)
      }
    }
  }

  private var isActivitySubmissionInProgress: Bool {
    isSubmissionRunning || model.isActivitySubmissionRunning
  }

  private var shouldShowSubmitAction: Bool {
    !dynamicTypeSize.isAccessibilitySize
      || canSubmit
      || isActivitySubmissionInProgress
      || isEvidenceCapacityReached
  }

  private var isEvidenceCapacityReached: Bool {
    model.learnerState.evidence.count >= UniversityLearningLimits.maximumEvidence
  }

  private func announceResult(_ result: SubmissionResult) {
    feedbackAnnouncementSequence &+= 1
    AccessibilityNotification.Announcement(
      "Activity result. Attempt \(feedbackAnnouncementSequence). \(result.accessibilityDescription)"
    ).post()
  }

  private func updateResponseText(_ proposedValue: String) {
    let responseState = UniversityActivityResponsePolicy.evaluate(proposedValue)
    responseText = responseState.boundedText
    model.updateCurrentActivityDraft(
      selectedChoice: selectedChoice,
      responseText: responseState.boundedText
    )

    guard responseState.isTruncated else {
      responseLimitFeedback = nil
      return
    }

    let feedback = Self.responseLimitFeedbackMessage
    let shouldAnnounceFeedback = responseLimitFeedback != feedback
    responseLimitFeedback = feedback

    if shouldAnnounceFeedback {
      AccessibilityNotification.Announcement(feedback).post()
    }
  }

  private static var responseLimitFeedbackMessage: String {
    "Response limit reached. FORGE kept the first \(UniversityLearningLimits.maximumResponseBytes) bytes."
  }

  private static let evidenceCapacityFeedbackMessage =
    "This device has reached the local evidence limit. Clear local data before you record another check."

}

enum UniversityActivityResponsePolicy {
  struct Result: Equatable {
    let boundedText: String
    let utf8ByteCount: Int
    let hasNonWhitespace: Bool
    let isTruncated: Bool
  }

  static func evaluate(_ proposedText: String) -> Result {
    let maximumByteCount = UniversityLearningLimits.maximumResponseBytes
    let proposedByteCount = proposedText.utf8.count
    let whitespaceAndNewlines = CharacterSet.whitespacesAndNewlines

    if proposedByteCount <= maximumByteCount {
      return Result(
        boundedText: proposedText,
        utf8ByteCount: proposedByteCount,
        hasNonWhitespace: proposedText.unicodeScalars.contains {
          !whitespaceAndNewlines.contains($0)
        },
        isTruncated: false
      )
    }

    var boundedText = ""
    var boundedByteCount = 0
    var hasNonWhitespace = false
    boundedText.reserveCapacity(maximumByteCount)

    for character in proposedText {
      let characterText = String(character)
      let characterByteCount = characterText.utf8.count
      guard boundedByteCount + characterByteCount <= maximumByteCount else {
        break
      }

      boundedText.append(character)
      boundedByteCount += characterByteCount
      if !hasNonWhitespace {
        hasNonWhitespace = characterText.unicodeScalars.contains {
          !whitespaceAndNewlines.contains($0)
        }
      }
    }

    return Result(
      boundedText: boundedText,
      utf8ByteCount: boundedByteCount,
      hasNonWhitespace: hasNonWhitespace,
      isTruncated: true
    )
  }
}

extension ActivityKind {
  fileprivate var universityActivityTitle: String {
    switch self {
    case .practice:
      "Practice activity"
    case .proof:
      "Independent check"
    case .delayedReturn:
      "Delayed return"
    }
  }
}

extension DelayedReturnStatus {
  fileprivate var universityActivityTitle: String {
    switch self {
    case .scheduled:
      "Scheduled"
    case .open:
      "Open"
    case .due:
      "Due"
    case .expired:
      "Window closed"
    case .completed:
      "Return recorded"
    }
  }
}
