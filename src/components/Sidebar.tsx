import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
    MessageCircle,
    Briefcase,
    Compass,
    Heart,
    Bell,
    Lightbulb,
    Plus,
    Sparkles,
    MoreHorizontal,
    Menu,
    X,
} from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import ai1Icon from "@/assets/ai/ai1.svg";
import ai2Icon from "@/assets/ai/ai2.svg";
import ai3Icon from "@/assets/ai/ai3.svg";

function getModelIcon(model: string | null) {
    if (!model) return null;

    const m = model.toLowerCase();

    if (m.includes("gemini")) {
        return ai1Icon;
    }

    if (m.includes("gpt")) {
        return ai2Icon;
    }

    if (m.includes("claude")) {
        return ai3Icon;
    }

    return null;
}

function getModelLabel(model: string | null) {
    if (!model) return "AI";

    const m = model.toLowerCase();

    if (m.includes("gemini")) return "AI 1";
    if (m.includes("gpt")) return "AI 2";
    if (m.includes("claude")) return "AI 3";

    return "AI";
}

function getChatTitle(chat: any) {
    const rawTitle = String(chat?.title || "").trim();
    const pref = chat?.trip_preferences || {};

    if (
        rawTitle &&
        rawTitle.toLowerCase() !== "new trip" &&
        rawTitle.toLowerCase() !== "new chat"
    ) {
        return rawTitle;
    }

    if (pref?.province) {
        return `ทริป${pref.province}`;
    }

    if (pref?.days) {
        return `แผนทริป ${pref.days} วัน`;
    }

    return "แชทใหม่";
}

function getTripSummary(chat: any) {
    const pref = chat?.trip_preferences || {};

    const parts = [
        pref?.days
            ? `${pref.days} วัน`
            : null,
        pref?.companion
            ? pref.companion
            : null,
        pref?.budget
            ? `${Number(pref.budget).toLocaleString()} บาท`
            : null,
    ].filter(Boolean);

    return parts.join(" · ");
}

const navItems = [
    {
        icon: MessageCircle,
        label: "Chats",
        to: "/home",
    },
    {
        icon: Briefcase,
        label: "Trips",
        to: "/trips",
    },
    {
        icon: Compass,
        label: "Explore",
        to: "/explore",
    },
    {
        icon: Heart,
        label: "Saved",
        to: "/saved",
    },

    {
        icon: Lightbulb,
        label: "Inspiration",
        to: "/inspiration",
    },
    {
        icon: Plus,
        label: "Create",
        action: "create",
    },
];

