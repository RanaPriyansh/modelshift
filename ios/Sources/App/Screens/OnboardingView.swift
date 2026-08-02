import Foundation
import SwiftUI

@MainActor
struct OnboardingView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @FocusState private var semesterNameIsFocused: Bool
  @AccessibilityFocusState private var statusIsFocused: Bool

  init(model _: AppModel) {}

  var body: some View {
    @Bindable var model = model

    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
          thresholdHeader
          semesterForm(name: $model.semesterNameDraft)
          localDataBoundary

          if let message = model.localDataResetStatusMessage, !message.isEmpty {
            resetResult(message)
          }

          if let message = model.semesterDeskStatusMessage, !message.isEmpty {
            saveStatus(message)
          }
        }
        .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
        .padding(.horizontal, ForgeDesign.Spacing.regular)
        .padding(.vertical, ForgeDesign.Spacing.large)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .scrollDismissesKeyboard(.interactively)
      .background(ForgeDesign.canvas.ignoresSafeArea())
      .navigationTitle("New Semester Desk")
      .navigationBarTitleDisplayMode(.inline)
      .safeAreaInset(edge: .bottom, spacing: 0) {
        createAction
      }
    }
    .interactiveDismissDisabled(true)
    .accessibilityIdentifier("onboarding.screen")
    .transaction { transaction in
      if reduceMotion {
        transaction.animation = nil
        transaction.disablesAnimations = true
      }
    }
    .onChange(of: model.semesterDeskStatusMessage, initial: false) { _, message in
      guard let message, !message.isEmpty else {
        return
      }
      statusIsFocused = true
      AccessibilityNotification.Announcement(message).post()
    }
  }

  private var thresholdHeader: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
          thresholdLandmark
          thresholdCopy
        }
      } else {
        HStack(alignment: .top, spacing: ForgeDesign.Spacing.large) {
          thresholdLandmark
          thresholdCopy
        }
      }
    }
    .padding(ForgeDesign.Spacing.large)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(ForgeDesign.deepCanvas)
    .clipShape(.rect(cornerRadius: ForgeDesign.Radius.inset))
    .accessibilityElement(children: .contain)
  }

  private var thresholdLandmark: some View {
    ZStack(alignment: .bottom) {
      RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset)
        .fill(ForgeDesign.strongSurface)

      Rectangle()
        .fill(ForgeDesign.checkedEvidence)
        .frame(height: 18)

      Image(systemName: "signpost.right.fill")
        .font(.title2)
        .foregroundStyle(ForgeDesign.Action.commitment)
        .padding(.bottom, ForgeDesign.Spacing.small)
    }
    .frame(width: 72, height: 72)
    .accessibilityHidden(true)
  }

  private var thresholdCopy: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      Text("Build from today")
        .font(.largeTitle.weight(.bold))
        .foregroundStyle(ForgeDesign.text)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)

      Text("Name the semester that you want to plan, study, and rebuild.")
        .font(.body)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private func semesterForm(name: Binding<String>) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      Text("Semester name")
        .font(.title2.weight(.semibold))
        .accessibilityAddTraits(.isHeader)

      TextField("For example, Autumn 2026", text: name)
        .textInputAutocapitalization(.words)
        .autocorrectionDisabled()
        .submitLabel(.done)
        .focused($semesterNameIsFocused)
        .padding(.horizontal, ForgeDesign.Spacing.regular)
        .frame(minHeight: 48)
        .background(ForgeDesign.surface)
        .clipShape(.rect(cornerRadius: ForgeDesign.Radius.inset))
        .overlay {
          RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset)
            .stroke(ForgeDesign.boundary, lineWidth: 1)
        }
        .accessibilityLabel("Semester name")
        .accessibilityHint("Enter the name that will identify this Semester Desk.")
        .accessibilityIdentifier("onboarding.semester-name")
        .onSubmit {
          guard canCreateSemesterDesk else {
            return
          }
          createSemesterDesk()
        }

      Text("You can add courses, planned work, and capacity after this desk is saved.")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var localDataBoundary: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      Divider()

      Label("Private on this iPhone", systemImage: "lock.fill")
        .font(.headline)

      Text("Your Semester Desk stays on this iPhone.")
        .font(.body)
        .fixedSize(horizontal: false, vertical: true)

      Text("Web and iPhone data do not sync.")
        .font(.body)
        .fixedSize(horizontal: false, vertical: true)

      Text("Private practice and independent-check text is not saved.")
        .font(.body)
        .fixedSize(horizontal: false, vertical: true)
    }
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("onboarding.local-data")
  }

  private func resetResult(_ message: String) -> some View {
    Label(message, systemImage: "checkmark.circle")
      .font(.body)
      .foregroundStyle(ForgeDesign.checkedEvidence)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityElement(children: .combine)
      .accessibilityIdentifier("onboarding.reset-result")
  }

  private func saveStatus(_ message: String) -> some View {
    Label(message, systemImage: "exclamationmark.circle")
      .font(.body)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityElement(children: .combine)
      .accessibilityFocused($statusIsFocused)
      .accessibilityIdentifier("onboarding.save-status")
  }

  private var createAction: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      if model.isSemesterDeskOperationRunning {
        ProgressView("Saving your Semester Desk")
          .frame(maxWidth: .infinity, alignment: .leading)
          .accessibilityIdentifier("onboarding.saving")
      }

      SemesterDeskPrimaryButton(
        title: model.isSemesterDeskOperationRunning
          ? "Saving Semester Desk"
          : "Create Semester Desk",
        systemImage: "arrow.right.circle.fill",
        hint: "Saves this Semester Desk before Today opens.",
        identifier: "onboarding.create-semester-desk",
        isDisabled: !canCreateSemesterDesk,
        action: createSemesterDesk
      )
    }
    .padding(.horizontal, ForgeDesign.Spacing.regular)
    .padding(.vertical, ForgeDesign.Spacing.small)
    .frame(maxWidth: .infinity)
    .background(ForgeDesign.canvas)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(ForgeDesign.boundary)
        .frame(height: 1)
    }
  }

  private var canCreateSemesterDesk: Bool {
    !model.semesterNameDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && !model.isSemesterDeskOperationRunning
      && !model.isLocalDataResetRunning
  }

  private func createSemesterDesk() {
    semesterNameIsFocused = false
    Task { @MainActor in
      _ = await model.createSemesterDesk(title: model.semesterNameDraft)
    }
  }
}
