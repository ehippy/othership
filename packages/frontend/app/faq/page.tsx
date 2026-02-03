import React from "react";
import { Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { FAQSection } from "@/components/FAQSection";
import { useOptionalAuth } from "@/lib/hooks/useAuth";
import { useGuildSelection } from "@/lib/hooks/useGuildSelection";

export default function FAQPage() {
  const { isLoading, user, logout } = useOptionalAuth();
  const { selectedGuild, selectGuild } = useGuildSelection();

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Frequently Asked Questions</h1>

          <div className="space-y-8">
            <FAQSection id="what-is-derelict" question="What is DERELICT?">
              <p>
                DERELICT is a cooperative browser-based survival horror game set in space. 
                Players navigate derelict spaceships, manage stress and resources, fight monsters, 
                and coordinate through Discord while exploring grid-based maps in a web interface. 
                Think FTL meets Alien Isolation with Mothership RPG mechanics.
              </p>
            </FAQSection>

            <FAQSection id="how-to-add-bot" question="How do I add the bot to my Discord server?">
              <p>
                Only server administrators can add the DERELICT bot. If you see a 🔒 lock icon 
                when browsing servers, you'll need to request that someone with admin permissions adds the bot.
              </p>
              <p>You could also create your own Discord server and add the bot there to try it out!</p>
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
                The game channel is where the DERELICT bot posts game updates, turn notifications, 
                and atmospheric messages. We recommend creating a dedicated channel called <span className="text-indigo-400">#derelict</span> for 
                the best experience. Server admins can configure this in the admin settings panel on the guild page.
              </p>
            </FAQSection>

            <FAQSection id="opt-in" question="How do I join a game?">
              <p>
                First, log in with your Discord account. Then navigate to your server's page and click 
                "Join Roster" in the player roster section. Once opted in, you'll be ready to play when 
                an admin starts a game session.
              </p>
            </FAQSection>

            <FAQSection id="permissions" question="What permissions does the bot need?">
              <p>
                The DERELICT bot requires the following permissions:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Read Messages/View Channels</strong> - To see the game channel</li>
                <li><strong>Send Messages</strong> - To post game updates and notifications</li>
              </ul>
            </FAQSection>

            <FAQSection id="contact" question="How do I report a bug or request a feature?">
              <p>
                DERELICT is in active development. For bug reports, feature requests, or general feedback, 
                please reach out via Discord or check the project repository for issue tracking.
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

      {/* Top bar */}
      <TopBar
        avatar={user?.avatar || null}
        discordUserId={user?.discordUserId || null}
        username={user?.username || null}
        onLogout={logout}
        onSelectGuild={selectGuild}
        selectedGuildName={selectedGuild?.name}
        selectedGuildId={selectedGuild?.id || null}
        selectedGuildIcon={selectedGuild?.icon || null}
      />
    </main>
  );
}
