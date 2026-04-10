Me
--

I have this idea about building apps in a “bubble” of sorts, where the outside world is so isolated that developers can confidently make changes with fast and comprehensive feedback. I’d like to explore how this could work with a DOM. Could tests work purely against a virtual DOM? How would things break when the app hit the real world? How could we mitigate it?

Assistant
---------

Yes. A lot of app logic can live inside that bubble, and a DOM-shaped virtual environment is a very plausible way to do it.

The core tradeoff is:
	•	the more “pure” your DOM bubble is, the faster and more deterministic tests become
	•	the more it differs from the browser, the more reality leaks out later

A useful way to think about it is not “virtual DOM vs real DOM,” but which browser guarantees are you simulating, and which are you explicitly refusing to simulate.

1. Could tests work purely against a virtual DOM?

Yes, for a large class of tests.

A virtual DOM environment can cover:
	•	render logic
	•	component composition
	•	event wiring
	•	state transitions
	•	accessibility tree assertions at the semantic level
	•	focus movement, if modeled
	•	routing logic
	•	form state and validation
	•	async UI flows
	•	DOM mutation expectations
	•	most interaction logic that depends on DOM structure, attributes, and dispatched events

This is already enough to catch a lot of regressions.

If your goal is “developers can refactor aggressively and get immediate confidence,” then a virtual DOM bubble is excellent for:
	•	unit tests
	•	component tests
	•	integration tests around user flows, as long as they do not depend on layout, paint, browser scheduling quirks, or real platform integration

In that setup, the DOM is treated as a structured state machine, not a rendered surface.

2. Where does it break when the app hits the real world?

The biggest failures come from areas where the browser is not just a tree of nodes.

Layout and geometry

Virtual DOM environments usually do not perform real layout.

Things that break:
	•	element size measurement
	•	overflow behavior
	•	line wrapping
	•	sticky/fixed positioning
	•	scrolling containers
	•	collision detection
	•	viewport-relative calculations
	•	responsive breakpoints driven by actual size
	•	drag/drop hit testing
	•	virtualized lists that depend on measured row heights

Anything using:
	•	getBoundingClientRect
	•	offsetWidth/offsetHeight
	•	scrollTop/scrollHeight
	•	ResizeObserver
	•	IntersectionObserver

will either be fake, missing, or wrong unless you model it deliberately.

CSS and rendering

A virtual DOM can know that a class exists, but not what it visually does.

Things that break:
	•	stacking context and z-index issues
	•	hidden-but-clickable overlays
	•	pointer-events problems
	•	theme and cascade bugs
	•	animation timing interactions
	•	media queries
	•	container queries
	•	font loading effects
	•	position: sticky weirdness
	•	transforms affecting hit targets

Real event semantics

Synthetic events are often simpler than browser events.

Things that break:
	•	exact order of pointer, mouse, focus, blur, input, change, key, composition events
	•	default browser actions
	•	selection behavior
	•	IME and composition handling
	•	touch behavior
	•	passive listeners and scroll blocking
	•	pointer capture
	•	label/input interactions
	•	form submission edge cases

A test might dispatch “click” and pass, while the browser requires a more complex chain of pointerdown → focus → pointerup → click.

Timing and scheduling

Browsers have messy scheduling.

Things that break:
	•	microtask/macrotask ordering assumptions
	•	rendering between tasks
	•	requestAnimationFrame
	•	transition/animation completion timing
	•	mutation observer timing
	•	debounce/throttle behavior tied to real frame progression
	•	race conditions with async rendering or hydration

Virtual environments tend to make time too clean.

Browser APIs and environment

The real browser is a platform, not just a DOM.

Things that break:
	•	clipboard
	•	selection
	•	contenteditable
	•	history quirks
	•	navigation APIs
	•	iframe behavior
	•	workers
	•	service workers
	•	storage quotas
	•	network timing
	•	permissions
	•	file inputs
	•	drag-and-drop data transfer
	•	canvas/webgl/video/audio
	•	accessibility behavior in screen readers

Hydration and SSR mismatches

