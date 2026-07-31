import ForgeCore
import SwiftUI

struct OnboardingView: View {
  @Bindable var model: AppModel

  var body: some View {
    NavigationStack {
      Form {
        Section {
          onboardingHeader
        }
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets())

        Section("Your goal") {
          TextField(
            "For example, test AI claims against sources",
            text: $model.onboardingDraft.goal,
            axis: .vertical
          )
          .lineLimit(3...6)
          .textInputAutocapitalization(.sentences)
          .accessibilityLabel("Learning goal")
          .accessibilityHint("Enter at least eight characters.")
          .accessibilityIdentifier("onboarding.goal")

          Button("Use a safe sample goal") {
            model.onboardingDraft.goal = "Test AI claims against reliable sources"
          }
          .accessibilityHint("Fills the goal field with a device-only example.")
          .accessibilityIdentifier("onboarding.safe-sample")

          goalReadiness
        }

        Section {
          Picker("Learner mode", selection: $model.onboardingDraft.mode) {
            ForEach(LearnerMode.allCases) { mode in
              Text(mode.title)
                .tag(mode)
            }
          }
          .pickerStyle(.navigationLink)
          .accessibilityIdentifier("onboarding.learner-mode")

          Picker("Path depth", selection: $model.onboardingDraft.depth) {
            ForEach(StudyDepth.allCases) { depth in
              Text(depth.title)
                .tag(depth)
            }
          }
          .pickerStyle(.navigationLink)
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
          .pickerStyle(.segmented)
          .accessibilityLabel("Time available")
          .accessibilityIdentifier("onboarding.time")
        } header: {
          Text("Shape the path")
        } footer: {
          Text("Choose what changes the first useful action. You can revise these choices.")
        }

        if model.onboardingDraft.mode == .childWithAdult {
          Section("Grown-up check") {
            Toggle(
              "A grown-up is present",
              isOn: $model.onboardingDraft.grownUpPresent
            )
            .accessibilityIdentifier("onboarding.grown-up-present")

            Text("This check applies only to this local setup.")
              .font(.footnote)
              .foregroundStyle(.secondary)
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
                .foregroundStyle(.secondary)

              Text("FORGE stores your goal on this device.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
          }
          .padding(.vertical, ForgeDesign.Spacing.tight)
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
          .accessibilityIdentifier("onboarding.close")
        }
      }
    }
  }

  private var onboardingHeader: some View {
    HStack(alignment: .top, spacing: ForgeDesign.Spacing.regular) {
      Image(systemName: "scope")
        .font(.title2.weight(.semibold))
        .foregroundStyle(.tint)
        .frame(width: 48, height: 48)
        .background(ForgeDesign.accentWash, in: Circle())
        .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        Text("FORGE")
          .font(.caption.weight(.semibold))
          .foregroundStyle(.secondary)
          .tracking(1.4)

        Text("Start with one real goal.")
          .font(.title2.weight(.semibold))
          .accessibilityAddTraits(.isHeader)

        Text("FORGE will shape a path for your review. Nothing starts without your choice.")
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, ForgeDesign.Spacing.regular)
  }

  @ViewBuilder
  private var goalReadiness: some View {
    if model.onboardingDraft.normalizedGoal.count >= 8 {
      Label("Ready for path review", systemImage: "checkmark.circle.fill")
        .font(.footnote)
        .foregroundStyle(.green)
    } else {
      Label(
        "Add a specific outcome or capability.",
        systemImage: "lightbulb"
      )
      .font(.footnote)
      .foregroundStyle(.secondary)
    }
  }

  private var onboardingAction: some View {
    VStack(spacing: ForgeDesign.Spacing.tight) {
      Button {
        model.completeOnboarding()
      } label: {
        Text("Review my setup")
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.borderedProminent)
      .controlSize(.large)
      .disabled(!model.onboardingDraft.isReady)
      .accessibilityHint("Saves this setup on the device and opens Today.")
      .accessibilityIdentifier("onboarding.continue")

      if !model.onboardingDraft.isReady {
        Text("Complete the required choices to continue.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.horizontal, ForgeDesign.Spacing.regular)
    .padding(.vertical, ForgeDesign.Spacing.small)
    .background(.bar)
  }
}

#Preview {
  OnboardingView(model: AppModel.preview())
}
