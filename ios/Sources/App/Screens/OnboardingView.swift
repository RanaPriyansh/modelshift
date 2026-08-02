import SwiftUI

@MainActor
struct OnboardingView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  private static let courseLoop = [
    CourseLoopStep(
      id: "practice",
      title: "Practice",
      detail: "Begin with one local practice activity."
    ),
    CourseLoopStep(
      id: "independent-check",
      title: "Independent check",
      detail: "Complete an independent check after practice."
    ),
    CourseLoopStep(
      id: "delayed-return",
      title: "Delayed return",
      detail: "Return after the course delay for one local check."
    ),
  ]

  init(model _: AppModel) {}

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.section) {
          courseHeader
          courseOverview
          privacySupportSurface
          courseLoop
          limitations
          localBoundary
        }
        .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
        .padding(.horizontal, ForgeDesign.Spacing.regular)
        .padding(.vertical, ForgeDesign.Spacing.section)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .background(ForgeDesign.canvas.ignoresSafeArea())
      .navigationTitle("Course setup")
      .navigationBarTitleDisplayMode(.inline)
      .safeAreaInset(edge: .bottom) {
        startSection
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
    .onChange(of: model.courseStartStatusMessage, initial: true) { _, message in
      guard let message, !message.isEmpty else {
        return
      }

      AccessibilityNotification.Announcement(message).post()
    }
  }

  private var courseHeader: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
          courseSymbol
          courseHeaderCopy
        }
      } else {
        HStack(alignment: .top, spacing: ForgeDesign.Spacing.regular) {
          courseSymbol
          courseHeaderCopy
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var courseSymbol: some View {
    Image(systemName: "book.closed.fill")
      .font(.title2.weight(.semibold))
      .foregroundStyle(ForgeDesign.navigationCommitment)
      .frame(width: 48, height: 48)
      .background(ForgeDesign.navigationCommitmentSurface, in: Circle())
      .accessibilityHidden(true)
  }

  private var courseHeaderCopy: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text("One local course")
        .font(.largeTitle.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)

      Text("Review the bounded starter course before you start.")
        .font(.body)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .layoutPriority(1)
  }

  private var courseOverview: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        UniversityStatusBadge(
          label: "Starter course",
          symbolName: "graduationcap.fill",
          colorRole: .commitment
        )

        Text(model.courseTitle)
          .font(.title2.weight(.semibold))
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)
          .accessibilityIdentifier("onboarding.course-title")

        Text(model.courseSummary)
          .font(.body)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
  }

  private var privacySupportSurface: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        UniversitySectionLabel(title: "Privacy and Support")

        NavigationLink {
          PrivacySupportView()
        } label: {
          HStack(spacing: ForgeDesign.Spacing.regular) {
            Image(systemName: "hand.raised.fill")
              .font(.title3)
              .foregroundStyle(ForgeDesign.navigationCommitment)
              .frame(width: 32, height: 32)
              .background(ForgeDesign.navigationCommitmentSurface, in: Circle())
              .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
              Text("Privacy and Support")
                .font(.headline)

              Text("Review local-data and support information before course start.")
                .font(.subheadline)
                .foregroundStyle(ForgeDesign.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Image(systemName: "chevron.right")
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(ForgeDesign.secondaryText)
              .accessibilityHidden(true)
          }
          .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
          .contentShape(Rectangle())
        }
        .accessibilityLabel("Privacy and Support")
        .accessibilityHint("Opens privacy and support information before you start the course.")
        .accessibilityIdentifier("onboarding.privacy-support")
      }
    }
  }

  private var courseLoop: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Course loop")

      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        ForEach(Self.courseLoop) { step in
          CourseLoopStepRow(step: step)
        }
      }
      .padding(.horizontal, ForgeDesign.Spacing.tight)
    }
  }

  private var limitations: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Limits")

      UniversitySurface {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
          UniversityStatusBadge(
            label: "Course limits",
            symbolName: "exclamationmark.triangle.fill",
            colorRole: .caution
          )

          ForEach(model.catalog.limitations.indices, id: \.self) { index in
            Text(model.catalog.limitations[index].statement)
              .font(.body)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
      }
    }
    .accessibilityIdentifier("onboarding.limitations")
  }

  private var localBoundary: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      Divider()

      UniversitySectionLabel(title: "Local boundary")

      Text("Learning data stays in local app storage.")
        .font(.body)
        .fixedSize(horizontal: false, vertical: true)

      Text("No production AI runs in this course.")
        .font(.body)
        .fixedSize(horizontal: false, vertical: true)

      Text("Receipts are unsigned local records.")
        .font(.body)
        .fixedSize(horizontal: false, vertical: true)
    }
  }

  private var startSection: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Start")

      if let message = model.courseStartStatusMessage, !message.isEmpty {
        courseStartStatus(message)
      }

      Button(action: startCourse) {
        HStack(spacing: ForgeDesign.Spacing.small) {
          if model.isCourseStartRunning {
            startProgressIndicator
          } else {
            Image(systemName: "arrow.right.circle.fill")
              .accessibilityHidden(true)
          }

          Text(model.isCourseStartRunning ? "Starting course" : "Start course")
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .frame(maxWidth: .infinity, minHeight: 48)
      }
      .buttonStyle(ForgeCommitmentButtonStyle())
      .disabled(model.isCourseStartRunning)
      .accessibilityHint(
        "Starts the bounded local course. This setup surface stays open until the course starts."
      )
      .accessibilityIdentifier("onboarding.start-course")
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, ForgeDesign.Spacing.regular)
    .padding(.vertical, ForgeDesign.Spacing.small)
    .background(ForgeDesign.canvas)
  }

  private func courseStartStatus(_ message: String) -> some View {
    UniversitySurface {
      HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
        Image(systemName: "xmark.octagon.fill")
          .foregroundStyle(ForgeDesign.failedCheck)
          .accessibilityHidden(true)

        Text(message)
          .font(.body)
          .fixedSize(horizontal: false, vertical: true)
      }
      .accessibilityElement(children: .combine)
      .accessibilityLabel("Course start error")
      .accessibilityValue(message)
    }
  }

  @ViewBuilder
  private var startProgressIndicator: some View {
    if reduceMotion {
      Image(systemName: "clock")
        .accessibilityHidden(true)
    } else {
      ProgressView()
        .tint(ForgeDesign.primaryActionForeground)
        .accessibilityHidden(true)
    }
  }

  private func startCourse() {
    Task { @MainActor in
      _ = await model.startUniversityCourse()
    }
  }
}

private struct CourseLoopStep: Identifiable {
  let id: String
  let title: String
  let detail: String
}

private struct CourseLoopStepRow: View {
  let step: CourseLoopStep

  var body: some View {
    HStack(alignment: .top, spacing: ForgeDesign.Spacing.regular) {
      Image(systemName: "checkmark.circle")
        .font(.title3)
        .foregroundStyle(ForgeDesign.navigationCommitment)
        .frame(width: 24)
        .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        Text(step.title)
          .font(.headline)
          .fixedSize(horizontal: false, vertical: true)

        Text(step.detail)
          .font(.body)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .layoutPriority(1)
    }
    .accessibilityElement(children: .combine)
  }
}