If you render server-side and hydrate client-side, virtual DOM tests often miss:
	•	nondeterministic markup
	•	locale/timezone differences
	•	browser parser normalization
	•	hydration timing issues
	•	third-party scripts mutating markup before hydration

Performance pathologies

A virtual DOM bubble can prove correctness while hiding cost.

Things that break:
	•	layout thrashing
	•	expensive style recalculation
	•	large DOM performance cliffs
	•	scroll jank
	•	memory leaks
	•	event listener buildup
	•	slow hydration
	•	long-task regressions

A test that runs in 20 ms in a fake DOM may become sluggish in a real browser.

3. What’s the right mental model for the bubble?

Treat the virtual DOM as a contract-testing environment, not a browser emulator.

Good bubble:
	•	deterministic
	•	fast
	•	isolated
	•	opinionated
	•	explicit about unsupported reality

Bad bubble:
	•	pretends to be a full browser
	•	silently returns fake values
	•	lets browser-dependent code pass accidentally

The dangerous part is not incompleteness.
The dangerous part is implicit incompleteness.

4. How could we mitigate the gap?

The cleanest approach is a layered test model.

Layer 1: pure logic outside the DOM

Move as much as possible out of the DOM entirely.

Examples:
	•	state machines
	•	reducers
	•	view models
	•	validation
	•	formatting
	•	async orchestration
	•	permission logic
	•	business rules

Then the DOM becomes a thin projection layer.

This gives the strongest bubble.

Layer 2: virtual DOM contract tests

Test the DOM-facing UI in the bubble.

Assert things like:
	•	what is rendered
	•	which ARIA roles/names exist
	•	which callbacks fire
	•	how focus changes
	•	whether state transitions update the DOM correctly

Avoid asserting:
	•	exact pixels
	•	computed layout
	•	timing that depends on rendering
	•	geometry unless you provide a test geometry model

Layer 3: browser capability tests

Create a small set of tests that run in a real browser for everything the bubble cannot faithfully model.

This suite should target:
	•	layout-sensitive components
	•	overlays/popovers/tooltips/modals
	•	drag/drop
	•	scrolling
	•	focus traps
	•	contenteditable
	•	file handling
	•	hydration
	•	responsive behavior
	•	animations/transitions that affect correctness
	•	browser integration APIs

The point is not to duplicate all tests.
It is to cover the boundary where simulation stops being trustworthy.

Layer 4: end-to-end smoke tests

A few real-world flows:
	•	app boot
	•	login
	•	navigation
	•	primary task completion
	•	error handling
	•	one or two critical cross-browser paths

Small but high-signal.

5. How do you design the app so the bubble is maximally useful?

A few architectural rules help a lot.

Separate intent from effect

Instead of components directly reading layout and doing side effects everywhere, isolate environment access behind adapters.

For example:
	•	measureElement(el) instead of raw getBoundingClientRect
	•	scheduleFrame(fn) instead of raw requestAnimationFrame
	•	observeIntersection(...) behind an interface
	•	copyToClipboard(text) behind a capability boundary

Then in the bubble:
	•	you provide deterministic fakes

In the browser:
	•	you provide real implementations

That makes the gap visible and testable.

Treat geometry as data

If a feature depends on layout, pass geometry in as input where possible.

Instead of:
	•	component measures itself in five places

Prefer:
	•	a measurement service produces rectangles
	•	placement logic is pure
	•	tests feed it fake rectangles
	•	a few browser tests confirm the measurement service and integration

This is huge for popovers, menus, DnD, and virtualization.

Use semantic assertions, not implementation assertions

Inside the bubble, assert:
	•	role/name/value/state
	•	visible intent
	•	focused element
	•	enabled/disabled
	•	submitted payload

Avoid:
	•	internal instance details
	•	framework-specific lifecycle details
	•	class names unless they encode real semantics

That keeps tests stable and portable.

Fail loudly on unsupported APIs

Do not let unimplemented browser features quietly return nonsense.

Better:
	•	throw on geometry reads unless explicitly mocked
	•	throw on unsupported observers
	•	throw on unmodeled selection APIs

