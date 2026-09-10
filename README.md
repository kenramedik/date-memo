# DateMemo

A Windows desktop app for keeping a to-do list one day at a time.

Each day gets its own list. Move between days with the arrows, the calendar, or the left/right arrow keys, and the app remembers what belongs to each date.

## Features

- **Day-by-day lists** — every date holds its own items; jump around with the arrows, the `오늘` (Today) button, or the calendar
- **Calendar** — shows how many items each day holds, and marks South Korean public holidays (2025–2030) with a red tint and a tooltip naming the holiday
- **Pinning** — keep important items at the top regardless of the date. Paged three at a time, scrollable with the mouse wheel, with a button that jumps to the item's original date
- **Search** — `Ctrl+F` searches every date at once. Matches are highlighted, and clicking a result jumps to that day
- **Colors** — tag any item with one of eight colors
- **Reordering** — drag items to rearrange them
- **Delete lock** — guards against accidental deletion; while it is on, the delete button is not rendered at all
- **Always on top** and **minimize to tray** — both toggled from the Settings menu

The interface is in Korean.

## Install

Grab a build from [Releases](../../releases).

- `DateMemo-Setup-x.y.z.exe` — installer. Runs without administrator rights and creates desktop and Start menu shortcuts
- `DateMemo-x.y.z-win.zip` — portable. Unpack anywhere and run `DateMemo.exe`

The executable is unsigned, so SmartScreen may warn on first launch (`More info` → `Run anyway`).

## Development

```bash
npm install
npm start        # run in development
npm run icon     # regenerate the icons in assets/
npm run dist     # build the installer and the zip
```

Data lives in `%APPDATA%\DateMemo`.

## Built with

Electron 33 and plain HTML, CSS, and JavaScript — no framework, no bundler. `index.html` holds the entire interface.

## License

MIT. Bundles [Pretendard](https://github.com/orioncactus/pretendard), licensed under the SIL Open Font License 1.1.
