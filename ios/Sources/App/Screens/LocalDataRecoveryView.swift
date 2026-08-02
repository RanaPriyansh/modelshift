import SwiftUI

struct LocalDataRecoveryView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @State private var isClearConfirmationPresented = false
  @AccessibilityFocusState private var recoveryFocus: RecoveryFocus?

  private enum RecoveryFocus: Hashable {
    case clearLocalData
    case clearLocalDataConfirmation
  }

  init(model _: AppModel) {}

  var body: some View {
    Group {
      if isClearConfirmationPresented, model.allowsClearLocalDataDuringRecovery {
        clearLocalDataConfirmationContent
      } else {
        recoveryContent
      }
    }
    .transaction { transaction in
      if reduceMotion {
        transaction.animation = nil
        transaction.disablesAnimations = true
      }
    }
    .onChange(of: model.allowsClearLocalDataDuringRecovery) { _, allowsClearLocalData in
      if !allowsClearLocalData {
        isClearConfirmationPresented = false
      }
    }
    .onChange(of: isClearConfirmationPresented) { _, isPresented in
      if isPresented {
        recoveryFocus = .clearLocalDataConfirmation
        AccessibilityNotification.Announcement(
          "Clear local data confirmation. Review the impact, then choose Cancel or Clear local data."
        ).post()
      } else if model.allowsClearLocalDataDuringRecovery {
        recoveryFocus = .clearLocalData
      } else {
        recoveryFocus = nil
      }
    }
    .onChange(of: model.localDataRecoveryMessage, initial: true) { _, newMessage in
      announceRecoveryMessage(newMessage)
    }
    .onChange(of: model.isRecoveryOperationRunning, initial: false) { _, isWorking in
      guard isWorking else {
        return
      }

      AccessibilityNotification.Announcement(
        "Recovery operation in progress. FORGE has not reported a ready state."
      ).post()
    }
  }

  private var recoveryContent: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
        recoveryHeader
        recoveryMessage
        recoveryActions
      }
      .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .padding(.vertical, ForgeDesign.Spacing.section)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .background(ForgeDesign.canvas.ignoresSafeArea())
    .accessibilityIdentifier("recovery.screen")
  }

  private var clearLocalDataConfirmationContent: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
        clearLocalDataConfirmationHeader
        clearLocalDataConfirmationMessage
      }
      .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .padding(.vertical, ForgeDesign.Spacing.section)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      clearLocalDataConfirmationActions
    }
    .background(ForgeDesign.canvas.ignoresSafeArea())
    .accessibilityIdentifier("recovery.screen")
  }

  private var clearLocalDataConfirmationHeader: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
          clearLocalDataConfirmationSymbol
          clearLocalDataConfirmationHeaderCopy
        }
      } else {
        HStack(alignment: .top, spacing: ForgeDesign.Spacing.regular) {
          clearLocalDataConfirmationSymbol
          clearLocalDataConfirmationHeaderCopy
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .fixedSize(horizontal: false, vertical: true)
  }

  private var clearLocalDataConfirmationSymbol: some View {
    Image(systemName: "trash")
      .font(.title2.weight(.semibold))
      .foregroundStyle(ForgeDesign.warningText)
      .frame(width: 48, height: 48)
      .background(ForgeDesign.accentWash, in: Circle())
      .accessibilityHidden(true)
  }

  private var clearLocalDataConfirmationHeaderCopy: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text("Clear local data?")
        .font(.largeTitle.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
        .accessibilityFocused($recoveryFocus, equals: .clearLocalDataConfirmation)

      Text(
        "This is the second step. Choose Clear local data only if you intend to remove the data."
      )
      .font(.body)
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .layoutPriority(1)
  }

  private var clearLocalDataConfirmationMessage: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text("What will happen")
        .font(.headline)
        .accessibilityAddTraits(.isHeader)

      Text(
        "FORGE will try to clear local learning data on this device. FORGE cannot restore cleared local learning data."
      )
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)

      Text("The recovery screen stays open until FORGE reports a ready state.")
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(ForgeDesign.Spacing.large)
    .background(ForgeDesign.raisedSurface)
    .clipShape(
      RoundedRectangle(
        cornerRadius: ForgeDesign.Radius.card,
        style: .continuous
      )
    )
    .overlay {
      RoundedRectangle(
        cornerRadius: ForgeDesign.Radius.card,
        style: .continuous
      )
      .stroke(ForgeDesign.hairline, lineWidth: 1)
    }
  }

  private var clearLocalDataConfirmationActions: some View {
    VStack(spacing: ForgeDesign.Spacing.small) {
      Button("Cancel", action: dismissClearLocalDataConfirmation)
        .frame(maxWidth: .infinity, minHeight: 48)
        .buttonStyle(.bordered)
        .controlSize(.large)
        .tint(ForgeDesign.tabSelection)
        .accessibilityHint("Returns to recovery options. FORGE does not clear local data.")
        .accessibilityIdentifier("recovery.cancel-clear-local-data")

      Button("Clear local data", role: .destructive, action: confirmClearLocalData)
        .frame(maxWidth: .infinity, minHeight: 48)
        .buttonStyle(.bordered)
        .controlSize(.large)
        .tint(ForgeDesign.warningText)
        .disabled(model.isRecoveryOperationRunning)
        .accessibilityHint(
          "Clears local learning data after this confirmation."
        )
        .accessibilityIdentifier("recovery.confirm-clear-local-data")
    }
    .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth)
    .padding(.horizontal, ForgeDesign.Spacing.regular)
    .padding(.vertical, ForgeDesign.Spacing.regular)
    .frame(maxWidth: .infinity)
    .background(ForgeDesign.raisedSurface)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(ForgeDesign.hairline)
        .frame(height: 1)
    }
  }

  private var recoveryHeader: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
          recoverySymbol
          recoveryHeaderCopy
        }
      } else {
        HStack(alignment: .top, spacing: ForgeDesign.Spacing.regular) {
          recoverySymbol
          recoveryHeaderCopy
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .fixedSize(horizontal: false, vertical: true)
  }

  private var recoverySymbol: some View {
    Image(systemName: "exclamationmark.triangle")
      .font(.title2.weight(.semibold))
      .foregroundStyle(ForgeDesign.warningText)
      .frame(width: 48, height: 48)
      .background(ForgeDesign.accentWash, in: Circle())
      .accessibilityHidden(true)
  }

  private var recoveryHeaderCopy: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text("Local data needs recovery")
        .font(.largeTitle.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)

      Text("Review the recovery report, then choose an option.")
        .font(.body)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .layoutPriority(1)
  }

  private var recoveryMessage: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text("Recovery report")
        .font(.headline)
        .accessibilityAddTraits(.isHeader)

      Text(model.localDataRecoveryMessage)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Recovery error")
        .accessibilityValue(model.localDataRecoveryMessage)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(ForgeDesign.Spacing.large)
    .background(ForgeDesign.raisedSurface)
    .clipShape(
      RoundedRectangle(
        cornerRadius: ForgeDesign.Radius.card,
        style: .continuous
      )
    )
    .overlay {
      RoundedRectangle(
        cornerRadius: ForgeDesign.Radius.card,
        style: .continuous
      )
      .stroke(ForgeDesign.hairline, lineWidth: 1)
    }
  }

  private var recoveryActions: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      Text("Recovery options")
        .font(.headline)
        .accessibilityAddTraits(.isHeader)

      if model.isRecoveryOperationRunning {
        recoveryProgress
      }

      Button {
        model.retryLocalDataLoad()
      } label: {
        Text("Retry")
          .frame(maxWidth: .infinity, minHeight: 48)
      }
      .buttonStyle(ForgeCommitmentButtonStyle())
      .disabled(model.isRecoveryOperationRunning)
      .accessibilityHint("Ask FORGE to try the recovery operation again.")
      .accessibilityIdentifier("recovery.retry")

      if model.allowsClearLocalDataDuringRecovery {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
          Text("If retry does not work")
            .font(.subheadline.weight(.semibold))
            .accessibilityAddTraits(.isHeader)

          Text(
            "Clear local data asks FORGE to try to remove local learning data on this device. "
              + "FORGE asks for confirmation first."
          )
          .font(.footnote)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)

          Button("Clear local data", role: .destructive) {
            presentClearLocalDataConfirmation()
          }
          .frame(maxWidth: .infinity, minHeight: 48)
          .buttonStyle(.bordered)
          .controlSize(.large)
          .tint(ForgeDesign.warningText)
          .disabled(model.isRecoveryOperationRunning)
          .accessibilityHint(
            "Shows a confirmation before FORGE attempts to clear local learning data."
          )
          .accessibilityIdentifier("recovery.clear-local-data")
          .accessibilityFocused($recoveryFocus, equals: .clearLocalData)
        }
      }
    }
    .frame(maxWidth: .infinity)
  }

  private var recoveryProgress: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          recoveryProgressIndicator
          recoveryProgressMessage
        }
      } else {
        HStack(alignment: .center, spacing: ForgeDesign.Spacing.small) {
          recoveryProgressIndicator
          recoveryProgressMessage
        }
      }
    }
    .foregroundStyle(ForgeDesign.secondaryText)
    .fixedSize(horizontal: false, vertical: true)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Recovery operation in progress")
    .accessibilityValue("FORGE has not reported a ready state.")
  }

  @ViewBuilder
  private var recoveryProgressIndicator: some View {
    if reduceMotion {
      Image(systemName: "clock")
        .accessibilityHidden(true)
    } else {
      ProgressView()
        .accessibilityHidden(true)
    }
  }

  private var recoveryProgressMessage: some View {
    Text(
      "FORGE is trying the requested action. This screen stays open until FORGE reports a ready state."
    )
    .font(.subheadline)
    .fixedSize(horizontal: false, vertical: true)
  }

  private func announceRecoveryMessage(_ recoveryMessage: String) {
    guard !recoveryMessage.isEmpty else {
      return
    }

    AccessibilityNotification.Announcement(
      "Local data needs recovery. \(recoveryMessage)"
    ).post()
  }

  private func presentClearLocalDataConfirmation() {
    guard
      model.allowsClearLocalDataDuringRecovery,
      !model.isRecoveryOperationRunning
    else {
      return
    }

    isClearConfirmationPresented = true
  }

  private func dismissClearLocalDataConfirmation() {
    isClearConfirmationPresented = false
  }

  private func confirmClearLocalData() {
    guard
      isClearConfirmationPresented,
      model.allowsClearLocalDataDuringRecovery,
      !model.isRecoveryOperationRunning
    else {
      return
    }

    isClearConfirmationPresented = false
    model.clearLocalData()
  }
}