That forces developers to acknowledge “this feature crosses the bubble boundary.”

Make time explicit

Use controllable clocks and schedulers.

If timing matters:
	•	inject timer APIs
	•	inject animation frame scheduling
	•	control flush points in tests

This prevents fake determinism from hiding races.

6. What would a DOM “bubble” stack actually look like?

A practical stack could look like this:
	•	pure domain logic
	•	UI state layer
	•	DOM renderer targeting a virtual DOM implementation
	•	capability adapters for browser-only features
	•	deterministic scheduler
	•	deterministic network layer
	•	deterministic storage layer
	•	explicit geometry and viewport model
	•	a tiny real-browser verification suite

So the app mostly runs in a sealed world, with a handful of ports to reality.

Those ports are where you concentrate real-browser testing.

7. Which things are safest to trust in a virtual DOM?

Usually safe:
	•	markup structure
	•	text/content changes
	•	attributes
	•	ARIA roles and labels
	•	event-driven state updates
	•	form logic
	•	routing logic
	•	conditional rendering
	•	error states
	•	optimistic UI flows

Less safe:
	•	focus behavior, unless modeled carefully
	•	keyboard interactions with browser defaults
	•	async rendering edge cases

Not safe to trust without browser coverage:
	•	layout
	•	scrolling
	•	measurement
	•	CSS behavior
	•	pointer hit testing
	•	real accessibility behavior with assistive tech
	•	browser-native widgets
	•	media/canvas/contenteditable
	•	performance

8. Where do teams usually go wrong?

Three common mistakes:

“Everything can be tested in the fake DOM”

That leads to false confidence.

“The fake DOM should behave exactly like Chrome”

That becomes an endless browser-reimplementation project.

“Since some things need a browser, we should test everything there”

That throws away speed and isolation.

The sweet spot is:
	•	test most logic in the bubble
	•	test reality-dependent behavior at the seams
	•	design the app so those seams are narrow

9. A good rule of thumb

Ask of each feature:

Is this about document structure and interaction intent, or about actual browser rendering and platform behavior?

If it is mostly structure and intent:
	•	virtual DOM is enough

If it depends on rendering/platform behavior:
	•	browser verification is required

10. The strongest version of your idea

The strongest version is not “apps built against a fake DOM.”

It is:

apps built against a constrained UI runtime whose DOM layer is mostly virtual, with explicit capability boundaries for layout, timing, and platform effects

That gives:
	•	fast feedback
	•	reproducibility
	•	confidence during refactors
	•	fewer flaky tests
	•	clear visibility into what still depends on reality

And then the browser becomes an integration target, not the primary development environment.

A useful slogan for the design would be:

simulate structure, isolate effects, verify reality at the edges

If you want, I can sketch what this architecture would look like as a concrete testing pyramid and runtime API.

Me
--

What about how this is bound to say react? Should it use react virtual dom abstractions or its own,

Assistant
---------

Usually its own, unless your goal is specifically “a better React test/runtime.”

Using React’s abstractions directly gives you leverage, but it also makes your bubble inherit React’s shape, constraints, and future changes.

The decision is really about what you want the bubble to be:

If you build on React’s virtual DOM/runtime abstractions

You get:
	•	immediate compatibility with React apps
	•	reuse of React reconciliation, scheduling, hooks semantics, context, portals, etc.
	•	less surface area to invent
	•	easier adoption for existing teams

But you also accept:
	•	your “bubble” is not really a general app runtime, it is a React-hosted environment
	•	React internals and behavioral shifts can leak into your model
	•	tests may validate “works under React semantics” more than “works under DOM semantics”
	•	portability to other UI systems becomes weak
	•	React-specific artifacts become part of your architecture

This is a good choice if the product is:
	•	a React-first development environment
	•	a React renderer / host config
	•	a React-native-style “DOM bubble renderer”
	•	a test/runtime optimized for React apps specifically

In that case, the right mental model is:
build a custom React renderer or host environment, not a whole independent UI abstraction.

If you build your own abstraction