export default function Sidebar({
    user,
    chatSessions: parentChatSessions,
    onSelectChat,
    onNewChat,
}: any) {

    const navigate = useNavigate();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const media = window.matchMedia("(max-width: 767px)");
        const update = () => {
            setIsMobile(media.matches);
            if (!media.matches) setMobileOpen(false);
        };
        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);

    const sidebarContent = <>
    {/* ================= HEADER ================= */}
    <div className="px-5 py-5 flex items-center gap-2 shrink-0 text-[#6f456f]">
        <Sparkles className="h-6 w-6" />
        <span className="text-lg font-semibold tracking-tight">
            TravelWise.
        </span>
    </div>


    {/* ================= MAIN CONTENT ================= */}
    <div className="flex-1 min-h-0 flex flex-col">

        {/* Navigation */}
        <nav className="px-2 shrink-0">

            {navItems.map((n) => (
                <div key={n.label}>

                    {n.to ? (

                        <Link
                            to={n.to}
                            onClick={() => setMobileOpen(false)}
                            className="
                                w-full
                                flex
                                items-center
                                gap-3
                                px-3
                                py-2.5
                                text-sm
                                rounded-md
                                hover:bg-accent
                                text-sidebar-foreground
                            "
                        >
                            <n.icon className="h-[18px] w-[18px]" />
                            <span className="flex-1 text-left">
                                {n.label}
                            </span>
                        </Link>

                    ) : (

                        <button
                            onClick={() => {

                                if (n.action === "create") {
                                    setShowCreateModal(true);
                                    setMobileOpen(false);
                                }

                            }}
                            className="
                                w-full
                                flex
                                items-center
                                gap-3
                                px-3
                                py-2.5
                                text-sm
                                rounded-md
                                hover:bg-accent
                                text-sidebar-foreground
                            "
                        >
                            <n.icon className="h-[18px] w-[18px]" />

                            <span className="flex-1 text-left">
                                {n.label}
                            </span>
                        </button>

                    )}

                </div>
            ))}


            {/* New Chat */}
            <button
                onClick={() => {
                    setMobileOpen(false);
                    onNewChat?.();
                }}
                className="
                    mt-4
                    w-full
                    text-sm
                    font-medium
                    pastel-secondary
                    hover:bg-white/80
                    rounded-full shadow-sm
                    py-2.5
                "
            >
                + New chat
            </button>

        </nav>


        {/* ================= RECENT CHATS ================= */}
        <div className="mt-5 flex-1 min-h-0 flex flex-col">

            <h3
                className="
                    text-xs
                    text-muted-foreground
                    px-3
                    mb-2
                    shrink-0
                "
            >
                Recent chats
            </h3>


            {/* Scrollable chat list */}
            <div
                className="
                    flex-1
                    min-h-0
                    overflow-y-auto
                    px-2
                    pb-2
                "
            >

                {parentChatSessions?.map((chat: any) => (

                    <button
                        key={chat.id}
                        onClick={() => {

                            console.log("CLICK CHAT:", chat.id);

                            setMobileOpen(false);
                            onSelectChat?.(chat.id);

                        }}
                        className="
                            w-full
                            text-left
                            px-3
                            py-2
                            rounded-lg
                            hover:bg-accent
                            text-sm
                            truncate
                            flex
                            items-start
                        "
                    >

                        {getModelIcon(chat.ai_model) ? (

                            <img
                                src={getModelIcon(chat.ai_model)!}
                                alt={getModelLabel(chat.ai_model)}
                                title={getModelLabel(chat.ai_model)}
                                className="
                                    mt-0.5
                                    mr-2
                                    h-[20px]
                                    w-[20px]
                                    rounded-md
                                    object-contain
                                    shrink-0
                                "
                            />

                        ) : (

                            <MessageCircle
                                size={16}
                                className="mt-0.5 mr-2 shrink-0"
                            />

                        )}

                        <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                                {getChatTitle(chat)}
                            </span>

                            {getTripSummary(chat) && (
                                <span className="
                                    mt-0.5
                                    block
                                    truncate
                                    text-[10px]
                                    font-normal
                                    text-muted-foreground
                                ">
                                    {getTripSummary(chat)}
                                </span>
                            )}
                        </span>

                    </button>

                ))}

            </div>

        </div>

    </div>


    {/* ================= USER PROFILE ================= */}
    <div className="border-t border-border p-3 flex items-center gap-2 shrink-0">

        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 shrink-0" />

        <div className="flex-1 min-w-0">

            <div className="text-sm font-medium truncate">
                {user?.user_metadata?.full_name ||
                    user?.email ||
                    "Guest"}
            </div>

            <div className="text-xs text-muted-foreground truncate">
                {user?.email}
            </div>

        </div>

        <MoreHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />

    </div>


    {/* ================= FOOTER ================= */}
    <div
        className="
            px-4
            pb-4
            text-[11px]
            text-muted-foreground
            space-x-2
            shrink-0
        "
    >

        <span>Company</span>
        ·
        <span>Contact</span>
        ·
        <span>Help</span>

        <br />

        <span>Terms</span>
        ·
        <span>Privacy</span>

        <div className="mt-1">
            © 2026 TravelWise, Inc.
        </div>

    </div>
    </>;

    return (<>
        {isMobile ? (
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
                <Dialog.Trigger asChild>
                    <button type="button" aria-label="Open sidebar" className="travel-menu-trigger">
                        <Menu className="h-5 w-5" />
                    </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                    <Dialog.Overlay className="travel-menu-overlay" />
                    <Dialog.Content className="travel-mobile-drawer" aria-describedby={undefined}>
                        <Dialog.Title className="sr-only">TravelWise navigation</Dialog.Title>
                        <Dialog.Close aria-label="Close sidebar" className="travel-menu-close">
                            <X className="h-5 w-5" />
                        </Dialog.Close>
                        {sidebarContent}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        ) : (
            <aside className="travel-sidebar hidden md:flex w-60 shrink-0 flex-col bg-transparent h-screen text-[#573d63]">
                {sidebarContent}
            </aside>
        )}
            {showCreateModal && (

                <div
                    className="
        travel-modal-overlay
        fixed
        inset-0
        bg-black/40
        flex
        items-center
        justify-center
        z-[100]
        p-4
    "
                    onClick={() => setShowCreateModal(false)}
                >


                    <div
                        style={{
                            backgroundColor: "#fffdfb",
                            opacity: 1,
                            backgroundImage: "none",
                            backdropFilter: "none",
                            WebkitBackdropFilter: "none",
                        }}
                        className="
        travel-modal-card
        bg-white
        rounded-3xl
        p-8
        w-full max-w-[420px] max-h-[calc(100dvh-2rem)] overflow-y-auto
        shadow-xl
    "
                        onClick={(e) => e.stopPropagation()}
                    >


                        <h2 className="text-2xl font-semibold">
                            Create New Trip
                        </h2>


                        <p className="text-gray-500 mt-2">
                            Choose how you want to plan your trip
                        </p>



                        <div className="mt-6 space-y-4">


                            <button

                                onClick={() => {

                                    setShowCreateModal(false);

                                    navigate({
                                        to: "/create_withAI"
                                    });

                                }}

                                className="
w-full
border
rounded-2xl
p-5
text-left
hover:bg-gray-50
"

                            >

                                <div className="flex gap-3 items-center">


                                    <div
                                        className="
h-10
w-10
rounded-full
bg-black
text-white
flex
items-center
justify-center
"
                                    >
                                        <Sparkles size={18} />
                                    </div>


                                    <div>

                                        <h3 className="font-semibold">
                                            Plan with AI
                                        </h3>

                                        <p className="text-sm text-gray-500">
                                            AI creates your itinerary
                                        </p>

                                    </div>


                                </div>


                            </button>




                            <button

                                onClick={() => {

                                    setShowCreateModal(false);

                                    navigate({
                                        to: "/create_withManual"
                                    });

                                }}

                                className="
w-full
border
rounded-2xl
p-5
text-left
hover:bg-gray-50
"

                            >

                                <div className="flex gap-3 items-center">


                                    <div
                                        className="
h-10
w-10
rounded-full
bg-gray-100
flex
items-center
justify-center
"
                                    >
                                        <Plus size={18} />
                                    </div>


                                    <div>

                                        <h3 className="font-semibold">
                                            Create Manually
                                        </h3>

                                        <p className="text-sm text-gray-500">
                                            Choose places yourself
                                        </p>

                                    </div>


                                </div>


                            </button>


                        </div>


                    </div>


                </div>

            )}
        </>
    );
    
}
