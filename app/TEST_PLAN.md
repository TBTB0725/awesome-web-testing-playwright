# Trello Clone Test Plan

## Scope

This plan covers the `app/` Trello clone: a Vue/Vite frontend, Pinia store, local json-server backend, and Playwright end-to-end tests. The app exposes these user-facing routes:

- `/`: board list
- `/board/:board`: board detail with lists and cards
- `/board/:board?card=:card`: card detail modal
- `/login`: login form
- `/signup`: signup form
- `/pricing`: plan selection and geolocation pricing view
- unknown routes: 404 page

Exploration was performed with Playwright MCP against `http://localhost:3000`.

## Test Objectives

- Validate the core board workflow from empty or seeded data through board, list, card, and card detail operations.
- Verify account flows for signup, login, logout, private board visibility, and authentication error states.
- Protect state-changing API behavior with deterministic setup and cleanup.
- Cover keyboard-only utility features such as search, API tools, and dismiss behavior.
- Catch regressions in routing, loading/error states, and browser compatibility.

## Test Data Strategy

- Prefer API setup through Playwright `request` for boards, lists, cards, and users.
- Use unique names per test, for example `Board ${testInfo.project.name} ${Date.now()}`.
- Reset only the data each test owns when possible. Use `/api/reset` for isolated suites or serial smoke runs.
- Avoid depending on existing `backend/data/database.json` records because the file currently contains test residue.
- Do not let tests share created boards unless the suite is explicitly serial.
- Keep uploaded test files small and checked into a fixture directory.

## Priority 0: Smoke And App Health

- Start app with Playwright `webServer` and verify `/` renders `My Boards` or the empty-list state.
- Verify there are no blocking console errors during initial load.
- Confirm `home` navigation from board, login, signup, pricing, and 404 pages returns to `/`.
- Verify unknown route displays the 404 page and `Go back home` link works.
- Check footer external link has the expected destination.

## Priority 0: Board Workflow

- Board list displays all public boards and separates starred boards from non-starred boards.
- Create a board from `Create new board`, assert redirect to `/board/:id`, and assert title input contains the created name.
- Rename a board from the board title input and verify persistence after reload.
- Star and unstar a board from both board list hover action and board detail action.
- Delete a board from `Board actions`, verify navigation back to `/`, and verify board is no longer listed.
- Verify direct access to a nonexistent board shows the board loading error state with a home link.
- Verify board list empty state after resetting boards.

## Priority 0: List Workflow

- Create the first list from `Add list` and assert the list title input contains the submitted name.
- Create multiple lists and verify order on the page.
- Rename a list and verify persistence after reload.
- Delete a list from `List actions`; verify its cards are removed from the board UI.
- Use `List actions -> Add another card` and verify the card input opens for that list.
- Reorder lists with drag and drop and verify persisted order after reload.

## Priority 0: Card Workflow

- Add a card to a list and verify it appears in the correct list.
- Add multiple cards and verify displayed order.
- Open card detail by clicking a card; assert URL changes to `?card=:id`.
- Close card detail via close icon, backdrop click, and route change; assert query param is removed.
- Rename a card in the detail modal and verify persistence on board and after reload.
- Edit card description and verify persistence after reopening.
- Toggle card completion and verify `COMPLETED` appears near the due date.
- Set a due date with the date picker and verify the formatted date updates.
- Verify overdue state for a past due uncompleted card.
- Use `Copy attributes` and assert clipboard receives JSON and success notification appears.
- Delete a card from detail and verify it disappears from the board and the modal closes.
- Upload an image attachment, verify preview, download link, and delete attachment behavior.

## Priority 1: Search And Tools

- Press `Meta+K` to open search, type a card name, and verify matching results link to `/board/:id?card=:id`.
- Clear the search input and verify results disappear.
- Click away and press `Esc`; verify search closes.
- Press `F2` to open API tools; verify buttons for `All`, `Boards`, `Lists`, `Cards`, and `Users` are present.
- Press `Esc`; verify API tools closes.
- Validate each reset action in a dedicated serial suite so it does not affect unrelated tests.

## Priority 1: Authentication

