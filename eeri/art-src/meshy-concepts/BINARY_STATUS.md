# Machine concept binary import status

**Updated 2026-08-17 — one of the two is now in the repo.**

| file | state |
|---|---|
| `machines/machine-roster-dark-eyes-approved.png` | **IMPORTED**, sha256 `571d5059…22e8f` — matches the checksum this file published before the binary existed here, so it is verifiably the approved board and not a lookalike |
| `machines/machine-roster-toko-face-approved.png` | still missing — the alternate, expected sha256 `4a7e35c3…85e9` |

The original note said the connector "does not accept a local binary file
path directly". That is a limit of one path in, not of the repo: the file
arrived as a chat attachment and was committed normally. Send the alternate
the same way and it lands beside this one.

Publishing the checksums first is what made this safe — the imported file
was identified by hash rather than by eye, which is exactly what "do not
infer approval for discarded intermediate sheets" needs to be enforceable.
