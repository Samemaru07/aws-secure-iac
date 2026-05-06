# VPC (Virtual Private Cloud) 土地の確保
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16" # このVPCのネットワーク番号を定義

  tags = {
    Name = "iac-vpc" # AWSのコンソールの名前列
  }
}

# Subnet (区画) の定義
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id   # どのVPCの中にこのサブネットを作るかを指定。AWSのAPIで作られる。
  cidr_block              = "10.0.1.0/24"     # この区画に割り当てるIPアドレスの範囲
  map_public_ip_on_launch = true              # このサブネット内に作成されるサーバ (EC2) に、自動的にパブリックIPアドレスを付与するかどうかの設定
  availability_zone       = "ap-northeast-1a" # 東京リージョンの「A」という区画のデータセンター群を指定。
  tags = {
    Name = "iac-subnet" # コンソールでの視認性向上
  }
}

# IGW (インターネットゲートウェイ) 門の作成
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "iac-igw"
  }
}

# ルートテーブル (標識) の作成
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  # 通信の行き先を定義
  route {
    cidr_block = "0.0.0.0/0" # すべての送信先 (VPC内部以外の全ての通信を指す)
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "iac-route-table"
  }
}

# ルートテーブルの紐付け (作成したルートテーブルを、特定のサブネットに設置)
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# セキュリティグループ (サーバのセキュリティ)
resource "aws_security_group" "ssh_http" {
  name        = "allow_ssh_http"
  description = "Allow SsH and HTTP traffic"
  vpc_id      = aws_vpc.main.id

  # インバウンドルール
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"         # 通信プロトコル
    cidr_blocks = ["0.0.0.0/0"] # 全世界の全てのIP
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # アウトバウンドルール
  egress {
    # 全てのポートと全てのプロトコルを許可 (全開放)
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "iac-sg"
  }
}

# EC2 キーペアの設定
resource "aws_key_pair" "auth" {
  key_name   = "iac-key"
  public_key = file("~/.ssh/id_ed25519.pub")
}

# EC2 インスタンスの作成
resource "aws_instance" "server" {
  ami                    = "ami-0d52744d6551d851e" # AMI: Ubuntu 24.04 LTS (64-bit x86)
  instance_type          = "t2.micro"
  key_name               = aws_key_pair.auth.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ssh_http.id] # id's': SGは複数付けられる為、リスト形式で渡す。

  tags = {
    Name = "iac-server"
  }
}

# Ansible用のイベントファイルを自動的に生成する。
resource "local_file" "ansible_inventory" {
  filename = "${path.module}/../ansible/inventory/hosts.yml"

  content = <<-EOF
   ---
   all:
       hosts:
           ec2-instance:
               ansible_host: "${aws_instance.server.public_ip}"
               ansible_user: "${var.ssh_user}"
               main_domain: "${var.main_domain}"
EOF
}

# DNS レコードの自動更新
resource "cloudflare_record" "main" {
  zone_id = var.cloudflare_zone_id
  name    = "iac"
  content = aws_instance.server.public_ip
  type    = "A"
  ttl     = 60
}