- Signup with a new email/password and verify success notification, logged-in user display, auth cookie, and redirect to `/`.
- Signup duplicate email and verify error notification.
- Signup with `Send me a welcome email` checked and verify the attempted welcome email request is handled without breaking signup.
- Login with valid credentials and verify logged-in state and private board access.
- Login with invalid credentials and verify error notification.
- Logout from the logged-user menu and verify auth header/cookie are cleared and public board list is shown.
- Load the app with an invalid `auth_token` cookie and verify `Invalid authorization` notification and cookie cleanup.
- Verify private boards are visible only to their owner; unauthenticated or other users receive a 403-style loading error.
- If Google login is enabled in env, mock the OAuth response and verify oauth signup/login paths.

## Priority 1: Pricing

- Verify default pricing shows Basic, Pro, and Enterprise in USD with Pro selected.
- Select each plan and assert only the chosen plan has the active visual state.
- Mock `/api/location` responses for USD, EUR, and GBP countries and verify currency symbols/prices update.
- Mock discount-eligible country response and verify discount banner text.
- Stub `navigator.geolocation.getCurrentPosition`, click `Find my location`, and verify the Leaflet map container initializes.
- Verify geolocation unavailable or denied does not break the page.

## Priority 1: API Contract Tests

- `GET /api/boards` returns public boards and authenticated user's private boards.
- `GET /api/boards?starred=true|false` filters booleans correctly.
- `GET /api/boards?id=:id` and `name=:name` filters work with numeric and encoded values.
- `POST /api/boards` requires `name`, sets `user`, `starred=false`, and `created`.
- `POST /api/lists` requires `boardId` and sets `created`.
- `POST /api/cards` requires `boardId`, `listId`, and `name`; sets `created`, default `deadline`, empty `description`, and `completed=false`.
- `PATCH` board/list/card endpoints persist edits used by UI flows.
- `DELETE /api/boards/:id`, `/api/lists/:id`, `/api/cards/:id` return expected status and state.
- Bulk reset endpoints clear only their target resources.
- Upload endpoint accepts valid image fixture and rejects invalid/oversized file fixtures.

## Priority 2: Accessibility

- Main routes have sensible keyboard focus order and no keyboard traps.
- Board/list/card creation is usable without a mouse.
- Modal focus should move into card detail and return to the card after close.
- Inputs and buttons should have accessible names; icon-only controls need labels or reliable test ids.
- Run an automated axe scan on `/`, `/board/:id`, card detail, `/login`, `/signup`, and `/pricing`.

## Priority 2: Responsive And Cross-Browser

- Run core P0 E2E suite in Chromium, Firefox, and WebKit.
- Add mobile viewport smoke coverage for board list, board detail horizontal scroll, card detail modal, login, signup, and pricing.
- Verify text does not overflow on narrow screens for board cards, list titles, modal actions, and pricing cards.
- Verify drag/drop list ordering in Chromium and at least one non-Chromium browser.

## Priority 2: Error And Resilience

- Mock board list API failure and verify `LoadingError` state.
- Mock board detail 404/403 and verify status/message and home link.
- Mock card/list creation failures and verify error notification while preserving input state.
- Verify slow API responses show loading states where implemented.
- Verify the app recovers after reload on direct deep links like `/board/:id?card=:cardId`.

## Automation Structure

- Keep page objects for `MyBoardsPage`, `BoardPage`, and add `CardDetailPage`, `AuthPage`, `PricingPage`.
- Add API fixture helpers: `createBoard`, `createList`, `createCard`, `createUser`, `cleanupOwnedData`.
- Use `test.step` for multi-action flows to make reports readable.
- Use `data-testid` selectors already present in the app before text selectors for controls with unstable labels.
- Use storage state only for tests that intentionally need an authenticated session.
- Keep destructive reset tests in a separate file configured as serial.

## Suggested Execution Matrix

- Pull request smoke: Chromium P0 smoke plus API contract happy paths.
- Main branch: Chromium P0/P1 full suite.
- Nightly: Chromium, Firefox, WebKit, mobile smoke, accessibility scan, upload tests, and visual snapshots for key pages.

## Entry Criteria

- `npm install` has completed in `app/`.
- `npm start` can serve frontend on `3000` and backend on `3001`.
- Test data reset or isolation strategy is selected before running suites in parallel.

## Exit Criteria

- All P0 tests pass in Chromium.
- No known blocker bugs remain for board/list/card creation and editing.
- P1 failures are triaged and either fixed or tracked.
- Test report, trace for failures, and console logs are available from CI.
