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

5. 出力されたパブリックIPアドレスをメモする (Ansibleで使用)

6. 接続確認
   作成したサーバへSSHでログインできるか確認する。

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@<Public_IP>
```

### 3. 環境破壊 (Cleanup)

不要になったリソースを削除して課金を停止。

```bash
terraform destroy
```
