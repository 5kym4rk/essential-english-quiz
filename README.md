# Wordcraft
3,600 vocabulary entries from six user-provided Vietnamese Anki decks. Select book, unit, quiz length, English/Vietnamese direction. Original pronunciation audio, explanations and retry incorrect answers. Last result stored locally.

Serve locally: python -m http.server 8080
Deploy: GitHub Pages, main branch, root directory. No dependencies or build required.

Source content remains the property of its respective owners. Anki HTML is stripped and displayed as plain text. No review history or scheduling data is exported. Five missing short meanings use definitions from the same notes' full Vietnamese dictionary fields.

Original deck grouping is preserved: Book 6 contains one merged unit (40 notes) and 29 distinct unit groups, giving 179 groups in total. Empty units are excluded from the selector.

All answer options use the same initial-letter capitalization. Original Anki illustrations appear below the question, before the answer options, in both quiz directions. Captions do not spell out the answer. Images are extracted from the Image/IMG note fields and resolved through the archive media mapping.

## Compatibility and navigation
The quiz uses ES5 JavaScript, XMLHttpRequest, appendChild/removeChild, and flex/block CSS fallbacks for older Safari (target iOS 9+). No optional chaining, Unicode property escapes, replaceChildren, fetch, or Promise requirement. Physical iOS 9/12 hardware has not been tested.
Answer keys and labels are 0–3; Enter continues after answering. Desktop explanation and navigation are in the left panel. On phones, the next button remains in a fixed bottom panel with a scrollable explanation after answering. Optional auto-next is off by default, selectable at 5/8/10 seconds; it can be stopped and pauses when the page is hidden.
Run regression checks: node test-quiz.cjs

## Lesson statistics
The statistics screen uses accessible text and CSS horizontal bars, with one book at a time. The final answer in a completed quiz records one session for each distinct book/unit represented in that quiz. Retries count as new sessions; abandoned quizzes do not count. A session with only part of a lesson is practice, not proof of mastering every word. Duplicate result rendering does not add another count.
Statistics use localStorage key wordcraft-study-stats-v1 and begin with this release; the prior last-score record has no unit history to reconstruct. Counts are local to one browser/device. If storage is blocked, in-memory counts and a visible warning preserve quiz functionality.


## Chinese collections
The navigation opens independent vocabulary, grammar and radical pages. Each page loads only its own JSON; images/audio load on demand. The English dataset and saved history are unchanged. Chinese statistics and last results have a separate localStorage key for each collection.

- Vocabulary: 4,994 original HSK-tagged notes, 253 lessons of up to 20 cards within each level; 3,676 audio clips and 4,991 images. Missing audio is not synthesized. Twenty-one empty short meanings were recovered from each card dictionary, and two translations were supplied: 不屑一顾 = Không thèm để mắt; coi thường, 馅儿 = Nhân bánh.
- Grammar: 4,800 original example sentences grouped by the 450 original grammar-point IDs and HSK tags. Structure, usage, pinyin, Vietnamese translation, original sentence audio, illustration and alternate grammar diagram are included.
- Radicals: 215 learning notes, including source variant 80.1; the blank-front mnemonic index note is excluded. Groups follow source order in blocks of 20. Original illustration, writing diagram, audio and mnemonic text are included.

The diagram button switches the learning image between illustration and grammar/writing diagram. Source markup/scripts are never executed. Only referenced media are copied using content hashes to deduplicate them. Data preserves source wording, so source translation/pinyin inaccuracies may remain.

Regenerate Chinese data: python extract_chinese.py (requires the three user-provided APKG files in Downloads).
Check English and Chinese behavior: node test-quiz.cjs and node test-chinese.cjs.
Learning mode shows meanings immediately, supports left/right navigation, and records a completed session after all cards are viewed and Finish is pressed.

Chinese image layout: grammar images and diagram controls are hidden in both learning and quiz modes. Vocabulary learning images are larger on phones. Radical images use available viewport height without a thumbnail cap; in quizzes the image appears before the answer choices, and on phones fixed navigation is reserved.

## HSK reference (LearnLangLab)
The HSK tham khảo section imports the 20 groups listed by https://learnlanglab.github.io/learn/ on 2026-09-21. This snapshot has 11,909 cards across 600 lessons (9,996 distinct Hanzi/pinyin/meaning triples across groups). Full and split groups intentionally overlap as on the source website. Five exact duplicates within individual groups and two blank records were omitted. Original wording and source mistakes are preserved; this is reference material, not a claim of an official HSK syllabus.

The 20 Q&A cards contain Chinese answers rather than Vietnamese meanings. Their group is learning-only and excluded from quiz pools. Speech uses the device's Chinese voice when SpeechSynthesis is supported, matching the source's approach; no remote audio/image files are available in the source data. Existing Anki audio playback is unchanged.

The page credits and links the source. Only literal data is imported: no source page scripts, tracking, backgrounds or music are executed or copied into the application. The upstream repository did not declare a license at import time; content remains attributed to its respective owners. SHA-256 hashes, per-group counts and skipped records are in reference-import-report.json.

To reproduce: python fetch_reference.py, then node import_reference.cjs. The downloader saves source files under ignored .reference-source. The importer parses JavaScript syntax and accepts only literal arrays/objects/string properties; it never evaluates source JavaScript. It uses the Acorn parser bundled in the local Node runtime.
Test: node test-reference.cjs. History is isolated under wordcraft-hsk-reference-v1; all existing study records remain unchanged.
