# terraformブロック
# Terraform自体の挙動や、必要なプロバイダ (ライブラリ) の情報を定義する。
terraform {
  required_version = ">= 1.0" # 実行するTerraform本体のバージョン指定。
  required_providers {        # プロバイダのソース (配布元) とバージョンを指定する。
    aws = {
      source  = "hashicorp/aws" # 公式レジストリのhashicorp名前空間にあるawsプロバイダを使う。
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# providerブロック (接続設定)
# 特定のプロバイダ (今回はAWS) に対する具体的な設定を行う。
provider "aws" {
  region = "ap-northeast-1" # AWSのどのデータセンタ群 (東京、バージニアなど) を操作するかを指定する。
  # 認証情報 (Access Key等) をここに直接書くことも可能だが、aws configureで設定済みの場合は、Terraformが自動的に~/.aws/credentialsを読みに行く為、記述を省略するのが一般的。
}

# Cloudflare の設定
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
