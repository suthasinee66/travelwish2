import { createFileRoute } from "@tanstack/react-router";
import PersonalSurveyForm from "@/components/PersonalSurveyForm";

export const Route = createFileRoute("/personal-survey")({
  component: PersonalSurvey,
});

function PersonalSurvey() {
  return (
    <PersonalSurveyForm
      mode="account"
    />
  );
}
