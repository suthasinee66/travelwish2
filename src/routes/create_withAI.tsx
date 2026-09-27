import { createFileRoute } from "@tanstack/react-router";

import { Home } from "./home";

export const Route = createFileRoute("/create_withAI")({
  head: () => ({
    meta: [
      {
        title:
          "Create a new trip — TravelWish",
      },
      {
        name:
          "description",
        content:
          "Create a personalized trip with TravelWish AI.",
      },
    ],
  }),
  component: CreateWithAI,
});

function CreateWithAI() {
  // Reuse the exact same planner/chat experience as /home.
  // startNewTrip keeps this route as a fresh planning session
  // instead of automatically reopening the latest guest chat.
  return (
    <Home
      startNewTrip
    />
  );
}