You get:
	•	control over what the bubble means
	•	explicit semantics for DOM, timing, layout, events, effects
	•	framework independence
	•	the ability to support React, Vue, Svelte, or others as frontends onto the same runtime
	•	a cleaner contract between “UI intent” and “platform realization”

But then you must define:
	•	node model
	•	mutation model
	•	event model
	•	scheduling model
	•	effect boundaries
	•	focus semantics
	•	accessibility semantics
	•	adapters to real frameworks

That is more work, but architecturally stronger if your vision is bigger than React.

The key distinction

There are really three layers here:

1. Framework layer

React components, hooks, reconciliation, suspense, etc.

2. UI runtime layer

Tree, events, focus, effects, scheduling, capabilities, semantics.

3. Platform layer

Browser DOM, CSSOM, layout engine, input system, accessibility tree, network, storage.

If your bubble is meant to be durable, it should probably live mostly at layer 2, not be defined by layer 1.

So React should ideally be one client of the bubble, not the definition of the bubble.

Practical answer

A strong approach is:
	•	define your own runtime contract
	•	build a React adapter/renderer on top of it first
	•	let React be the first consumer, not the foundation

That gives you the best of both:
	•	fast path to something useful
	•	React ecosystem compatibility
	•	freedom to keep the bubble’s semantics cleaner than React’s implementation details

What should belong to your own abstraction?

Own these:
	•	tree/node model
	•	mutation operations
	•	event dispatch contract
	•	focus model
	•	scheduler contract
	•	capability interfaces for layout, timers, network, clipboard, storage, etc.
	•	explicit unsupported/partial features
	•	deterministic testing hooks

Do not couple these to React concepts like:
	•	fiber
	•	hook lifecycle details
	•	React element identity rules
	•	React scheduler quirks
	•	React synthetic event oddities

Those are implementation details of one framework, not the essence of your bubble.

What should React provide?

React can provide:
	•	a way to describe UI
	•	reconciliation into your runtime
	•	framework-local state management
	•	context and composition model
	•	ecosystem compatibility

So React becomes analogous to “a compiler target” for your bubble runtime.

A useful analogy

Think of it like this:
	•	React is a language/runtime for expressing UI
	•	your bubble is an operating environment for UI
	•	the browser is one concrete machine that can host it

You do not want your operating environment to just be a thin alias for one language’s internal object model.

When React-first is the right choice

Use React’s abstractions directly if:
	•	you only care about React apps
	•	you want near-term value fast
	•	you are building a testing tool, not a general runtime
	•	React semantics are acceptable as the source of truth
	•	you are okay with framework lock-in

Then the simplest form is:
	•	custom renderer
	•	deterministic host config
	•	browser capability shims
	•	small real-browser verification suite

That could already be very powerful.

When your-own-abstraction is the right choice

Use your own runtime if:
	•	you want framework independence
	•	you want stronger guarantees than React naturally offers
	•	you want explicit control over events/timing/effects
	•	you want the system to outlast framework trends
	•	you want to define “DOM bubble semantics” precisely

That is harder, but cleaner.

My bias

If this is an exploration or first product:
	•	start React-first in implementation
	•	avoid React-first in architecture

Meaning:
	•	implement a React renderer/adapter first
	•	keep the core runtime model separate and framework-agnostic
	•	never let “React element tree” become your true source of truth
	•	never make fiber-shaped assumptions part of the public model

So not:
	•	“the bubble is React VDOM”

But:
	•	“the bubble is a deterministic UI runtime, and React is the first frontend for it”

That gives you room later to support other sources, or even a non-React authoring model.

A good litmus test is:

If React disappeared, would the conceptual model of the bubble still make sense?

If yes, you probably have the right abstraction.
If no, you are really building a React tool, which is also fine, but it is a narrower thing.

I can sketch a concrete architecture for the two options side by side if you want.

Me
--

Yes — that is the stronger version.

If the bubble owns the DOM model, then a “generic renderer” can fall out naturally as the lowest-level contract for turning app intent into host operations.

The important move is this:

Do not make the bubble itself a renderer.
Make the bubble define the render target semantics.

