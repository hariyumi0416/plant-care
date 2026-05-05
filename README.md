# plant-care

観葉植物のお世話サポートアプリ

## 動作確認（ローカルサーバーの起動）

`file:///` で直接開くと、JSONファイルの読み込みがブラウザのセキュリティ制限でブロックされます。
以下の手順でローカルサーバーを起動してください。

### 起動コマンド

ターミナルを開いて、以下のコマンドを実行する：

```
cd /Users/harisawa/Documents/claude/plant-care
python3 -m http.server 8000
```

### ブラウザでアクセス

サーバー起動後、Safari または Chrome で以下の URL を開く：

```
http://localhost:8000
```

### サーバーの停止

ターミナルで `Ctrl + C` を押す。

---

## iPhone で確認したいとき

Mac と iPhone が同じ Wi-Fi に接続されている状態で：

1. Mac のターミナルで `ipconfig getifaddr en0` を実行して IP アドレスを調べる
2. iPhone の Safari で `http://（調べたIPアドレス）:8000` を開く

例: `http://192.168.1.5:8000`
