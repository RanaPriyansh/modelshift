import ForgeCore
import SwiftUI

struct OnboardingView: View {
  @Bindable var model: AppModel
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  private static let safeSampleGoal = "Test AI claims against reliable sources"

  private static let goalChoices: [GoalChoice] = [
    GoalChoice(
      id: "question-a-claim",
      title: "Question a claim",
      detail: "Compare a claim with reliable sources.",
      goal: "Test a claim against reliable sources."
    ),
    GoalChoice(
      id: "understand-an-idea",
      title: "Understand an idea",
      detail: "Make a difficult idea clear enough to explain.",
      goal: "Understand a difficult idea well enough to explain it."
    ),
    GoalChoice(
      id: "prepare-for-a-task",
      title: "Prepare for a task",
      detail: "Build a practical path for a project or assessment.",
      goal: "Prepare for a project or assessment."
    ),
  ]

  var body: some View {
    NavigationStack {
      Form {
        Section {
          onboardingHeader
        }
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets())

        Section {
          Text("Choose your goal")
            .font(.headline)
            .foregroundStyle(.primary)
            .accessibilityAddTraits(.isHeader)

          Text("Select a starting point, or write a goal in your own words.")
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)

          Button {
            model.onboardingDraft.goal = Self.safeSampleGoal
          } label: {
            HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
              Image(systemName: "checkmark.seal")
                .font(.body.weight(.semibold))
                .foregroundStyle(.tint)
                .accessibilityHidden(true)

              Text("Use a safe sample goal")
                .fixedSize(horizontal: false, vertical: true)
            }
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
          }
          .buttonStyle(.plain)
          .accessibilityHint("Fills the goal field with a device-only example. You can edit it.")
          .accessibilityIdentifier("onboarding.safe-sample")

          ForEach(Self.goalChoices) { choice in
            goalChoice(choice)
          }

          Text("Or write a different goal")
            .font(.subheadline.weight(.semibold))
            .accessibilityIdentifier("onboarding.custom-goal-heading-visual")

          TextField(
            "For example, test AI claims against sources",
            text: $model.onboardingDraft.goal,
            axis: .vertical
          )
          .lineLimit(3...)
          .textInputAutocapitalization(.sentences)
          .accessibilityLabel("Learning goal")
          .accessibilityHint(
            "Enter at least eight characters. "
              + "FORGE stores this goal on this device."
          )
          .accessibilityIdentifier("onboarding.goal")

          goalReadiness
        } footer: {
          Text("Your choice sets a starting direction. You can change it before you start.")
        }

        Section {
          Picker("Learner mode", selection: $model.onboardingDraft.mode) {
            ForEach(LearnerMode.allCases) { mode in
              Text(mode.title)
                .tag(mode)
            }
          }
          .pickerStyle(.navigationLink)
          .frame(minHeight: 44)
          .accessibilityLabel("Learner mode")
          .accessibilityHint("Choose who will use this path. Child mode needs a grown-up check.")
          .accessibilityIdentifier("onboarding.learner-mode")

          Picker("Path depth", selection: $model.onboardingDraft.depth) {
            ForEach(StudyDepth.allCases) { depth in
              Text(depth.title)
                .tag(depth)
            }
          }
          .pickerStyle(.navigationLink)
          .frame(minHeight: 44)
          .accessibilityLabel("Path depth")
          .accessibilityHint("Choose the type of learning path to review.")
          .accessibilityIdentifier("onboarding.path-depth")

          Picker(
            "Time available",
            selection: $model.onboardingDraft.availableMinutes
          ) {
            ForEach([15, 25, 45], id: \.self) { minutes in
              Text("\(minutes) minutes")
                .tag(minutes)
            }
          }
          .pickerStyle(.navigationLink)
          .frame(minHeight: 44)
          .accessibilityLabel("Time available")
          .accessibilityHint("Choose the time available for the first learning action.")
          .accessibilityIdentifier("onboarding.time")
        } header: {
          Text("Shape the path")
            .font(.headline)
            .foregroundStyle(ForgeDesign.secondaryText)
        } footer: {
          Text("Choose what changes the first useful action. You can revise these choices.")
        }

        if model.onboardingDraft.mode == .childWithAdult {
          Section {
            Toggle(
              "A grown-up is present",
              isOn: $model.onboardingDraft.grownUpPresent
            )
            .frame(minHeight: 44)
            .accessibilityHint("Confirm only when a grown-up is present in this local setup.")
            .accessibilityIdentifier("onboarding.grown-up-present")

            Text("This check applies only to this local setup.")
              .font(.footnote)
              .foregroundStyle(ForgeDesign.secondaryText)
          } header: {
            Text("Grown-up check")
              .font(.headline)
              .foregroundStyle(ForgeDesign.secondaryText)
          }
        }