Then any framework only has to adapt into that target.

The shape of it

You want three things:

1. A canonical bubble tree

Your own node model:
	•	element
	•	text
	•	comment or marker if needed
	•	root
	•	maybe portal/subtree boundary nodes

Each node has:
	•	type
	•	namespace
	•	props/attributes
	•	children
	•	identity
	•	ownership/lifecycle metadata
	•	maybe semantic metadata like role/focusability

This is the “truth” inside the bubble.

2. A mutation protocol

A renderer should not manipulate the tree arbitrarily. It should emit a small set of operations.

Something like:
	•	createNode
	•	createText
	•	insertChild
	•	removeChild
	•	moveChild
	•	setAttribute
	•	removeAttribute
	•	setProperty
	•	setStyle
	•	setText
	•	addEventListener
	•	removeEventListener
	•	focus
	•	blur
	•	setSelection
	•	mountPortal

This becomes your equivalent of host config surface.

3. A capability surface

Anything not expressible as pure tree mutation goes through explicit capabilities:
	•	scheduler
	•	timer
	•	layout
	•	viewport
	•	storage
	•	network
	•	clipboard
	•	history/navigation
	•	observers
	•	animation/frame clock

So renderers do tree work; capabilities handle reality.

⸻

What “generic renderer” should mean

Not:
	•	one renderer that can magically run any framework with no work

But:
	•	one host model that many framework adapters can target

So the generic part is the host contract, not the framework binding.

That means each framework adapter only needs to answer:
	•	how do I diff/reconcile my framework’s component output?
	•	how do I map it onto bubble nodes and mutations?
	•	how do I subscribe to events and schedule updates?

That is much smaller than adapting to the browser directly.

The right abstraction boundary

A good boundary is:

framework adapter → bubble host ops → bubble DOM tree → optional real-world projection

That last part matters.

Your bubble can exist entirely internally, but you may also project it to:
	•	a real browser DOM
	•	a terminal UI
	•	a snapshot serializer
	•	a devtools inspector
	•	a test harness
	•	a recording/replay stream

That is where the design gets interesting: once the bubble tree is canonical, multiple projections become easy.

This gives you a nice symmetry

For input:
	•	real browser events can be translated into bubble events
	•	test harness events can be translated into bubble events
	•	recorded sessions can be replayed as bubble events

For output:
	•	bubble mutations can update a real DOM
	•	bubble mutations can feed logs/snapshots
	•	bubble mutations can feed visual tooling

So the bubble becomes the stable center.

I’d strongly avoid exposing raw DOM-like mutability

Do not let users or framework adapters reach in and mutate nodes directly.

Prefer a renderer/host transaction model:
	•	beginUpdate
	•	apply operations
	•	commit
	•	flush effects

That gives you:
	•	determinism
	•	easier debugging
	•	time-travel potential
	•	validation of invariants
	•	batching
	•	replayability

The subtle but important choice: immediate mode vs retained mode

You probably want retained mode.

Meaning:
	•	the bubble owns a persistent tree
	•	renderers update it incrementally
	•	events target stable nodes
	•	tooling can inspect current state

Not immediate mode, where each frame redraws abstract commands.

For app UI, retained mode matches DOM and framework expectations better.

What the framework adapter should implement

For any framework, the adapter should mainly provide:
	•	create/update/remove host instances
	•	text instance handling
	•	child insertion/reordering
	•	event subscription plumbing
	•	scheduling hooks
	•	commit hooks
	•	maybe hydration hooks later

That is very close to how custom renderers usually work, but the difference is your host is not “browser DOM” and not “React internals.” It is your bubble DOM.

What the app author should have to adapt

Ideally, almost nothing beyond choosing the adapter.

That sounds like what you are aiming at: “the user only needs to adapt once.”

In practice that means:
	•	React app uses BubbleReact
	•	Vue app uses BubbleVue
	•	Svelte app uses BubbleSvelte

But each adapter targets the same host contract.

The app author should not need to rewrite components around bubble concepts except where they touch explicit capabilities like layout or storage.

That is the real payoff.

Where this gets powerful

