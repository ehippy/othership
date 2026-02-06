import React from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { FAQSection } from "@/components/FAQSection";
import { AVATAR_LIST } from "@/lib/avatars";

export default function FAQPage() {
  const [avatarIndex, setAvatarIndex] = React.useState(
    Math.floor(Math.random() * AVATAR_LIST.length)
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setAvatarIndex(Math.floor(Math.random() * AVATAR_LIST.length));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">
            Frequently Asked Questions
          </h1>

          <div className="space-y-8">

            <FAQSection id="what-is-derelict" question="What is DERELICT?">
              <p>
                DERELICT is a cooperative browser-based survival horror game set
                in space. Players navigate derelict spaceships, manage stress
                and resources, fight monsters, and coordinate through Discord
                while exploring grid-based maps in a web interface. Think FTL
                meets Alien Isolation.
              </p>
              <p>
                The game is built on the <strong>Mothership RPG</strong> Panic Engine by Tuesday Knight Games, 
                using their stress mechanics, skill checks, and deadly combat to create tense, 
                atmospheric horror experiences. If you enjoy DERELICT, check out the full{" "}
                <a 
                  href="https://www.mothershiprpg.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  Mothership tabletop RPG
                </a>.
              </p>
            </FAQSection>

            <FAQSection
              id="how-to-add-bot"
              question="How do I add the bot to my Discord server?"
            >
              <p>
                Only server administrators can add the DERELICT bot. If you see
                a 🔒 lock icon when browsing servers, you'll need to request
                that someone with admin permissions adds the bot.
              </p>
              <p>
                You could also create your own Discord server and add the bot
                there to try it out!
              </p>
              <p>
                <strong>If you're an admin:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Go to the server selector in the top-left corner</li>
                <li>Find your server in the list</li>
                <li>Click the "Add Bot" button</li>
                <li>Authorize the bot with the requested permissions</li>
                <li>Select a game channel in the admin settings</li>
              </ol>
            </FAQSection>

            <FAQSection id="game-channel" question="What is a game channel?">
              <p>
                The game channel is where the DERELICT bot posts game updates,
                turn notifications, and atmospheric messages. We recommend
                creating a dedicated channel called{" "}
                <span className="text-indigo-400">#derelict</span> for the best
                experience. Server admins can configure this in the admin
                settings panel on the guild page.
              </p>
            </FAQSection>

            <FAQSection id="opt-in" question="How do I join a game?">
              <p>
                First, log in with your Discord account. Then navigate to your
                server's page and click "Join Roster" in the player roster
                section. Once opted in, you'll be ready to play when an admin
                starts a game session.
              </p>
            </FAQSection>


            <FAQSection
              id="avatars"
              question="Who made these character avatars?"
            >
              <img
                src={AVATAR_LIST[avatarIndex]}
                alt="Character avatar"
                className="float-right ml-4 mb-4 w-32 h-32 rounded-lg border-2 border-indigo-500 transition-opacity duration-500"
              />
              <p>
                All character avatars were{" "}
                <a
                  href="https://bsky.app/profile/d20plusmodifier.bsky.social/post/3m5k4xin5cs2y"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  created and open-sourced
                </a>{" "}
                by <strong>Kyle Ferrin</strong>, for the excellent{" "}
                <a
                  href="https://samsorensen.blot.im/mothership-month-2025-wargame-over/under"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  OVER/UNDER
                </a>{" "}
                project in late 2025. Kyle is the incredible artist behind games
                like Root, Arcs, and Oath. Kyle's distinctive art style
                perfectly captures the gritty, lived-in aesthetic of space
                truckers, hardened marines, synthetic androids, and weary
                scientists trying to survive in the depths of space.
              </p>
              <p>
                You can see more of Kyle's work and kick him some dollars at{" "}
                <a
                  href="https://kyleferrin.bigcartel.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  his store
                </a>
                .
              </p>
            </FAQSection>


            <FAQSection
              id="permissions"
              question="What permissions does the bot need?"
            >
              <p>The DERELICT bot requires the following permissions:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Read Messages/View Channels</strong> - To see the game
                  channel
                </li>
                <li>
                  <strong>Send Messages</strong> - To post game updates and
                  notifications
                </li>
              </ul>
            </FAQSection>

            <FAQSection
              id="contact"
              question="How do I report a bug or request a feature?"
            >
              <p>
                DERELICT is in active development. For bug reports, feature
                requests, or general feedback, please reach out via Discord or
                check the project repository for issue tracking.
              </p>
            </FAQSection>

          </div>

          {/* Back to home link */}
          <div className="mt-12 text-center">
            <Link
              to="/"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
