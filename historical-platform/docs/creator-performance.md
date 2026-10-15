# Creator performance reporting

`/creator#creator-performance` extends the existing authenticated creator dashboard for free and premium projects. It does not change pricing or entitlements.

Campaign links use a creator-owned world URL with `utm_source` from a fixed list and a 1–48 character lowercase campaign slug. The tracker reads only this label and a broad referral category, never submitting full referrer URLs. The server validates input, excludes signed-in owners and recognized bots, honors DNT/GPC and opt-out, and retains first-recorded attribution for each existing 30-minute project visit. Old rows receive `unknown` and an empty campaign; historical attribution is not invented.

Conversion counts distinct visits with at least one website click, divided by recorded visits. Both the visit and its qualifying click must fall inside the selected period. Repeated clicks do not increase the rate. The table and campaign CSV show the 50 largest source/campaign groups in the selected project/period. Account ownership is checked on every query. The existing daily CSV remains unchanged.

Weekly text reports use the project selection and the last seven complete UTC days, compared with the preceding seven. The current partial day is excluded. Reports are on demand, not scheduled messages. Accounts, wallets and visitor identifiers never appear in exports. Earlier periods may have incomplete coverage. Campaign names are public labels and must not contain personal information.

Validation: creator-dashboard, creator-performance and growth-client tests, TypeScript and the production build. Native browser/iPhone layout testing remains unavailable in this environment.