        Section {
          HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
            Image(systemName: "lock.shield.fill")
              .foregroundStyle(.tint)
              .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
              Text("Private by default")
                .font(.headline)

              Text(model.onboardingDraft.mode.dataBoundary)
                .font(.subheadline)
                .foregroundStyle(ForgeDesign.secondaryText)

              Text("FORGE stores your goal on this device.")
                .font(.footnote)
                .foregroundStyle(ForgeDesign.secondaryText)
            }
          }
          .padding(.vertical, ForgeDesign.Spacing.tight)
          .accessibilityElement(children: .combine)
          .accessibilityLabel(
            "Private by default. \(model.onboardingDraft.mode.dataBoundary) FORGE stores your goal on this device."
          )
        }
        .listRowBackground(ForgeDesign.accentWash)
      }
      .scrollContentBackground(.hidden)
      .background(ForgeDesign.canvas)
      .navigationTitle("Start with a goal")
      .navigationBarTitleDisplayMode(.inline)
      .safeAreaInset(edge: .bottom) {
        onboardingAction
      }
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Close") {
            model.skipOnboarding()
          }
          .accessibilityHint("Closes setup without saving a goal.")
          .accessibilityIdentifier("onboarding.close")
        }
      }
    }
  }

  private var onboardingHeader: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
          onboardingSymbol
          onboardingHeaderCopy
        }
      } else {
        HStack(alignment: .top, spacing: ForgeDesign.Spacing.regular) {
          onboardingSymbol
          onboardingHeaderCopy
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .fixedSize(horizontal: false, vertical: true)
    .padding(.vertical, ForgeDesign.Spacing.regular)
  }

  private var onboardingSymbol: some View {
    Image(systemName: "scope")
      .font(.title2.weight(.semibold))
      .foregroundStyle(.tint)
      .frame(width: 48, height: 48)
      .background(ForgeDesign.accentWash, in: Circle())
      .accessibilityHidden(true)
  }

  private var onboardingHeaderCopy: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text("FORGE")
        .font(.caption.weight(.semibold))
        .foregroundStyle(ForgeDesign.secondaryText)
        .tracking(1.4)

      Text("Start with one real goal.")
        .font(.title2.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)

      Text("Turn one goal into a learning path you can review. You choose what starts.")
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .fixedSize(horizontal: false, vertical: true)
    .layoutPriority(1)
  }

  private func goalChoice(_ choice: GoalChoice) -> some View {
    let isSelected = model.onboardingDraft.normalizedGoal == choice.goal

    return Button {
      model.onboardingDraft.goal = choice.goal
    } label: {
      HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
        Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
          .font(.body.weight(.semibold))
          .foregroundStyle(isSelected ? Color.accentColor : ForgeDesign.secondaryText)
          .accessibilityHidden(true)

        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          Text(choice.title)
            .font(.body.weight(.semibold))

          Text(choice.detail)
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
        }
      }
      .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityLabel("\(choice.title). \(choice.detail)")
    .accessibilityValue(isSelected ? "Selected" : "Not selected")
    .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    .accessibilityHint("Sets the learning goal. You can edit it in the goal field.")
    .accessibilityIdentifier("onboarding.goal-choice.\(choice.id)")
    .listRowBackground(isSelected ? ForgeDesign.accentWash : ForgeDesign.raisedSurface)
  }

  @ViewBuilder
  private var goalReadiness: some View {
    if model.onboardingDraft.normalizedGoal.count >= 8 {
      HStack(alignment: .firstTextBaseline, spacing: ForgeDesign.Spacing.tight) {
        Image(systemName: "checkmark.circle.fill")
          .accessibilityHidden(true)

        Text("Ready for path review")
          .fixedSize(horizontal: false, vertical: true)
      }
      .font(.footnote)
      .foregroundStyle(ForgeDesign.successText)
      .accessibilityElement(children: .combine)
      .accessibilityLabel("Goal ready for path review")
    } else {
      Label(
        "Add a specific outcome or capability.",
        systemImage: "lightbulb"
      )
      .font(.footnote)
      .foregroundStyle(ForgeDesign.secondaryText)
      .accessibilityLabel("Goal needed. Add a specific outcome or capability.")
    }
  }

  private var onboardingAction: some View {
    VStack(spacing: ForgeDesign.Spacing.tight) {
      if model.onboardingDraft.isReady {
        Button {
          model.completeOnboarding()
        } label: {
          Text("Start my path")
            .frame(maxWidth: .infinity, minHeight: 48)
        }
        .buttonStyle(OnboardingActionButtonStyle())
        .controlSize(.large)
        .accessibilityHint(
          "Saves this setup on the device and opens Today. "
            + "No network connection is used."
        )
        .accessibilityIdentifier("onboarding.continue")
      } else {
        Text("Start my path")
          .frame(maxWidth: .infinity, minHeight: 48)
          .foregroundStyle(Color.primary)
          .background(
            RoundedRectangle(
              cornerRadius: ForgeDesign.Radius.inset,
              style: .continuous
            )
            .fill(ForgeDesign.canvas)
          )
          .overlay {
            RoundedRectangle(
              cornerRadius: ForgeDesign.Radius.inset,
              style: .continuous
            )
            .stroke(Color.primary, lineWidth: 2)
          }
          .accessibilityLabel("Start my path")
          .accessibilityValue("Setup incomplete")
          .accessibilityRemoveTraits(.isButton)
      }

      if !model.onboardingDraft.isReady {
        Text(onboardingReadinessMessage)
          .font(.footnote)
          .foregroundStyle(ForgeDesign.secondaryText)
          .accessibilityLabel("Setup status. \(onboardingReadinessMessage)")
      }
    }
    .padding(.horizontal, ForgeDesign.Spacing.regular)
    .padding(.vertical, ForgeDesign.Spacing.small)
    .background(.bar)
  }

  private struct OnboardingActionButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
      configuration.label
        .foregroundStyle(ForgeDesign.primaryActionForeground)
        .background(
          RoundedRectangle(
            cornerRadius: ForgeDesign.Radius.inset,
            style: .continuous
          )
          .fill(ForgeDesign.tabSelection)
        )
        .opacity(configuration.isPressed ? 0.82 : 1)
    }
  }

  private var onboardingReadinessMessage: String {
    if model.onboardingDraft.mode == .childWithAdult,
      !model.onboardingDraft.grownUpPresent
    {
      return "Confirm that a grown-up is present to continue."
    }

    return "Choose or write a goal to continue."
  }

  private struct GoalChoice: Identifiable, Sendable {
    let id: String
    let title: String
    let detail: String
    let goal: String
  }
}

#Preview {
  OnboardingView(model: AppModel.preview())
}
