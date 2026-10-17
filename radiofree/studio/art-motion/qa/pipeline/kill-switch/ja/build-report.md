# kill-switch — ja master, built by pipeline

**PASSED**: 47 pass, 2 warn, 0 fail (preview build: unread languages warn)

- length 12.35 s · holds [{'caption': 'toaster', 'beat': 'flipA', 'extra': 1.35}]
- delivered -14.1 LUFS, -4.0 dBTP, LRA 2.4

| stage | check | result | why |
|---|---|---|---|
| text | copy toaster.en | pass | present |
| text | copy toaster.fi | pass | present |
| text | copy toaster.ja | pass | present |
| text | copy toaster source | pass | UL 1026 (household cooking appliances, toasters included): the 6th-edition revis |
| text | copy toaster pop word | pass | every language marks one |
| text | copy model.en | pass | present |
| text | copy model.fi | pass | present |
| text | copy model.ja | pass | present |
| text | copy model source | pass | California Executive Order N-9-26, signed 18 Sept 2026, asks for recommendations |
| text | copy model pop word | pass | every language marks one |
| text | copy ui.switch1 | pass | all languages |
| text | copy ui.switch2 | pass | all languages |
| text | copy ui.warnings | pass | all languages |
| text | copy ui.dateline | pass | all languages |
| text | width ja:toaster | pass | widest line 784 px (limit 800) |
| text | safe zone ja:toaster | pass | box {'x': 137, 'y': 168, 'w': 806, 'h': 311} |
| text | reading time ja:toaster | pass | on screen 5.00 s, needs 5.00 s (24 chars at 6/s + 1 s) |
| text | last word ja:toaster | pass | last word up 3.20 s (at least 0.8) |
| text | key detail ja:toaster | pass | covers nothing the shot needs |
| text | scrim ja:toaster | pass | picture behind: edge 14.72 → scrim 0.45 |
| text | width ja:model | pass | widest line 665 px (limit 800) |
| text | safe zone ja:model | pass | box {'x': 196, 'y': 168, 'w': 687, 'h': 311} |
| text | reading time ja:model | pass | on screen 5.95 s, needs 5.00 s (24 chars at 6/s + 1 s) |
| text | last word ja:model | pass | last word up 4.22 s (at least 0.8) |
| text | key detail ja:model | pass | covers nothing the shot needs |
| text | scrim ja:model | pass | picture behind: edge 20.95 → scrim 0.72 |
| text | ui ja:dateline | pass | "サクラメント・州知事令 N-9-26" spans x 110–669 |
| text | hold ja:toaster | pass | the picture holds 1.35 s before flipA so the line can be read |
| text | native read en | pass | read by a native speaker |
| text | native read fi | warn | NOT yet read by a native speaker |
| text | native read ja | warn | NOT yet read by a native speaker |
| text | sidecar en:toaster | pass | 5.00 s on this master, en needs 3.10 s |
| text | sidecar lines en:toaster | pass | Its standard asks for a second off switch. |
| text | sidecar en:model | pass | 5.95 s on this master, en needs 3.10 s |
| text | sidecar lines en:model | pass | Its kill switch: a study, due 16 November. |
| text | sidecar fi:toaster | pass | 5.00 s on this master, fi needs 3.41 s |
| text | sidecar lines fi:toaster | pass | Turvastandardi vaatii toisen katkaisimen. |
| text | sidecar fi:model | pass | 5.95 s on this master, fi needs 3.41 s |
| text | sidecar lines fi:model | pass | Hätäkatkaisin: selvitys, määräaika 16.11. |
| text | sidecar lines ja:toaster | pass | その安全規格は2つ目の / 停止スイッチを求めている。 |
| text | sidecar lines ja:model | pass | AIのキルスイッチは調査中。 / 期限は11月16日。 |
| sound | loudness | pass | -14.1 LUFS integrated (target -14.0) |
| sound | true peak | pass | -3.8 dBTP (at most -1.0) |
| sound | silence | pass | no unmarked gap over 1.5 s |
| sound | coverage | pass | 34/34 cues have a sound within 40 ms |
| sound | exempt end | pass | the last frame: the sting lands 0.6 s before it and rings out across it |
| delivery | delivered loudness | pass | -14.1 LUFS in the MP4 |
| delivery | delivered true peak | pass | -4.0 dBTP in the MP4 |
| delivery | length | pass | 12.35 s, the picture says 12.35 s |
