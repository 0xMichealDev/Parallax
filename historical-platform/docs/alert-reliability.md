# Alert reliability update

Wallet alerts continue to cover individual native SOL transfers. This update does not add token price or liquidity monitoring.

Before issuing a Telegram pairing link, the server reads the bot's callback configuration, restores the fixed PARALLAX callback and its existing secret, and reads the configuration back. Pending Telegram updates are preserved. A bot attached to another URL is not overwritten; pairing reports that owner review is needed. Provider failure never produces a connection link. Bot tokens and external callback URLs are not returned to the browser. Owner controls include an explicit callback repair action, with the same identity and quota checks as existing diagnostics. Callback registration does not establish end-to-end delivery.

The browser checks pairing when the user returns from Telegram, discards stale connection responses, and disables delivery controls when connection status is unavailable. Refreshes do not send messages. Test delivery remains an explicit account action, and no wallet rule is enabled by pairing or testing.

Delivery can recover from a definite Telegram 429 with a delay of at most five seconds when it fits within the existing 18-second processing budget. The three-attempt limit, global cooldown, lease, duplicate protection, and no-resend policy for uncertain deliveries are preserved. Longer cooldowns remain queued for a later authenticated provider callback or explicit account recovery. No independent background retry schedule is installed. Queue responses now report remaining work; account health exposes the shared cooldown so recovery controls stay disabled until eligible.

Verification: control-service integration tests cover callback repair, foreign callbacks, redirect rejection, failed setup, owner-only repair, short and long cooldowns, and existing account/destination boundaries. UI tests cover stale state, returning from Telegram, button state, and cooldown gating. Managed browser/device QA and a real account's Telegram delivery test require follow-up on the published site.
