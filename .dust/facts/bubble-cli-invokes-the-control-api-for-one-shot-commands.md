# Bubble CLI invokes the control API for one-shot commands

`bubble-cli` exposes `main(argv)` as a thin shell over `bubble-control`.

It supports one-shot `command reset|destroy` and `query get-tree` execution with human-readable or JSON output and exit code `0` or `1` for success and failure.

Each one-shot invocation creates a control session, runs the requested operation, and then explicitly destroys that session before returning, including structured failure paths.