Once you have a generic host contract, you can make strong guarantees:
	•	every UI mutation is observable
	•	every event is replayable
	•	every side effect crosses a named boundary
	•	unsupported host features fail explicitly
	•	tests can assert against the canonical bubble tree, not framework internals

That is much cleaner than testing “whatever React happened to do.”

The biggest design risk

Trying to make the bubble DOM too browser-identical too early.

You do not actually need “full DOM.”

You need:
	•	enough node semantics for frameworks to express UI
	•	enough event semantics for meaningful interaction
	•	enough platform boundaries to isolate reality

If you over-copy the browser, you inherit its complexity without its engine.

A better approach is:
	•	make the minimal DOM-shaped core
	•	add browser parity only where a real use case demands it
	•	keep unsupported areas explicit

A good initial core

I would start with:

Tree
	•	Root
	•	Element
	•	Text

Element data
	•	tag
	•	namespace
	•	attributes
	•	properties
	•	children

Interaction
	•	event listeners
	•	dispatch with capture/bubble phases
	•	defaultPrevented
	•	stopPropagation

State/accessibility basics
	•	focus management
	•	tab order model
	•	role/name/value derivation where feasible
	•	form control state

Commit model
	•	batch updates
	•	commit lifecycle
	•	deterministic effect flush

Capabilities
	•	clock
	•	scheduler
	•	fetch/network
	•	storage
	•	viewport
	•	measurement interface

That is already enough for a lot.

You may want two render contracts, not one

This is worth considering.

Host renderer contract

Used by frameworks to produce/update bubble nodes.

Projection renderer contract

Used to project the bubble tree outward.

For example:
	•	React adapter targets host renderer contract
	•	Browser projector targets projection renderer contract
	•	Snapshot projector targets projection renderer contract

That separation keeps “creating the canonical state” distinct from “displaying or exporting it.”

Very useful.

A clean slogan version

Frameworks render into the bubble.
Projectors render from the bubble.

That makes the bubble the source of truth.

One more thing: identity

You will want stable node IDs owned by the bubble, not by the framework.

That lets you:
	•	record events against stable targets
	•	inspect mutations over time
	•	bridge across projections
	•	build devtools cleanly
	•	compare snapshots meaningfully

Framework adapters can map their host instances to bubble node IDs, but the canonical identity should live in the bubble.

If I were shaping v1

I’d define these packages conceptually:
	•	bubble-core — nodes, mutations, transactions, event system
	•	bubble-capabilities — layout, clocks, storage, network, etc.
	•	bubble-react — React adapter
	•	bubble-browser — projector to real DOM
	•	bubble-test — harness for deterministic tests
	•	bubble-devtools — inspector/recorder

That gives a very coherent platform shape.

The principle to keep protecting

Do not let any framework become the semantic owner of the UI.

The bubble owns:
	•	tree semantics
	•	event semantics
	•	capability boundaries
	•	identity
	•	observability

Frameworks are translators in.
Projectors are translators out.

That is the version that can become a real platform rather than a clever React trick.

I can sketch the actual interfaces for bubble-core next, like the node model, mutation op types, and renderer contract.

Me
--

What about the CLI vs API vs other “shell” problem 

Assistant
---------

That is the next big split.

Once the bubble is the real runtime, the CLI/API/UI question stops being “which frontend do we build first?” and becomes:

what is the shell contract around the bubble?

You probably want to treat CLI, HTTP API, editor integration, test runner, and browser/devtools UI as all being shells around the same core.

The mistake to avoid

Do not bake shell behavior into the bubble core.

The core should not know:
	•	whether it is running from a CLI
	•	whether a human is watching
	•	whether requests are coming over HTTP
	•	whether it is embedded in an IDE
	•	whether it is running in CI

Those are shell concerns.

The bubble core should expose a small runtime/control surface, and shells should adapt to it.

A useful layering

1. Bubble core

Owns:
	•	tree
	•	event system
	•	scheduler
	•	capability boundaries
	•	transactions
	•	state snapshots
	•	replay/recording hooks

2. Runtime control API

