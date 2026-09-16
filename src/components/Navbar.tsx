import { useState } from "react";
import { Search, Menu, X, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

const navLinks = [
  "Home",
  "Destinations",
  "Recommendations",
  "Travel Tips",
  "About",
];

interface NavbarProps {
  onSearch?: (query: string) => void;
}

const Navbar = ({ onSearch }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleLogin = () => {
    navigate({ to: "/login" });
  };

  const handleRegister = () => {
    navigate({ to: "/register" });
  };

  return (
    <nav
      className="
        fixed
        left-0
        right-0
        top-0
        z-50
        border-b
        border-white/70
        bg-white/60
        backdrop-blur-2xl
      "
    >
      <div
        className="
          container
          mx-auto
          flex
          h-[72px]
          items-center
          justify-between
          px-4
        "
      >
        {/* Logo */}
        <a
          href="#home"
          className="flex items-center gap-2"
        >
          <div
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              bg-gradient-to-br
              from-[#c8a9d8]
              to-[#e9a8c9]
              shadow-sm
            "
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>

          <span
            className="
              text-xl
              font-extrabold
              tracking-tight
              text-[#573d63]
            "
          >
            TravelWise.
          </span>
        </a>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(" ", "-")}`}
              className="
                text-sm
                font-semibold
                text-[#6f687e]
                transition-colors
                hover:text-[#7c5a8f]
              "
            >
              {link}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <form
            onSubmit={handleSearch}
            className="
              flex
              items-center
              gap-2
              rounded-full
              border
              border-white/80
              bg-white/55
              px-3
              py-2
              backdrop-blur-md
            "
          >
            <Search className="h-4 w-4 text-[#8b8498]" />

            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-24
                bg-transparent
                text-sm
                text-[#302b43]
                outline-none
                placeholder:text-[#9b94a8]
                lg:w-28
              "
            />
          </form>

          <button
            onClick={handleLogin}
            className="
              rounded-full
              px-4
              py-2
              text-sm
              font-semibold
              text-[#573d63]
              transition-all
              hover:bg-white/70
            "
          >
            Login
          </button>

          <button
            onClick={handleRegister}
            className="
              rounded-full
              bg-gradient-to-r
              from-[#b89bcb]
              to-[#e9a8c9]
              px-5
              py-2.5
              text-sm
              font-bold
              text-white
              shadow-md
              shadow-[#b89bcb]/20
              transition-all
              hover:-translate-y-0.5
              hover:shadow-lg
            "
          >
            Sign Up
          </button>
        </div>

        {/* Mobile button */}
        <button
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-white/60
            text-[#573d63]
            md:hidden
          "
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="
            border-t
            border-white/70
            bg-white/75
            px-4
            pb-5
            pt-4
            backdrop-blur-2xl
            md:hidden
          "
        >
          <form
            onSubmit={handleSearch}
            className="
              mb-4
              flex
              items-center
              gap-2
              rounded-2xl
              border
              border-white/80
              bg-white/60
              px-4
              py-3
            "
          >
            <Search className="h-4 w-4 text-[#8b8498]" />

            <input
              type="text"
              placeholder="Search destinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                flex-1
                bg-transparent
                text-sm
                text-[#302b43]
                outline-none
                placeholder:text-[#9b94a8]
              "
            />
          </form>

          <div className="space-y-1">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="
                  block
                  rounded-xl
                  px-3
                  py-2.5
                  text-sm
                  font-semibold
                  text-[#6f687e]
                  transition-colors
                  hover:bg-white/70
                  hover:text-[#7c5a8f]
                "
                onClick={() => setMobileOpen(false)}
              >
                {link}
              </a>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleLogin}
              className="
                flex-1
                rounded-full
                border
                border-[#c8a9d8]/40
                bg-white/60
                py-2.5
                text-sm
                font-semibold
                text-[#573d63]
              "
            >
              Login
            </button>

            <button
              onClick={handleRegister}
              className="
                flex-1
                rounded-full
                bg-gradient-to-r
                from-[#b89bcb]
                to-[#e9a8c9]
                py-2.5
                text-sm
                font-bold
                text-white
              "
            >
              Sign Up
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;