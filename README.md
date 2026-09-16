# Wordcraft
3,600 vocabulary entries from six user-provided Vietnamese Anki decks. Select book, unit, quiz length, English/Vietnamese direction. Original pronunciation audio, explanations and retry incorrect answers. Last result stored locally.

Serve locally: python -m http.server 8080
Deploy: GitHub Pages, main branch, root directory. No dependencies or build required.

Source content remains the property of its respective owners. Anki HTML is stripped and displayed as plain text. No review history or scheduling data is exported. Five missing short meanings use definitions from the same notes' full Vietnamese dictionary fields.

Original deck grouping is preserved: Book 6 contains one merged unit (40 notes) and 29 distinct unit groups, giving 179 groups in total. Empty units are excluded from the selector.

All answer options use the same initial-letter capitalization. Original Anki illustrations appear after answering, alongside the explanation, to avoid revealing the answer. Images are extracted from the Image/IMG note fields and resolved through the archive media mapping.
