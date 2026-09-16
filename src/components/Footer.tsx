import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Sparkles,
} from "lucide-react";

const Footer = () => {
  return (
    <footer
      className="
        relative
        overflow-hidden
        border-t
        border-white/70
        bg-[#eee5f3]
        py-16
        text-[#302b43]
      "
    >
      {/* Aurora decorations */}
      <div
        className="
          pointer-events-none
          absolute
          -top-24
          left-1/4
          h-64
          w-64
          rounded-full
          bg-[#e9a8c9]/25
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-24
          right-1/4
          h-64
          w-64
          rounded-full
          bg-[#a9dce8]/25
          blur-3xl
        "
      />

      <div className="relative z-10 container mx-auto px-4">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-2xl
                  bg-gradient-to-br
                  from-[#c8a9d8]
                  to-[#e9a8c9]
                  shadow-sm
                "
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>

              <h3 className="text-2xl font-bold">
                TravelWise.
              </h3>
            </div>

            <p className="max-w-sm text-sm leading-relaxed text-[#6f687e]">
              Discover your perfect travel destination with personalized
              recommendations tailored to your unique interests and
              preferences.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 font-bold text-[#302b43]">
              Quick Links
            </h4>

            <ul className="space-y-2.5 text-sm text-[#6f687e]">
              {[
                "Home",
                "Destinations",
                "Recommendations",
                "Travel Tips",
                "About",
              ].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase().replace(" ", "-")}`}
                    className="
                      transition-colors
                      hover:text-[#7c5a8f]
                    "
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="mb-4 font-bold text-[#302b43]">
              Follow Us
            </h4>

            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map(
                (Icon, index) => (
                  <a
                    key={index}
                    href="#"
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-white/80
                      bg-white/60
                      text-[#6f687e]
                      shadow-sm
                      backdrop-blur-md
                      transition-all
                      duration-200
                      hover:-translate-y-1
                      hover:bg-white
                      hover:text-[#7c5a8f]
                    "
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                )
              )}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div
          className="
            mt-12
            border-t
            border-[#302b43]/10
            pt-8
            text-center
            text-sm
            text-[#8b8498]
          "
        >
          © {new Date().getFullYear()} TravelWise. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;