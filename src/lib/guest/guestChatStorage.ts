export type GuestChatMessage = {
  id: string;
  session_id: string;
  user_id: string | null;
  role: "user" | "ai";
  content: string;
  planner_json?: any[] | null;
  created_at: string;
};

export type GuestChatSession = {
  id: string;
  user_id: string | null;
  title: string;
  trip_preferences: any;
  ai_model: "gemini" | "gpt" | "claude";
  created_at: string;
  updated_at: string;
  messages: GuestChatMessage[];
};

const STORAGE_KEY =
  "travelwish_guest_chats_v1";

function canUseStorage() {
  return (
    typeof window !==
    "undefined"
  );
}

function readAll():
  GuestChatSession[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw =
      window.localStorage
        .getItem(
          STORAGE_KEY
        );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed
      .filter(
        session =>
          session &&
          typeof session.id ===
            "string"
      )
      .map(
        session => ({
          ...session,
          messages:
            Array.isArray(
              session.messages
            )
              ? session.messages
              : [],
        })
      );
  } catch {
    return [];
  }
}

function writeAll(
  sessions:
    GuestChatSession[]
) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      sessions
    )
  );
}

export function listGuestChatSessions() {
  return readAll()
    .sort(
      (a, b) =>
        new Date(
          b.updated_at ??
            b.created_at
        ).getTime() -
        new Date(
          a.updated_at ??
            a.created_at
        ).getTime()
    )
    .map(
      ({
        messages,
        ...session
      }) => session
    );
}

export function getGuestChatSession(
  sessionId: string
) {
  return (
    readAll().find(
      session =>
        session.id ===
        sessionId
    ) ?? null
  );
}

export function createGuestChatSession(
  input: {
    userId?: string | null;
    title: string;
    tripPreferences: any;
    aiModel:
      | "gemini"
      | "gpt"
      | "claude";
  }
) {
  const now =
    new Date()
      .toISOString();

  const session:
    GuestChatSession = {
      id:
        `guest-${crypto.randomUUID()}`,
      user_id:
        input.userId ??
        null,
      title:
        input.title,
      trip_preferences:
        input.tripPreferences,
      ai_model:
        input.aiModel,
      created_at:
        now,
      updated_at:
        now,
      messages: [],
    };

  const sessions =
    readAll();

  writeAll([
    session,
    ...sessions,
  ]);

  return session;
}

export function updateGuestChatSession(
  sessionId: string,
  patch:
    Partial<
      Pick<
        GuestChatSession,
        | "title"
        | "trip_preferences"
        | "ai_model"
      >
    >
) {
  const now =
    new Date()
      .toISOString();

  const sessions =
    readAll();

  let updated:
    GuestChatSession | null =
      null;

  const next =
    sessions.map(
      session => {
        if (
          session.id !==
          sessionId
        ) {
          return session;
        }

        updated = {
          ...session,
          ...patch,
          updated_at:
            now,
        };

        return updated;
      }
    );

  writeAll(next);

  return updated;
}

export function appendGuestChatMessage(
  sessionId: string,
  input: {
    userId?: string | null;
    role: "user" | "ai";
    content: string;
    plannerJson?: any[] | null;
  }
) {
  const sessions =
    readAll();

  const now =
    new Date()
      .toISOString();

  const message:
    GuestChatMessage = {
      id:
        `guest-message-${crypto.randomUUID()}`,
      session_id:
        sessionId,
      user_id:
        input.userId ??
        null,
      role:
        input.role,
      content:
        input.content,
      planner_json:
        input.plannerJson ??
        null,
      created_at:
        now,
    };

  const next =
    sessions.map(
      session => {
        if (
          session.id !==
          sessionId
        ) {
          return session;
        }

        return {
          ...session,
          updated_at:
            now,
          messages: [
            ...session.messages,
            message,
          ],
        };
      }
    );

  writeAll(next);

  return message;
}

export function updateLatestGuestPlannerMessage(
  sessionId: string,
  plannerJson: any[]
) {
  const sessions =
    readAll();

  let updated = false;

  const next =
    sessions.map(
      session => {
        if (
          session.id !==
          sessionId
        ) {
          return session;
        }

        const messages = [
          ...session.messages,
        ];

        for (
          let index =
            messages.length - 1;
          index >= 0;
          index -= 1
        ) {
          const message =
            messages[index];

          if (
            message.role ===
              "ai" &&
            Array.isArray(
              message.planner_json
            )
          ) {
            messages[index] = {
              ...message,
              planner_json:
                plannerJson,
            };

            updated = true;
            break;
          }
        }

        return {
          ...session,
          updated_at:
            new Date()
              .toISOString(),
          messages,
        };
      }
    );

  writeAll(next);

  return updated;
}

export function isGuestChatId(
  sessionId:
    string | null | undefined
) {
  return Boolean(
    sessionId?.startsWith(
      "guest-"
    )
  );
}