Owns:
	•	create bubble instance
	•	load app/module
	•	start/stop/reset
	•	inject capabilities
	•	dispatch events
	•	inspect tree
	•	query nodes
	•	subscribe to mutations/logs/errors
	•	snapshot/restore
	•	run test step
	•	maybe open session / close session

This is the actual product surface.

3. Shells

Each shell just wraps the runtime control API:
	•	CLI shell
	•	HTTP/JSON API shell
	•	editor shell
	•	browser shell
	•	CI shell
	•	maybe RPC/SDK shell

That keeps the whole system sane.

⸻

The shell problem is really three separate problems

1. Control

How do you tell the bubble what to do?

Examples:
	•	start app
	•	run test
	•	click button
	•	set viewport
	•	override network
	•	snapshot state

2. Observation

How do you see what happened?

Examples:
	•	tree inspection
	•	logs
	•	mutation stream
	•	accessibility view
	•	errors
	•	performance counters
	•	screenshots if projected outward

3. Packaging/session model

How does a user interact over time?

Examples:
	•	one-shot CLI invocation
	•	long-lived daemon
	•	interactive TUI
	•	HTTP service
	•	IDE-attached session

Those are separable.

My bias: make the API primary, not the CLI

Not public web API first necessarily, but an internal programmatic API should be the source of truth.

Then:
	•	CLI is a thin wrapper
	•	HTTP is a remote wrapper
	•	editor tooling is an embedded wrapper

If the CLI becomes primary, you often end up designing around text output and process boundaries too early.

If the API is primary, everything else composes better.

What the CLI is good for

CLI is excellent for:
	•	local development
	•	test execution
	•	one-shot inspection
	•	CI integration
	•	scripting
	•	reproducible pipelines

Examples:
	•	bubble test
	•	bubble inspect
	•	bubble replay
	•	bubble snapshot
	•	bubble run

CLI should feel like a control client, not the core runtime.

What the HTTP/API shell is good for

An API shell is good for:
	•	editor integration
	•	remote execution
	•	language-agnostic tooling
	•	orchestration
	•	dashboards/devtools
	•	multi-process or multi-machine setups

It is especially useful if you want long-lived bubble sessions.

Example model:
	•	create session
	•	load app
	•	interact with session
	•	subscribe to events
	•	tear down session

That is much better over RPC/HTTP/WebSocket than repeated CLI calls.

What the editor/IDE shell is good for

This may become the most important shell.

Because your bubble idea is really about:
	•	rapid feedback
	•	confidence while changing code
	•	inspectability
	•	deterministic behavior

That maps perfectly to editor workflows:
	•	save file → bubble updates
	•	inspect changed subtree
	•	replay interaction
	•	see failed contract tests
	•	compare bubble snapshot before/after change
	•	jump from node to source

This shell probably wants a long-lived session model.

I’d separate “protocol” from “transport”

This matters a lot.

Define a shell protocol in abstract terms:
	•	commands
	•	responses
	•	events/subscriptions
	•	session lifecycle
	•	artifact references

Then support multiple transports:
	•	in-process API
	•	stdio
	•	HTTP
	•	WebSocket

That way the CLI can use stdio or in-process calls, while editors or UIs can use WebSocket/RPC.

This avoids having to redesign everything later.

A good mental model

Think of the bubble runtime like a database or language server.

It is a long-lived engine with:
	•	commands
	•	queries
	•	subscriptions
	•	snapshots
	•	errors
	•	versioned protocol

Then shells are just clients.

That is a much better architecture than “library plus some commands.”

You may actually want two APIs

Embedded API

For local libraries and framework adapters.

Example use:
	•	React adapter talks directly to bubble core
	•	test harness runs in-process
	•	custom tools embed bubble runtime

Control API

For shells and external tools.

Example use:
	•	CLI
	•	IDE extension
	•	web devtools
	•	CI controller

These should not necessarily be identical.

The embedded API can be lower-level and typed tightly.
The control API should be stable, explicit, serializable, and versioned.

⸻

Session model is the real architectural choice

You probably need to decide whether the bubble is:

