<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Bundle the navigation logo as a directly imported image in src/assets so downloaded source works without Lovable asset serving.
- Staff data tables have RLS on with no client policies; all reads/writes go through server functions using the admin client, because the public must never reach the data directly.
- The tapp staff area uses a shared password (server secret `TAPP_STAFF_PASSWORD`) checked server-side, with an encrypted session cookie; every admin server function re-checks the session, because route guards only protect UI.
- Uploaded images live in a private bucket and are shown to admins via short-lived signed URLs, so links never become public.
- Failed staff login attempts are rate-limited via a DB table keyed by hashed IP, because workers are stateless.
