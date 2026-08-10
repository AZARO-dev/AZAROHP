# GSAP Windows Style Desktop

GSAPのDraggableで作るWindows OS風の静的Webデスクトップです。

## 使い方

1. `index.html` をブラウザで開きます。
2. アイコンをドラッグ、ダブルクリックしてウィンドウを開きます。
3. タイトルバーでウィンドウを移動し、タスクバーやStartメニューで操作します。
4. 背景は単色で、マウスカーソルを動かすと水彩のようなにじみが広がります。
5. BrowserアプリではURLバー、履歴、検索、内部ページ表示、外部サイトのプレビューと外部タブ起動を試せます。

この環境はビルド不要です。GSAP本体とDraggableはCDNから読み込むため、初回表示時はインターネット接続が必要です。

## ファイル

- `index.html` - Windows風デスクトップ画面
- `styles.css` - OS風UIの見た目
- `main.js` - Draggable、ウィンドウ管理、Startメニュー、タスクバー操作、カーソル水彩エフェクト、Mini Browser

## 参考

- GSAP Installation: https://gsap.com/docs/v3/Installation/
- Draggable: https://gsap.com/docs/v3/Plugins/Draggable/