1. Ephemeral

Each command spins up a runtime, runs work, exits.

Good for:
	•	simple CLI tests
	•	one-shot batch work

Bad for:
	•	interactive tooling
	•	fast incremental updates
	•	editor integration

2. Long-lived

A bubble session persists across commands.

Good for:
	•	hot reload
	•	time travel
	•	replay
	•	incremental testing
	•	editor integration
	•	live inspection

Harder because:
	•	resource management
	•	stale state
	•	version skew
	•	session cleanup

For your idea, I think long-lived sessions are the real win.

CLI can still offer one-shot commands, but under the hood a daemon/session architecture may be better.

So maybe the shells look like this

Daemon/runtime server

Owns sessions and runs bubble instances.

CLI

Talks to daemon or starts one implicitly.

IDE extension

Connects to daemon/session, subscribes to updates.

CI runner

Starts isolated ephemeral session for reproducibility.

Browser/devtools UI

Attaches as observer/controller.

That gives one coherent model instead of separate products.

The shell contract should be capability-aware

A shell should be able to ask:
	•	what capabilities are available?
	•	which are mocked?
	•	which are deterministic?
	•	which are projected to the real world?
	•	which are unsupported?

That is important because a CLI run in CI may differ from an interactive browser-backed shell.

So the shell protocol should expose environment metadata clearly.

Output shape matters

CLI wants:
	•	human-readable text
	•	machine-readable JSON
	•	exit codes
	•	streamed logs

API wants:
	•	structured events
	•	typed errors
	•	subscriptions
	•	queryable snapshots

UI shells want:
	•	incremental tree updates
	•	timelines
	•	source mapping
	•	mutation traces

So again, one protocol, many presentations.

A strong design principle

Every shell action should map to one of four categories:
	•	command — mutate runtime state
	•	query — inspect state
	•	stream — subscribe to changes
	•	artifact — fetch snapshot/log/trace/output

That makes the whole platform easier to reason about.

Example shell-neutral operations

Commands:
	•	createSession
	•	loadApp
	•	resetSession
	•	dispatchEvent
	•	setCapabilityOverride
	•	advanceTime
	•	runTest
	•	projectToHost

Queries:
	•	getTree
	•	getNode
	•	querySelector-ish API
	•	getFocusState
	•	getAccessibilityView
	•	getLogs
	•	getErrors

Streams:
	•	mutation stream
	•	event stream
	•	error stream
	•	performance stream
	•	test progress stream

Artifacts:
	•	snapshot
	•	trace
	•	replay recording
	•	serialized bubble tree

That is a platform.

CLI vs API decision in one sentence

Use:
	•	embedded API as the implementation center
	•	versioned control protocol as the product center
	•	CLI as a convenience shell
	•	long-lived sessions as the default mental model

One more split: author shell vs operator shell

These are different.

Author shell

For developers building apps.

Needs:
	•	fast reload
	•	interactive inspection
	•	source links
	•	local ergonomics

Operator shell

For CI, automation, remote tooling.

Needs:
	•	stability
	•	machine-readable output
	•	isolation
	•	reproducibility
	•	artifacts

You can support both with the same control protocol, but they will want different defaults.

The cleanest framing

The bubble is not a CLI tool and not an HTTP service.

It is a UI runtime engine.

CLI, API, IDE, and dashboard are all clients of that engine.

That framing prevents a lot of early architectural mistakes.

If I were shaping v1

I would build:
	•	in-process core runtime
	•	versioned control protocol
	•	local daemon hosting sessions
	•	CLI client over that protocol
	•	minimal inspector UI over that protocol

Not because you need all the shells immediately, but because that shape keeps them all possible.

The one rule I’d protect hardest

Never let shell-level concepts leak downward.

No stdout in core.
No HTTP request objects in core.
No editor assumptions in core.
No CI assumptions in core.

Only runtime commands, queries, streams, and artifacts.

That is what lets “CLI vs API vs other shell” become a packaging question instead of an architectural crisis.

I can sketch a concrete control protocol next, like the actual command/query/event types for a bubble session.
