# AWS Cloud Infrastructure Automation Pipeline

## Description

TerraformとAnsibleを用いて、AWS EC2のプロビジョニングからミドルウェア (Nginx等) の構築までを自動化するプロジェクトです。

## Tech Stack

- Terraform
- Ansible
- Git
- Target OS: Ubuntu (on EC2)

## Usage

### 1. 前提条件 (Prerequisites)

- Terraform (v1.0.0+)
- Ansible (v 2.20.5)
- AWS CLI
- SSH公開鍵が`~/.ssh/id_ed25519.pub`に存在すること
- AWS IAMユーザに`AdministratorAccess`相当の権限が付与されていること

### 2. インフラのプロビジョニング (Terraform)

VPC, サブネット, IGW, ルートテーブル, SG及びEC2インスタンスの作成。

1. ディレクトリの移動

```bash
cd terraform
```

2. 初期化

```bash
terraform init
```

3. 実行計画の確認

```bash
terraform plan
```

4. 反映

```bash
terraform apply
```

5. Ansibleのinventoryが作成・更新される。

```
ansible/inventory/hosts.yml
```

6. 接続確認
   作成したサーバへSSHでログインできるか確認する。

```bash
ssh -i ~/.ssh/id_ed25519 <initial_user>@<Public_IP>
```

### 3. ミドルウェアの構築・設定 (Ansible)

Terraform で作成した EC2 インスタンスに対し、ユーザー作成、セキュリティ設定、Nginx の構築、及び SSL 証明書の取得を自動で行います。

1. ディレクトリの移動

```bash
cd ../ansible
```

2. 古いホストキーの削除 (重要)

インスタンスを作り直した場合、以前のフィンガープリント (Host Key) がローカルに残っていると接続エラーになります。新しいパブリックIPに対して記憶をリセットします。

```bash
ssh-keygen -R <Public_IP>
```

3. Ansible Vaultを用いた個人情報の記述 (重要)
   コマンドを実行し、以下の3項目を入力する。

- `initial_user`
  インスタンス作成直後に使うユーザネーム。
- `manage_user`
  SSH制限後に使うユーザネーム。
- `cert_admin_email`

```bash
mkdir vars
ansible-vault create vars/vault.yml
```

4. プレイブックの実行

このプロジェクトは、セキュリティ向上のため「初期ユーザー でのセットアップ」と「運用ユーザーでの構成管理」の2フェーズ構成になっています。

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --ask-vault-pass
```

※ Ansible Vault を使用している場合、実行時にパスワードの入力が求められます。

5. 実行内容の内訳

プレイブック (`playbooks/site.yml`) を実行することで、以下のプロセスが順次適用されます。

- Phase 1: Bootstrap
    - 管理用ユーザーの作成とsudo権限付与。
    - 公開鍵認証の設定。
    - デフォルトユーザーのログイン禁止設定(nologin) 及びSSH接続制限。
- Phase 2: Main Setup
    - Nginx のインストールと基本設定。
    - ファイアウォール (UFW) の有効化 (22, 80, 443 ポートの開放) 。
    - certbotによるSSL証明書の自動取得とHTTPS設定の反映。

6. 構築完了の確認

ブラウザで以下の URL にアクセスし、HTTPS 化 (鍵マーク) されたインデックスページが表示されることを確認します。

```bash
https://samemaru.me
```

### 4. 環境破壊 (Cleanup)

不要になったリソースを削除して課金を停止します。

```bash
cd ../terraform
terraform destroy
```

## 工夫点 (Key Features & Improvements)

単なる自動構築に留まらず、実務レベルのセキュリティと運用性を考慮した設計を行いました。

- **Multi-Playによる「ゼロ・タッチ構築」の実現**
    - 初期構築用ユーザー (ubuntu) から運用ユーザー (samemaru) への権限委譲を、Ansibleのプレイを分けることで自動化。
    - SSH設定変更による「自分自身の締め出し」を防ぎつつ、構築完了と同時に初期ユーザーを無効化（nologin）する安全なプロビジョニングフローを確立。
- **冪等性を担保したSSL/HTTPS自動化ロジック**
    - `stat`モジュールを用いて証明書の有無を事前に検知し、Jinja2テンプレートによる条件分岐で「初回HTTP起動」と「2回目以降のHTTPS起動」を動的に切り替え。
    - `meta: flush_handlers` を活用し、Certbotの認証に必要なWebサーバーの起動を待機させる確実なタスク順序を設計。
- **ハイブリッドなSSL管理**
    - Certbotの自動設定に頼らず、`certonly`モードで証明書取得に専念させることで、Ansibleによる設定ファイル（Jinja2）の管理の完全性を維持。

## 苦労した点と解決策 (Challenges & Lessons Learned)

- **SSH接続の永続性と権限昇格の競合**
    - **課題**: SSH制限 (AllowUsers) を適用した瞬間に、実行中のAnsibleセッションが拒否される問題が発生。
    - **解決**: Ansibleは1つのプレイ内で接続を維持しようとする性質を理解し、プレイを2段階(BootstrapとMain）に分離。接続ユーザーを切り替えてログインし直す構成に修正。
- **Let's Encryptのレート制限への対応**
    - **課題**: 開発中の頻繁な `terraform destroy/apply` により、同一ドメインの発行上限 (週5回) に達した。
    - **解決**: `--staging` フラグを用いたテスト発行への切り替えや、証明書取得後に `stat` で変数を再更新(Register）して最新の状態を反映させるロジックの追加。
- **インフラ再構築時のSSHホストキー不一致**
    - **課題**: インスタンスを作り直すたびに「REMOTE HOST IDENTIFICATION HAS CHANGED」エラーが発生。
    - **解決**: `ssh-keygen -R` による既知のホスト情報の削除をフローに組み込み、開発効率を改善。
